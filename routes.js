'use strict';

var hosts = require('./service/hosts');
var rooms = require('./service/rooms');

exports = module.exports = function (app) {

	app.get('/registerHost/:name/:address/:minClientCount/:maxClientCount', rooms.registerHost);
	app.get('/unregisterHost/:roomId', rooms.unregisterHost);
	app.get('/registerClient/:name/:address/:roomId', rooms.registerClient);
	app.get('/unregisterClient/:name/:roomId', rooms.unregisterClient);
	app.get('/roomList', rooms.requestRoomList);
	app.get('/reset', rooms.reset);
	app.get('/printRooms', rooms.printRooms);

	// deprecate
	app.get('/addHost/:hostName/:hostIp', hosts.addHost);
	app.get('/removeHost/:hostIp', hosts.removeHost);
	app.get('/hosts', hosts.getHosts);	
};