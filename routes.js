'use strict';

var hosts = require('./service/hosts');
var rooms = require('./service/rooms');
var messages = require('./service/messages');

exports = module.exports = function (app) {

	// -- Rooms
	app.get('/registerHost/:name/:address/:minClientCount/:maxClientCount', rooms.registerHost);
	app.get('/unregisterHost/:roomId', rooms.unregisterHost);
	app.get('/registerClient/:roomId/:name/:address', rooms.registerClient);
	app.get('/unregisterClient/:roomId/:clientId', rooms.unregisterClient);
	app.get('/roomList', rooms.requestRoomList);
	app.get('/reset', rooms.reset);
	app.get('/printRooms', rooms.printRooms);

	// -- Messaging
	app.get('/sendMessage/:roomId/:clientId/:key/:str1/:str2/:val', messages.send);
	app.get('/receiveMessage/:roomId/:clientId', messages.receive);

	// deprecate
	app.get('/addHost/:hostName/:hostIp', hosts.addHost);
	app.get('/removeHost/:hostIp', hosts.removeHost);
	app.get('/hosts', hosts.getHosts);	
};