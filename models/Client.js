'use strict';

var timeout = 3; // time in seconds a client can be unresponsive before being marked as unconnected

exports = module.exports = function (app, mongoose) {
	
	var clientSchema = new mongoose.Schema({
		name: String
	});

	app.db.model('Client', clientSchema);
};