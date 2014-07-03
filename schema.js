var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Students = new Schema({
  name: String,
  grade: String,
  enroll_date: String
});

module.exports = mongoose.model('Students', Students);

var Classes = new Schema({
  name: String,
});

module.exports = mongoose.model('Classes', Classes);

var Payments = new Schema({
  name: String,
  amount: {type: Number, default: 0},
  date: String,
  students: [{name: String, sid: String, paid: {type: Number, default:0}}] 
});

module.exports = mongoose.model('Payments', Payments);

var Expenses = new Schema({
  name: String,
  amount: {type: Number, default: 0},
  date: String
});

module.exports = mongoose.model('Expenses', Expenses);
