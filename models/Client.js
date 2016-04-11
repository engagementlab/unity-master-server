'use strict';

var timeout = 3; // time in seconds a client can be unresponsive before being marked as unconnected

exports = module.exports = function (app, mongoose) {
	
	var clientSchema = new mongoose.Schema({
		name: String,
		address: String,
		lastUpdated: { type: Date, default: Date.now },
		events: [String]
	});

	clientSchema.methods.connected = function () {
		return this.lastUpdated > Date.now()-timeout*1000;
	};

	app.db.model('Client', clientSchema);
};