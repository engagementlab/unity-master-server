'use strict';

var _ = require('underscore');

exports = module.exports = function (app, mongoose) {

	var messageSchema = new mongoose.Schema({
		key: String,
		str1: String,
		str2: String,
		val: Number,
		confirmations: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Client',
			default: []
		}]
	});

	messageSchema.methods.confirmReceipt = function (clientId, clientCount, cb) {
		var that = this;
		this.update({ '$addToSet': { 'confirmations': clientId } }, function(err, n) {
			if (that.confirmations.length+1 >= clientCount) {
				that.remove(function() { cb(); });
			} else {
				cb();
			}
		});
	};

	messageSchema.methods.waitingForConfirmations = function (clients) {
		for (var i = 0; i < clients.length; i++) {
			if (!_.contains (this.confirmations, clients[i]))
				return true;
		}
		return false;
	};

	app.db.model('Message', messageSchema);
};