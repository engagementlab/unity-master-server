'use strict';

var async = require('async');

var rooms = {

	registerHost: function (req, res) {

		var outcome = {};
		var name = req.params.hostName;
		var address = req.params.hostAddress;

		// Get the Client model associated with the host (if one exists)
		var getClient = function (cb) {
			req.app.db.models.Client.findOne({ 'name': name, 'address': address }).exec(function(err, client) {
				if (err) {
					return cb(err, null);
				}
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
	}
};

module.exports = rooms;