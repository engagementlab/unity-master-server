'use strict';

var hosts = require('./service/hosts');
var rooms = require('./service/rooms');

exports = module.exports = function (app) {

	app.get('/registerHost/:name/:address', rooms.registerHost);

	// deprecate
	app.get('/addHost/:hostName/:hostIp', hosts.addHost);
	app.get('/removeHost/:hostIp', hosts.removeHost);
	app.get('/hosts', hosts.getHosts);	
};