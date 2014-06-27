var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Students = new Schema({
  name: String,
  payments: [{payment: String, total: Number, paid: Number, date: Date}],
  grade: String,
  debt: {type: Number, default: 0},
  paid: {tupe: Number, default:0},
  stats: String
});

module.exports = mongoose.model('Students', Students);

var Classes = new Schema({
  name: String,
  teacher: String,
  students: [{name: String}]
});

module.exports = mongoose.model('Classes', Classes);

var Payments = new Schema({
  name: {type: String, unique: true},
  amount: {type: Number, default:0},
  ptype: {type: String, default: "Ingreso"},
  date: String,
  missing: [{name: String}]
});

module.exports = mongoose.model('Payments', Payments);

var Expenses = new Schema({
  name: String,
  amount: {type: Number, default: 0},
  date: String
});

module.exports = mongoose.model('Expenses', Expenses);
