
var clients = {

	register: function (app, name, cb) {
		app.db.models.Client.create({ name: name }, function (err, client) {
			if (err)
				return console.log(err);
			cb({ id: client._id });
		});
	}
};

module.exports = clients;