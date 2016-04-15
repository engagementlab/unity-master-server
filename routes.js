'use strict';

var clients = require('./service/clients');
var rooms = require('./service/rooms');
var messages = require('./service/messages');

function broadcastRoomListUpdated(app, socket) {
	rooms.requestRoomList(app, function(list) {
		socket.broadcast.emit('roomListUpdated', list);
	});
}

exports = module.exports = function (app, io) {

	// -- Express routes

	app.get('/reset', rooms.reset);
	app.get('/printRooms', rooms.printRooms);

	// -- Socket IO

	io.on('connection', function(socket){

		// Clear the database
		socket.on('socketReset', function(cb) {
			rooms.socketReset(app, cb);
		});

		// Register a new client
		socket.on('register', function(name, cb) {
			clients.register(app, name, cb);
		});

		// Unregister a client
		socket.on('unregister', function(clientId, cb) {
			clients.unregister(app, clientId, cb);
		});

		// Create a room with the client as the host
		socket.on('createRoom', function(obj, cb) {
			rooms.create(app, obj.clientId, obj.maxClientCount, function(result) {

				if (result.nameTaken)
					return cb(result);

				socket.join(result.room._id);

				cb(result);
				broadcastRoomListUpdated(app, socket);
			});
		});

		// Get the rooms available for joining
		socket.on('requestRoomList', function(cb) {
			rooms.requestRoomList(app, cb);
		});

		// Join a room
		socket.on('joinRoom', function(obj, cb) {
			rooms.join(app, obj.clientId, obj.roomId, function(result) {

				if (result.nameTaken)
					return cb(result);

				socket.join(result.room._id);

				var clients = result.room.clients;
				clients.push(result.client);

				cb(result);
				socket.broadcast.to(result.room._id).emit('updateClients', { clients: clients });
				broadcastRoomListUpdated(app, socket);
			});
		});

		// Leave a room. If hosting, removes the room and any clients in it
		socket.on('leaveRoom', function(obj, cb) {

			rooms.leave(app, obj.clientId, obj.roomId, function(result) {
				
				socket.leave(result.room._id);

				if (result.hostLeft) {
					socket.broadcast.to(result.room._id).emit('kick');
				} else {
					var clients = result.room.clients;
					clients.pull(result.client);
					socket.broadcast.to(result.room._id).emit('updateClients', { clients: clients });
				}

				broadcastRoomListUpdated(app, socket);
				cb();
			});
		});

		// Close a room so that no other clients can join (use this at the start of a game to prevent clients from joining a game that's in progress)
		socket.on('closeRoom', function(roomId) {
			rooms.close(app, roomId);
			broadcastRoomListUpdated(app, socket);
		});

		// Send a message to all clients
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

		/*socket.on('confirmReceipt', function(obj) {
			// messages.confirm(app, obj.clientId, obj.key);
		});*/

		socket.on('disconnect', function(socket) {
			// console.log('user disconnected');
		});
	});
};