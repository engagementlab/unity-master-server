'use strict';

var async = require('async');
var _ = require('underscore');

var handleError = function (res, err) {
	res.status(200).json({ result: 'error', details: err });
};

var lazyGetClient = function (req, cb) {

	var name = req.params.name;
	var address = req.params.address;

	req.app.db.models.Client.findOne({ 'name': name, 'address': address }).exec(function(err, client) {
		if (err) {
			return cb(err);
		}
		if (client === null) {
			req.app.db.models.Client.create({
				name: name,
				address: address
			}, function(err, client) {
				if (err) {
					return cb(err);
				}
				cb(client);
			});
		} else {
			cb(client);
		}
	});
};

var getRoomClients = function (req, cb) {
	req.app.db.models.Room.findById(req.params.roomId).populate('clients').exec(function(err, room) {
		if (err) {
			return handleError(res, err);
		}
		cb(room, room.clients);
	});
};

var rooms = {

	registerHost: function (req, res) {

		var outcome = {};

		// Get the client associated with the name and address
		var getClient = function (cb) {
			lazyGetClient(req, function(client) {
				outcome.client = client;
				cb(null, 'done');
			});
		};

		// Get the Room model associated with the host
		var getRoom = function (data, cb) {
			req.app.db.models.Room.findOne({ 'host': outcome.client }).exec(function(err, room) {
				if (err) {
					return cb(err, null);
				}
				outcome.room = room;
				cb(null, 'done');
			});
		};

		// If no Room was found, create a new one
		var createRoom = function (data, cb) {
			if (outcome.room === null) {
				req.app.db.models.Room.create({
					host: outcome.client,
					minClientCount: req.params.minClientCount,
					maxClientCount: req.params.maxClientCount
				}, function(err, room) {
					if (err) {
						return cb(err, null);
					}
					outcome.room = room;
					cb(null, 'done');
				});
			} else {
				cb(null, 'done');
			}
		};

		var asyncFinally = function (err, result) {
			if (err) {
				console.log(err);
				return next(err);
			}
			res.status(200).json(outcome.room);
		};

		async.waterfall([getClient, getRoom, createRoom], asyncFinally);
	},

	unregisterHost: function (req, res) {

		// Removes the room with the given id
		req.app.db.models.Room.findByIdAndRemove(req.params.roomId, function(err) {
			if (err) {
				return handleError(res, err);
			}
			res.status(200).json({ result: 'success' });
		});
	},

	requestRoomList: function (req, res) {

		// Returns a list of all available rooms. List includes room ids and host data
		req.app.db.models.Room.find({}).populate('host').exec(function(err, rooms) {
			if (err) {
				return handleError(res, err);
			}
			res.status(200).json(_.map(_.filter(rooms, 
				function (x) { return x.acceptingClients(); }), 
			function(x) { return { roomId: x._id, host: x.host }; }));
		});
	},

	registerClient: function (req, res) {

		var outcome = {};
		outcome.nameTaken = false;

		var getClient = function (cb) {
			lazyGetClient(req, function(client) {
				outcome.client = client;
				cb(null, 'done');
			});
		};

		var checkClientNameUnique = function (data, cb) {
			getRoomClients(req, function(room, clients) {
				if (_.find(clients, function(x) { return x.name == req.params.name; }) !== undefined) {
					outcome.nameTaken = true;
					cb(null, 'done');
				} else {
					cb(null, 'done');
				}
			});
		}

		var addClientToRoom = function (data, cb) {
			if (!outcome.nameTaken) {
				req.app.db.models.Room.findByIdAndUpdate(req.params.roomId, { '$addToSet': { 'clients': outcome.client._id } }, function(err, room) {
					if (err) {
						return handleError(res, err);
					}
					outcome.room = room;
					cb(null, 'done');
				});
			} else {
				cb(null, 'done');
			}
		};

		var asyncFinally = function (err, result) {
			if (err) {
				console.log(err);
				return next(err);
			}
			res.status(200).json(outcome);
		};

		async.waterfall([getClient, checkClientNameUnique, addClientToRoom], asyncFinally);
	},

	unregisterClient: function (req, res) {
		
		// I'm sure this could be done in a more mongoosey way, but for now...
		getRoomClients(req, function(room, clients) {
			var clientId = _.find(room.clients, function (x) { return x.name === req.params.name })._id;
			room.update({ '$pull': { 'clients': clientId } }, function(err, n) {
				if (err)
					return handleError(res, err);
				res.status(200).json({ result: 'success' });
			});
		});
	},

	reset: function (req, res) {
		req.app.db.models.Room.remove({}, function(err) {
			if (err) return err;
			req.app.db.models.Client.remove({}, function(err) {
				if (err) return err;
				res.status(200).json({ result: "reset" });
			});
		});
	},

	printRooms: function (req, res) {
		req.app.db.models.Room.find({}).populate('host clients').exec(function (err, rooms) {
			res.status(200).json(rooms);
		});
	}
};

module.exports = rooms;