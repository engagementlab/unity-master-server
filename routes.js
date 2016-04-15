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

		// Create a room with the client as the host
		socket.on('createRoom', function(obj, cb) {

			// Register the client
			clients.register(app, obj.name, function(client) {

				// Create the room
				rooms.create(app, client._id, obj.maxClientCount, function(result) {

					if (result.nameTaken)
						return cb(result);

					socket.join(result.room._id);
					result.client = client;

					cb(result);
					broadcastRoomListUpdated(app, socket);
				});
			});
		});

		// Get the rooms available for joining
		socket.on('requestRoomList', function(cb) {
			rooms.requestRoomList(app, cb);
		});

		// Join a room
		socket.on('joinRoom', function(obj, cb) {

			// Register the client
			clients.register(app, obj.name, function(client) {

				// Join the room
				rooms.join(app, client._id, obj.roomId, function(result) {

					if (result.nameTaken)
						return cb(result);

					socket.join(result.room._id);

					var roomClients = result.room.clients;
					roomClients.push(result.client);

					result.client = client;

					cb(result);
					socket.broadcast.to(result.room._id).emit('updateClients', { clients: roomClients });
					broadcastRoomListUpdated(app, socket);
				});
			});
		});

		// Leave a room. If hosting, removes the room and any clients in it
		socket.on('leaveRoom', function(obj, cb) {

			if (obj.roomId == "") {

				// If the client was not in a room, just unregister
				clients.unregister(app, obj.clientId, cb);
			} else {

				// Leave the room
				rooms.leave(app, obj.clientId, obj.roomId, function(result) {
					
					socket.leave(result.room._id);

					if (result.hostLeft) {
						socket.broadcast.to(result.room._id).emit('kick');
					} else {
						var roomClients = result.room.clients;
						roomClients.pull(result.client);
						socket.broadcast.to(result.room._id).emit('updateClients', { clients: roomClients });
					}

					broadcastRoomListUpdated(app, socket);

					// Unregister the client
					clients.unregister(app, obj.clientId, cb);
				});
			}
		});

		// Close a room so that no other clients can join (use this at the start of a game to prevent clients from joining a game that's in progress)
		socket.on('closeRoom', function(roomId) {
			rooms.close(app, roomId);
			broadcastRoomListUpdated(app, socket);
		});

		// Send a message to all clients
		socket.on('sendMessage', function(obj) {
			
			var key = obj.key;
			var str1 = obj.str1 || JSON.stringify (obj);
			
			socket.broadcast.to(obj.roomId).emit('receiveMessage', { 
				key: key, 
				str1: str1, 
				str2: obj.str2, 
				val: obj.val 
			});
		});

		/*socket.on('confirmReceipt', function(obj) {
			// messages.confirm(app, obj.clientId, obj.key);
		});*/

		socket.on('disconnect', function(socket) {
			// console.log('user disconnected');
		});
	});
};