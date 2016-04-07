'use strict';

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
		minClientCount: { type: Number, default: -1 },
		maxClientCount: { type: Number, default: -1 },
		messages: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Message',
			default: []
		}],
		timeCreated: { type: Date, default: Date.now }
	});

	roomSchema.methods.acceptingClients = function () {
		return this.maxClientCount == -1 || this.clients.length < this.maxClientCount;
	};

	roomSchema.methods.clientCount = function () {
		return this.clients.length + 1; // add 1 so that the host is included in the count
	}

	app.db.model('Room', roomSchema);
};
