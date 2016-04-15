'use strict';

var _ = require('underscore');

exports = module.exports = function (app, mongoose) {

	var roomSchema = new mongoose.Schema({
		host: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Client'
		},
		clients: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Client'
		}],
		maxClientCount: { type: Number, default: -1 },
		messages: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Message'
		}],
		open: { type: Boolean, default: true },
		timeCreated: { type: Date, default: Date.now },
	});

	roomSchema.methods.acceptingClients = function () {
		return this.open && this.maxClientCount == -1 || this.clients.length+1 < this.maxClientCount;
	};

	roomSchema.statics.roomsHaveName = function (name, cb) {
		app.db.models.Room.find({}).populate('host').exec(function(err, rooms) {
			var openRooms = _.filter(rooms, function (x) { return x.acceptingClients(); });
			cb(_.find(openRooms, function (x) { return x.host.name == name; }) != null);
		});
	};

	roomSchema.methods.hasName = function (name, cb) {
		app.db.models.Room.findById(this._id).populate('host clients').exec(function(err, room) {
			if (room.host.name == name)
				return cb(true);
			cb(_.find(room.clients, function (x) { return x.name == name; }) != null);
		});
	};

	app.db.model('Room', roomSchema);
};
