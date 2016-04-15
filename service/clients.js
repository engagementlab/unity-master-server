
var clients = {

	register: function (app, name, cb) {
		app.db.models.Client.create({ name: name }, function (err, client) {
			if (err)
				return console.log(err);
			cb(client);
		});
	},

	unregister: function (app, clientId, cb) {
		app.db.models.Client.findById(clientId).remove(cb);
	}
};

module.exports = clients;