'use strict';

exports = module.exports = function (app, mongoose) {
	require('./models/Client')(app, mongoose);
	require('./models/Room')(app, mongoose);
};