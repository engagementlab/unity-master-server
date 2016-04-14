'use strict';

var messages = {

	// -- SOCKET IO

	/*send: function(app, msg, clientId) {
		app.db.models.Message.create({
			key: msg.key,
			str1: msg.str1,
			str2: msg.str2,
			val: msg.val,
			obj: msg.json
		}, function(err, message) {
			
		});
	},

	confirm: function(app, clientId, key) {
		app.db.models.Client.findById(clientId, function(err, client) {
			console.log(client.name + ": " + key);
		});
	},*/
};

module.exports = messages;