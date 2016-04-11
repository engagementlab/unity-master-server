'use strict';

var async = require('async');
var _ = require('underscore');

var handleError = function (res, err) {
	console.log("error: " + err);
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

		if (room == undefined) 
			return cb(undefined, undefined);

		if (err)
			return handleError(res, err);

		cb(room, room.clients);
	});
};

var getRoomClientsAndHost = function (req, cb) {

	req.app.db.models.Room.findById(req.params.roomId).populate('clients host').exec(function(err, room) {

		if (room == undefined) 
			return cb(undefined, undefined);

		if (err)
			return handleError(res, err);

		var clients = room.clients;
		clients.push(room.host);
		cb(room, clients);
	});
};

var rooms = {

	// Creates a Client model for the host and creates a new Room with the host
	registerHost: function (req, res) {

		var outcome = {};
		var client = {};

		// Get the client associated with the name and address
		var getClient = function (cb) {
			lazyGetClient(req, function(c) {
				client = c;
				cb(null, 'done');
			});
		};

		// Get the Room model associated with the host
		// If one exists, mark it as taken (can't have two hosts with the same name)
		var getRoom = function (data, cb) {
			// TODO: only query available rooms
			req.app.db.models.Room.findOne({ 'host': client }).exec(function(err, room) {

				if (err) 
					return cb(err, null);

				if (room != null)
					outcome = { error: "name_taken" };

				cb(null, 'done');
			});
		};

		// If no Room was found, create a new one
		var createRoom = function (data, cb) {
			if (_.isEmpty(outcome)) {
				req.app.db.models.Room.create({
					host: client,
					maxClientCount: req.params.maxClientCount
				}, function(err, room) {
					if (err) {
						return cb(err, null);
					}
					outcome = room;
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

		async.waterfall([getClient, getRoom, createRoom], asyncFinally);
	},

	// Removes the room
	unregisterHost: function (req, res) {

		// Removes the room with the given id
		req.app.db.models.Room.findByIdAndRemove(req.params.roomId, function(err) {
			if (err) {
				return handleError(res, err);
			}
			res.status(200).json({ result: 'success' });
		});
	},

	// Gets a list of rooms that can be joined
	requestRoomList: function (req, res) {

		// Returns a list of all available rooms. List includes room ids and host data
		req.app.db.models.Room.find({}).populate('host').exec(function(err, rooms) {
			if (err) {
				return handleError(res, err);
			}
			var outcome = {};
			var availableRooms = _.filter(rooms, function (x) { return x.open && x.acceptingClients(); })
			outcome.rooms = _.map(availableRooms, function(x) { return { roomId: x._id, host: x.host.name }; });
			res.status(200).json(outcome);
		});
	},

	// Registers a client to the room, being sure that there aren't multiple clients with the same name
	registerClient: function (req, res) {

		var outcome = {};

		var getClient = function (cb) {
			lazyGetClient(req, function(client) {
				outcome.client = client;
				cb(null, 'done');
			});
		};

		var checkClientNameUnique = function (data, cb) {
			getRoomClientsAndHost(req, function(room, clients) {

				if (room == undefined || clients == undefined) {
					outcome.error = 'no_room';
					return cb(null, 'done');
				}

				if (_.find(clients, function(x) { return x.name == req.params.name; }) !== undefined) {
					outcome.error = 'name_taken';
					cb(null, 'done');
				} else {
					cb(null, 'done');
				}
			});
		}

		var addClientToRoom = function (data, cb) {
			if (outcome.error == undefined) {
				req.app.db.models.Room.findByIdAndUpdate(req.params.roomId, { '$addToSet': { 'clients': outcome.client._id } }, function(err, room) {
					if (err) {
						return handleError(res, err);
					}

					outcome.room = room;

					// Populate new client
					req.app.db.models.Room.findById(req.params.roomId).populate('clients host messages').exec(function(err, room) {
						if (err)
							return handleError(res, err);
						outcome.room = room;
						cb(null, 'done');
					});
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

		async.waterfall([getClient, checkClientNameUnique, addClientToRoom], asyncFinally);
	},

	// Removes a client from the room
	unregisterClient: function (req, res) {
		
		getRoomClients(req, function(room, clients) {

			// If the room no longer exists, then consider the client removed
			if (room == undefined || clients == undefined)
				return res.status(200).json({ result: 'success' });

			room.update({ '$pull': { 'clients': req.params.clientId } }, function(err, n) {
				if (err)
					return handleError(res, err);
				res.status(200).json({ result: 'success' });
			});
		});
	},

	getRoom: function (req, res) {
		req.app.db.models.Room.findById(req.params.roomId).populate('clients host messages').exec(function(err, room) {
			if (err)
				return handleError(err);
			res.status(200).json(room);
		});
	},

	// Closes the room so that no other clients can join
	close: function (req, res) {
		req.app.db.models.Room.findById(req.params.roomId, function(err, room) {
			if (err)
				return handleError(err);
			room.update({ '$set': { 'open': false } }, function(err, n) {
				res.status(200).json({ result: 'success' });
			});
		});
	},

	// Closes rooms whose host has disconnected without unregistering
	closeDisconnectedRooms: function (req, res) {
		// todo
		/*req.app.db.models.Room.remove({ 'open': false, 'host.name': 'greta' }).populate('host').exec(function(err, result) {
			if (err)
				return handleError(err);
			res.status(200).json(result);
		});*/
	},	

	reset: function (req, res) {
		// todo: async 
		req.app.db.models.Room.remove({}, function(err) {
			if (err) return err;
			req.app.db.models.Client.remove({}, function(err) {
				if (err) return err;
				req.app.db.models.Message.remove({}, function(err) {
					if (err) return err;
					res.status(200).json({ result: "success" });
				});
			});
		});
	},

	printRooms: function (req, res) {
		req.app.db.models.Room.find({}).populate('host clients messages').exec(function (err, rooms) {
			res.status(200).json(rooms);
		});
	}
};

module.exports = rooms;