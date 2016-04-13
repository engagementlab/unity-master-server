'use strict';

var async = require('async');
var _ = require('underscore');
var mongoose = require('mongoose');

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

	// SOCKET IO

	create: function (app, clientId, cb) {

		var outcome = {};

		var getClient = function(cb) {
			app.db.models.Client.findById(clientId, function(err, client) {
				outcome.client = client;
				cb(null, 'done');
			});
		};

		var checkIfNameAvailable = function (data, cb) {
			app.db.models.Room.roomsHaveName(outcome.client.name, function(result) {
				outcome.nameTaken = result;
				cb(null, 'done');
			});
		};

		var createRoom = function (data, cb) {

			if (outcome.nameTaken)
				return cb(null, 'done');

			app.db.models.Room.findOneAndUpdate({ _id: mongoose.Types.ObjectId() }, { host: clientId }, {
				new: true,
				upsert: true,
				runValidators: true,
				setDefaultsOnInsert: true,
				populate: 'host'
			}, function(err, room) {
				if (err)
					return console.log(err);
				outcome.room = room;
				cb(null, 'done');
			});
		};

		var asyncFinally = function (err, result) {
			if (err) {
				console.log(err);
				return next(err);
			}
			cb(outcome);
		};

		async.waterfall([getClient, checkIfNameAvailable, createRoom], asyncFinally);
	},

	requestRoomList2: function (app, cb) {

		// Returns a list of all available rooms. List includes room ids and host data
		app.db.models.Room.find({}).populate('host').exec(function(err, rooms) {

			if (err)
				return console.log(err);

			var availableRooms = _.filter(rooms, function (x) { 
				return x.acceptingClients(); 
			});

			var roomLookup = _.map(availableRooms, function (x) { 
				return { id: x._id, host: x.host.name }; 
			});
			
			cb({ rooms: roomLookup });
		});
	},

	join: function (app, clientId, roomId, cb) {

		var outcome = {};

		var findRoom = function (cb) {

			app.db.models.Room.findById(roomId).populate('host clients').exec(function(err, room) {
				outcome.room = room;
				console.log(room.clients);
				cb(null, 'done');
			});
		};

		var findClient = function (data, cb) {
			app.db.models.Client.findById(clientId, function(err, client) {
				outcome.client = client;
				cb(null, 'done');
			});
		};

		var checkClientNameUnique = function (data, cb) {
			outcome.room.hasName(outcome.client.name, function(result) {
				outcome.nameTaken = result;
				cb(null, 'done');
			});
		};

		var joinRoom = function (data, cb) {

			if (outcome.nameTaken)
				return cb(null, 'done');

			outcome.room.update({ '$addToSet': { 'clients': outcome.client._id } }, function(err, n) {
				if (err)
					return console.log(err);
				cb(null, 'done');
			});
		};

		var asyncFinally = function (err, result) {
			if (err) {
				console.log(err);
				return next(err);
			}
			cb(outcome);
		};

		async.waterfall([findRoom, findClient, checkClientNameUnique, joinRoom], asyncFinally);
	},

	leave: function (app, clientId, roomId, cb) {

		var outcome = {};

		var findRoom = function (cb) {
			app.db.models.Room.findById(roomId).populate('host clients').exec(function(err, room) {
				console.log(roomId);
				outcome.room = room;
				cb(null, 'done');
			});
		};

		var findClient = function (data, cb) {
			app.db.models.Client.findById(clientId, function(err, client) {
				outcome.client = client;
				cb(null, 'done');
			});
		};

		var leaveRoom = function (data, cb) {

			var clientId = outcome.client._id;

			// todo: handle host leaving
			if (outcome.room.host._id == clientId) {
				outcome.room.update({ '$set': { 'host': null } }, function(err, n) {
					if (err)
						console.log(err);
					outcome.hostLeft = true;
					return cb(null, 'done');
				});
			}

			app.db.models.Room.findOneAndUpdate({ _id: outcome.room._id }, { '$pull': { 'clients': clientId } }, { new: true }, function(err, doc) {
				if (err)
					console.log(err);
				console.log(doc);
				outcome.hostLeft = false;
				cb(null, 'done');
			});
		};

		var asyncFinally = function (err, result) {
			if (err) {
				console.log(err);
				return next(err);
			}
			cb(outcome);
		};

		async.waterfall([findRoom, findClient, leaveRoom], asyncFinally);
	},

	// EXPRESS ROUTES

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
			// var availableRooms = _.filter(rooms, function (x) { return x.open && x.acceptingClients(); })
			var availableRooms = _.filter(rooms, function (x) { return x.acceptingClients(); });
			outcome.rooms = _.map(availableRooms, function (x) { return { roomId: x._id, host: x.host.name }; });
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