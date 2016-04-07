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
		timeCreated: { type: Date, default: Date.now }
	});
	app.db.model('Room', roomSchema);
};