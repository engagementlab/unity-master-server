'use strict';

var config = require('./config');
var express = require('express');
var http = require('http');

// setup server
var app = module.exports = express();
app.config = config;
app.server = http.createServer(app);

// settings
app.set('port', config.port);

require('./hosts')(app);

app.server.listen(app.config.port, function() {
	console.log("App listening on port " + app.config.port);
});