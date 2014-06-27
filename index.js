var express = require('express');
var init = require('./init');
var app = express();

module.exports = init(app);

var port = process.env.PORT || 3000;

var server = app.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
});
