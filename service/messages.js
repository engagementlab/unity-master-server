'use strict';

var async = require('async');
var _ = require('underscore');

var getClientInRoom = function (req, cb) {

	req.app.db.models.Room.findById(req.params.roomId).populate('host clients messages').exec(function(err, room) {
		
		if (err) {
			return handleError(res, err);
		}

		// Early exit if the room no longer exists
		if (room === null) {
			return cb(undefined, undefined);
		}

		// Find the client with the associated id (include the host in the search)
		var client;
		var clientId = req.params.clientId;
		if (room.host._id == clientId) {
			client = room.host;
		} else {
			client = _.find(room.clients, function(x) { return x._id == clientId; });
		}

		client.update({ 'lastUpdated': Date.now() }, function (err, n) {
			cb(room, client);
		});
	});
};

var receiveFirstMessage = function (room, client, cb) {

	var message = room.messages[0];
	var msg = {
		key: message.key,
		str1: message.str1,
		str2: message.str2,
		val: message.val
	};

	// Don't retrieve the message if this client has already received it
	if (_.find(message.confirmations, function(x) { return x == client._id.toString(); })) {
		cb({});
	} else {
		message.confirmReceipt(client._id, room.clientCount(), function(err, n) {
			if (err) {
				return cb({ result: err });
			}
			cb(msg);
		});
	}
};

var getConnectedClients = function (room) {
	var clients = _.filter(room.clients, function(x) { return x.connected(); });
	if (room.host.connected())
		clients.push(room.host);
	return clients;
};

var messages = {

	// Send a message for other clients to receive
	send: function(req, res) {
		
		getClientInRoom(req, function (room, client) {

			if (room === undefined || client === undefined)
				return res.status(200).json({ error: 'no_room' });

			// Create the messages
			req.app.db.models.Message.create({
				key: req.params.key,
				str1: req.params.str1,
				str2: req.params.str2,
				val: req.params.val
			}, function(err, message) {
				room.update({ '$addToSet': { 'messages': message._id } }, function(err, n) {
					res.status(200).json({});
				});
			});
		});
	},

	// Receive messages sent to the server
	receive: function(req, res) {

		getClientInRoom(req, function (room, client) {

			if (room === undefined || client === undefined)
				return res.status(200).json({ error: 'no_room' });

			if (room.messages.length === 0) {
				return res.status(200).json(getConnectedClients(room));
			}

			receiveFirstMessage(room, client, function(msg) {
				var response = {};
				response.message = msg;
				response.clients = getConnectedClients(room);
				res.status(200).json(response);
			});

		});
	}
};

module.exports = messages;