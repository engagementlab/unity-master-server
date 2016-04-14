'use strict';

var clients = require('./service/clients');
var rooms = require('./service/rooms');
var messages = require('./service/messages');

function broadcastRoomListUpdated(app, socket) {
	rooms.requestRoomList2(app, function(list) {
		socket.broadcast.emit('roomListUpdated', list);
	});
}

exports = module.exports = function (app, io) {

	app.get('/ping', function(req, res) { res.status(200).json({ result: "sucess" })});

	// -- Rooms
	/*app.get('/registerHost/:name/:address/:maxClientCount', rooms.registerHost);
	app.get('/unregisterHost/:roomId', rooms.unregisterHost);
	app.get('/registerClient/:roomId/:name/:address', rooms.registerClient);
	app.get('/unregisterClient/:roomId/:clientId', rooms.unregisterClient);
	app.get('/roomList', rooms.requestRoomList);
	app.get('/getRoom/:roomId', rooms.getRoom);
	app.get('/closeRoom/:roomId', rooms.close);
	app.get('/closeDisconnectedRooms', rooms.closeDisconnectedRooms);*/

	// -- Messaging
	// app.post('/sendMessage/:roomId/:clientId', messages.send);
	// app.get('/sendMessage/:roomId/:clientId/:key/:str1/:str2/:val', messages.send);
	// app.get('/receiveMessage/:roomId/:clientId', messages.receive);

	// -- Debugging
	app.get('/reset', rooms.reset);
	app.get('/printRooms', rooms.printRooms);

	io.on('connection', function(socket){

		socket.on('reset', function(cb) {
			rooms.reset(app, cb);
		});

		socket.on('register', function(name, cb) {
			clients.register(app, name, cb);
		});

		socket.on('createRoom', function(clientId, cb) {
			rooms.create(app, clientId, function(result) {

				if (result.nameTaken)
					return cb(result);

				socket.join(result.room._id);

				cb(result);
				broadcastRoomListUpdated(app, socket);
			});
		});

		socket.on('requestRoomList', function(cb) {
			rooms.requestRoomList2(app, cb);
		});

		socket.on('joinRoom', function(obj, cb) {
			rooms.join(app, obj.clientId, obj.roomId, function(result) {

				if (result.nameTaken)
					return cb(result);

				socket.join(result.room._id);

				var clients = result.room.clients;
				clients.push(result.client);

				cb(result);
				socket.broadcast.to(result.room._id).emit('updateClients', { clients: clients });
			});
		});

		socket.on('leaveRoom', function(obj) {

			rooms.leave(app, obj.clientId, obj.roomId, function(result) {
				socket.leave(result.room._id);
				if (result.hostLeft) {
					for (var i = 0; i < result.room.clients.length; i++) {
						socket.broadcast.to(result.room._id).emit('leaveRoom', { 
							roomId: result.room._id, 
							clientId: result.room.clients[i]._id,
						});
					}
					broadcastRoomListUpdated(app, socket);
				} else {
					var clients = result.room.clients;
					clients.pull(result.client);
					socket.broadcast.to(result.room._id).emit('updateClients', { clients: clients });
				}
			});
		});

		socket.on('closeRoom', function(roomId) {
			rooms.close(app, roomId);
			broadcastRoomListUpdated(app, socket);
		});

		socket.on('sendMessage', function(obj) {
			if (obj.key == "InstanceDataLoaded") {
				socket.broadcast.to(obj.roomId).emit('receiveMessage', {
					key: obj.key,
					str1: JSON.stringify(obj)
				});
			} else {
				socket.broadcast.to(obj.roomId).emit('receiveMessage', { 
					key: obj.key, 
					str1: obj.str1, 
					str2: obj.str2, 
					val: obj.val 
				});
			}
		});

		socket.on('confirmReceipt', function(obj) {
			console.log(obj.clientId + ": " + obj.key);
		});

		socket.on('disconnect', function(socket) {
			// console.log('user disconnected');
		});
	});
};