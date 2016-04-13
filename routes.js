'use strict';

var clients = require('./service/clients');
var rooms = require('./service/rooms');
var messages = require('./service/messages');

exports = module.exports = function (app, io) {

	app.get('/ping', function(req, res) { res.status(200).json({ result: "sucess" })});

	// -- Rooms
	app.get('/registerHost/:name/:address/:maxClientCount', rooms.registerHost);
	app.get('/unregisterHost/:roomId', rooms.unregisterHost);
	app.get('/registerClient/:roomId/:name/:address', rooms.registerClient);
	app.get('/unregisterClient/:roomId/:clientId', rooms.unregisterClient);
	app.get('/roomList', rooms.requestRoomList);
	app.get('/getRoom/:roomId', rooms.getRoom);
	app.get('/closeRoom/:roomId', rooms.close);
	app.get('/closeDisconnectedRooms', rooms.closeDisconnectedRooms);

	// -- Messaging
	// app.post('/sendMessage/:roomId/:clientId', messages.send);
	app.get('/sendMessage/:roomId/:clientId/:key/:str1/:str2/:val', messages.send);
	app.get('/receiveMessage/:roomId/:clientId', messages.receive);

	// -- Debugging
	app.get('/reset', rooms.reset);
	app.get('/printRooms', rooms.printRooms);

	io.on('connection', function(socket){

		socket.on('register', function(name, cb) {
			// cb({ name: name });
			clients.register(app, name, cb);
		});

		socket.on('createRoom', function(clientId, cb) {
			rooms.create(app, clientId, cb);
		});

		socket.on('requestRoomList', function(cb) {
			rooms.requestRoomList2(app, cb);
		});

		socket.on('joinRoom', function(obj, cb) {
			rooms.join(app, obj.clientId, obj.roomId, cb);
		});

		socket.on('disconnect', function(socket) {
			console.log('user disconnected');
		});
	});
};