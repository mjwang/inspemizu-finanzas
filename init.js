var routes = require('./routes');
var config = require('./config');


module.exports = function init(app){

	config(app);

	routes(app);

	return app
};
