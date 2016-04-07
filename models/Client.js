'use strict';

var timeout = 2;

exports = module.exports = function (app, mongoose) {
	
	var clientSchema = new mongoose.Schema({
		name: String,
		address: String,
		lastUpdated: { type: Date, default: Date.now }
	});

	clientSchema.methods.connected = function () {
		return this.lastUpdated > Date.now()-timeout*1000;
	};

	app.db.model('Client', clientSchema);
};