'use strict';

var config = require('./config');
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var io = require('socket.io')(http, {
	transports: ['websocket'],
});

// setup server
var app = module.exports = express();
app.config = config;
app.server = http.createServer(app);

// setup mongoose
app.db = mongoose.createConnection(config.mongodb.uri);
app.db.on('error', console.error.bind(console, 'mongoose connection error: '));
app.db.once('open', function() {
	console.log('mongoose ready :)');
});

// configure data models
require('./models')(app, mongoose);

// settings
app.set('port', config.port);
app.set('json spaces', 2);

require('./routes')(app, io);

io.listen(app.server);

var clients = require('./service/clients');
var rooms = require('./service/rooms');

/*rooms.socketReset(app, function() {

	// Create host
	clients.register(app, 'hostname', function(host) {

		// Create room
		rooms.create(app, host._id, -1, function(createRoomResult) {
			// var room = result.room;
			
			// Create client
			clients.register(app, 'clientname', function(client) {

				// Request room list
				rooms.requestRoomList(app, function(roomList) {
					var firstRoom = roomList.rooms[0];

					// Join the first room in the list
					rooms.join(app, client._id, firstRoom.id, function(joinResult) {

						app.db.models.Room.findById(firstRoom.id, function(err, x) {

							console.log("initial join: " + x.clients);

							// Leave the room
							rooms.leave(app, client._id, firstRoom.id, function(leaveResult) {

								app.db.models.Room.findById(firstRoom.id, function(err, x2) {

									console.log("leave: " + x2.clients);

									// Rejoin
									rooms.join(app, client._id, firstRoom.id, function(joinResult2) {
										app.db.models.Room.findById(firstRoom.id, function(err, x3) {
											console.log("rejoin: " + x3.clients);
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
});*/

app.server.listen(app.config.port, function() {
	console.log("App listening on port " + app.config.port);
});

