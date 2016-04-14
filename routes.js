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

		socket.on('socketReset', function(cb) {
			rooms.socketReset(app, cb);
		});

		socket.on('register', function(name, cb) {
			clients.register(app, name, cb);
		});

		socket.on('unregister', function(clientId, cb) {
			clients.unregister(app, clientId, cb);
		});

		socket.on('createRoom', function(obj, cb) {
			rooms.create(app, obj.clientId, obj.maxClientCount, function(result) {

				if (result.nameTaken)
					return cb(result);

				socket.join(result.room._id);

				cb(result);
				broadcastRoomListUpdated(app, socket);
			});
		});

		socket.on('requestRoomList', function(cb) {
			rooms.requestRoomList(app, cb);
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
				broadcastRoomListUpdated(app, socket);
			});
		});

		socket.on('leaveRoom', function(obj, cb) {

			rooms.leave(app, obj.clientId, obj.roomId, function(result) {
				socket.leave(result.room._id);
				if (result.hostLeft) {
					for (var i = 0; i < result.room.clients.length; i++) {
						socket.broadcast.to(result.room._id).emit('leaveRoom', { 
							roomId: result.room._id, 
							clientId: result.room.clients[i]._id,
						});
					}
				} else {
					var clients = result.room.clients;
					clients.pull(result.client);
					socket.broadcast.to(result.room._id).emit('updateClients', { clients: clients });
				}
				broadcastRoomListUpdated(app, socket);
				cb();
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

		/*socket.on('confirmReceipt', function(obj) {
			// messages.confirm(app, obj.clientId, obj.key);
		});*/

		socket.on('disconnect', function(socket) {
			// console.log('user disconnected');
		});
	});
};