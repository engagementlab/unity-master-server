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

app.server.listen(app.config.port, function() {
	console.log("App listening on port " + app.config.port);
});

