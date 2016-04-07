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
		timeCreated: { type: Date, default: Date.now }
	});

	roomSchema.methods.acceptingClients = function () {
		return this.maxClientCount == -1 || this.clients.length < this.maxClientCount;
	};
	
	app.db.model('Room', roomSchema);
};
