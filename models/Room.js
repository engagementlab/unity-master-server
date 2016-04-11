'use strict';

var _ = require('underscore');

exports = module.exports = function (app, mongoose) {

	var roomSchema = new mongoose.Schema({
		host: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Client'
		},
		clients: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Client',
			default: []
		}],
		maxClientCount: { type: Number, default: -1 },
		messages: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Message',
			default: []
		}],
		open: { type: Boolean, default: true },
		timeCreated: { type: Date, default: Date.now },
	});

	roomSchema.methods.acceptingClients = function () {
		return this.maxClientCount == -1 || this.clients.length < this.maxClientCount;
	};

	roomSchema.methods.clientCount = function () {
		return this.clients.length + 1; // add 1 so that the host is included in the count
	};

	roomSchema.methods.registerClient = function (client, cb) {
		// TODO: events when un/registering
	};

	roomSchema.methods.unregisterClient = function (client, cb) {
		// TODO: events when un/registering
	};

	roomSchema.methods.nextMessage = function () {
		for (var i = 0; i < this.messages.length; i++) {
			if (this.messages[i].waitingForConfirmations (this.clients))
				return this.messages[i];
		}
		return _.find(this.messages, function(x) { return x.confirmations.length == 0; });
	};

	app.db.model('Room', roomSchema);
};
