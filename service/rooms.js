'use strict';

var async = require('async');
var _ = require('underscore');

var rooms = {

	registerHost: function (req, res) {

		var outcome = {};
		var name = req.params.name;
		var address = req.params.address;

		// Get the Client model associated with the host (if one exists)
		var getClient = function (cb) {
			req.app.db.models.Client.findOne({ 'name': name, 'address': address }).exec(function(err, client) {
				if (err) {
					return cb(err, null);
				}
				console.log("FOUND: " + client);
				outcome.client = client;
				cb(null, 'done');
			});
		}

		// If no Client model was found, create a new one
		var createClient = function (data, cb) {
			if (outcome.client === null) {
				req.app.db.models.Client.create({
					name: name,
					address: address
				}, function(err, client) {
					if (err) {
						return cb(err, null);
					}
					console.log("CREATED: " + client);
					outcome.client = client;
					cb(null, 'done');
				});
			} else {
				cb(null, 'done');
			}
		}

		// Get the Room model associated with the host
		var getRoom = function (data, cb) {
			req.app.db.models.Room.findOne({ 'host': outcome.client }).exec(function(err, room) {
				if (err) {
					return cb(err, null);
				}
				outcome.room = room;
				cb(null, 'done');
			});
		}

		// If no Room was found, create a new one
		var createRoom = function (data, cb) {
			if (outcome.room === null) {
				req.app.db.models.Room.create({
					host: outcome.client
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
		}

		var asyncFinally = function (err, result) {
			if (err) {
				return next(err);
			}
			res.status(200).json(outcome);
		}

		async.waterfall([getClient, createClient, getRoom, createRoom], asyncFinally);
	},

	unregisterHost: function (req, res) {

		// Removes the room with the given id
		req.app.db.models.Room.findByIdAndRemove(req.params.id, function(err) {
			if (err) {
				res.status(200).json({ result: 'error', details: err });
			}
			res.status(200).json({ result: 'success' });
		});
	},

	requestRoomList: function (req, res) {

		// Returns a list of all the rooms. List includes room ids and host data
		req.app.db.models.Room.find({}).populate('host').exec(function(err, rooms) {
			if (err) {
				res.status(200).json({ result: 'error', details: err });
			}
			res.status(200).json(_.map(rooms, function(x) { return { roomId: x._id, host: x.host }; }));
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
	}
};

module.exports = rooms;