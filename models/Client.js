'use strict';

exports = module.exports = function (app, mongoose) {
	var clientSchema = new mongoose.Schema({
		name: String,
		address: String,
		timeCreated: { type: Date, default: Date.now }
	});
	app.db.model('Client', clientSchema);
};