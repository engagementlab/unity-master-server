'use strict';

var async = require('async');
var _ = require('underscore');
var mongoose = require('mongoose');

function clearDb(app, callback) {

	async.parallel({

		removeRooms: function(cb) {
			app.db.models.Room.remove({}, function(err) {
				if (err) return cb(err, null);
				cb(null, 'done');
			});
		},

		removeClients: function(cb) {
			app.db.models.Client.remove({}, function(err) {
				if (err) return cb(err, null);
				cb(null, 'done');
			});
		},

		removeMessages: function(cb) {
			app.db.models.Message.remove({}, function(err) {
				if (err) return cb(err, null);
				cb(null, 'done');
			});
		}
	},
	function(err, result) {
		callback();
	});
}

var rooms = {

	create: function (app, clientId, maxClientCount, cb) {

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

			app.db.models.Room.findOneAndUpdate({ 
				_id: mongoose.Types.ObjectId(),
				maxClientCount: maxClientCount
			}, { host: clientId }, {
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

	requestRoomList: function (app, cb) {

		// Returns a list of all available rooms. List includes room ids and host data
		app.db.models.Room.find({}).populate('host').exec(function(err, rooms) {

			if (err)
				return console.log(err);

			var availableRooms = _.filter(rooms, function (x) { 
				return x.acceptingClients() && x.host != null; 
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

			if (outcome.room == null)
				return cb(null, 'done');

			var clientId = outcome.client._id;
			var host = outcome.room.host;

			// If this client is the host, close the room
			if (host != null && _.isEqual(host._id, clientId)) {
				app.db.models.Room.findById(outcome.room._id).remove(function() {
					outcome.hostLeft = true;
					return cb(null, 'done');
				});
			}

			// If this client is not the host, remove them from the room
			app.db.models.Room.findOneAndUpdate({ _id: outcome.room._id }, { '$pull': { 'clients': clientId } }, { new: true }, function(err, doc) {
				if (err)
					console.log(err);
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

	close: function (app, roomId) {
		app.db.models.Room.findOneAndUpdate({ _id: roomId }, { 'open': false }, function(err, n) {
			if (err)
				console.log(err);
		});
	},

	checkDroppedClients: function (app, roomId, clientCount, cb) {
		app.db.models.Room.findById(roomId, function(err, room) {
			if (room.clients.length + 1 > clientCount)
				return cb(true);
			cb(false);
		});
	},

	socketReset: function (app, cb) {
		clearDb (app, cb);
	},

	reset: function (req, res) {
		clearDb(req.app, function() {
			res.status(200).json({ result: "success" });
		});
	},

	printRooms: function (req, res) {
		req.app.db.models.Room.find({}).populate('host clients messages').exec(function (err, rooms) {
			req.app.db.models.Client.find({}, function(err, clients) {
				var result = {};
				result.rooms = rooms;
				result.clients = clients;
				res.status(200).json(result);
			});
		});
	}
};

module.exports = rooms;