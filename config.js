var express = require('express');
var body_parser = require('body-parser');
var cookie_parser = require('cookie-parser');
var express_session = require('express-session');
var mongoose = require('mongoose');
var path = require('path');
var flash = require('connect-flash');


module.exports = function config(app){

  app.use("/css", express.static(__dirname + "/css"));
  app.use("/views", express.static(__dirname + "/views"));
  app.use("/scripts", express.static(__dirname + "/scripts"));

  app.use(body_parser());
  app.use(cookie_parser());
  app.use(express_session({secret: "gamedu sec"}));
  app.use(flash());

  app.set('views', path.join(__dirname + '/views'));
  app.set('view engine', 'jade');

  var mongostr = "mongodb://heroku_app26839263:lu49phehj78o2suj7tlfp5hrol@ds049997.mongolab.com:49997/heroku_app26839263"
  var localstr = "mongodb://localhost/test";

  mongoose.connect(mongostr);
  var db = mongoose.connection;

  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function(){
    console.log('Connected to mongodb');
  });
}

