require('./schema.js');
var Students = require('mongoose').model('Students');
var Classes = require('mongoose').model('Classes');
var Payments = require('mongoose').model('Payments');
var Expenses = require('mongoose').model('Expenses');

module.exports = function routes(app){
	
	app.get('/', function(req, res){
		res.render('index');
	});

	app.route('/login')
		.get(function(req, res, next){
			var error = req.flash('error');
			res.render('index', {message: error});
		})
		.post(function(req, res, next){
			var pw = req.body.password;
			console.log(pw);
			if (pw === 'malambo'){
				req.session.user_id = 111111;
				res.redirect('/summary');
			} else {
				req.flash('error', 'Wrong Password');
				res.redirect('/login');
			}

		})

	app.get('/logout', function(req, res){
		delete req.session.user_id;
		res.redirect('/');
	});

	app.get('/home', checkAuth, allStudents, allClasses, allPayments, function(req, res){
		var error = req.flash('error');
		res.render('home', {students: req.students, classes: req.classes, payments: req.payments, message: error});		
	});

	app.get('/payments', checkAuth, allPayments, function(req, res){
		res.render('payments', {payments: req.payments});
	});

	app.get('/expenses', checkAuth, allExpenses, function(req, res){
		res.render('expenses', {expenses: req.expenses});
	});

	app.get('/summary', checkAuth, allPayments, allStudents, allExpenses, calculateDebt, calculateIncome, function(req, res){
		var profit = parseInt(req.school_income,10) - parseInt(req.school_debt, 10); 
		
		res.render('summary', {monthly_debt: req.monthly_debt, monthly_income: req.monthly_income, school_debt: req.school_debt, school_income: req.school_income, school_profit: profit});
	});

	app.get('/classes', checkAuth, allClasses, function(req, res){
		res.render('classes', {classes: req.classes});
	});

	app.post('/filter_students', checkAuth, allStudents, allClasses, allPayments, function(req, res){
		var class_filter = req.body.curso;
		
		if (class_filter === "Todos"){
			res.redirect('home');
		} else {
			console.log(class_filter);
			Students.find({grade: class_filter}, function(err, class_students){
				var error = req.flash('error');
				res.render('home', {students: class_students, classes: req.classes, payments: req.payments, message: error});	
			});
		}
	});

	app.route('/add_student')
		.get(checkAuth, allClasses, function(req, res, next){
			res.render('add_student', {classes: req.classes});	
		})
		.post(checkAuth, allPayments, initPayments, function(req, res, next){
			var name = req.body.student_name;
			var curso = req.body.student_class;
			
			console.log("Saving Student: ", name);
			console.log("Class: ", curso);
			
			var new_student = new Students({name: name, 
							grade: curso, 
							payments: req.student_payments, 
							paid: 0, 
							debt: req.total_due, 
							stats: "enrolled"});
			console.log("Created New Student: ", new_student);

			Classes.update({grade: curso}, {$push: {"students":name}}, function(err, success){
				if (err) {
					console.log(err);
				}
			});
				
			new_student.save(function(err, saved_student){
				if (!err) {
					console.log('SAVED!');
					res.redirect('/view_student/' + saved_student.id);
				} else {
					console.log(err);
					req.flash('error', 'Unable to Add Student');
					res.redirect('/home');
				}
			});
				
		})

	app.route('/add_class')
		.get(checkAuth, function(req, res, next){
			res.render('add_class');
		})
		.post(checkAuth, function(req, res, next){
			var class_name = req.body.class_name;

			var new_class = new Classes({name: class_name, students: []});

			new_class.save(function(err, saved_class){
				if (err) {
					console.log(err)
				} else {
					res.redirect('/classes');
				}
			});
			
		})

	app.route('/add_expense')
		.get(checkAuth, function(req, res){
			res.render('add_expense');
		})
		.post(checkAuth, function(req, res, next){
			var expense_name =req.body.expense_name;
			var amount = req.body.amount;
			var expense_date = req.body.expense_date;
			var new_expense = new Expenses({name: expense_name, amount: amount, date: expense_date });

			new_expense.save(function(err, saved_expense){
				if (err) {
					console.log(err);
				} else {
					res.redirect('/expenses');
				}
			});
		})

	app.route('/add_payment')
		.get(checkAuth, function(req, res, next){
			res.render('add_payment');
		})
		.post(checkAuth, allStudents, function(req, res, next){
			var name = req.body.payment_name;
			var amount = req.body.amount;
			var checkbox = req.body.payment_type;
			var ptype = "Ingreso"; 
			var payment_date = req.body.payment_date;
			console.log("Payment Type: ", ptype);
			var missing = [];			

			if (checkbox === "on") {
				ptype = "Estudiantes";
				for (k=0;k<req.students.length;k++) {
					missing.push({'name': req.students[k].name});	
				}
			}

			var new_payment = new Payments({name: name, amount: amount, ptype: ptype, missing: missing, date: payment_date});
	
			new_payment.save(function(err, saved_payment){
				if(err){
					console.log(err);
					req.flash('error', "Couldn't create payment");
				}
				if (checkbox === "on") {
                                	for (i=0; i< req.students.length; i++) {
						Students.findByIdAndUpdate(req.students[i].id,
								 	{$push: {"payments":{payment:name, total: amount, paid:0, date: saved_payment.date }}},
								 	function(err, payment){
										if (err){
											console.log(err)
										} 
									});
						var new_debt = parseInt(req.students[i].debt, 10) + parseInt(amount, 10);
						Students.findByIdAndUpdate(req.students[i].id, {debt: new_debt}, function(err, debt){
							if (err){
								console.log(err);
							}
						});
					}
				}
				res.redirect('/payments');
			});
		})

	app.param('sid', function(req, res, next, sid){
		Students.findOne({'_id':sid}, function(err, student){
			if (!err) {
				req.student = student;
				req.student_id = student.id;
				req.name = student.name;
				req.curso = student.grade;
				req.payments = student.payments;
				req.paid = student.paid;
				req.debt = student.debt;
				next();
			} else {
				console.log(err);
			}
		});
	});

	app.param('pid', function(req, res, next, pid){
		Students.findOne({'payments._id':pid}, function(err, student){
			if (!err) {
				for(i=0;i<student.payments.length;i++) {
					if (student.payments[i].id === pid){
						req.payment = student.payments[i];
					 	next();
					}
				}
			} else {
				console.log(err);
			}
		});
	});

	app.post('/delete_payment', checkAuth, allStudents, function(req, res){
		var payment_id = req.body.pid;

		Payments.findOne({'_id': payment_id}, function(err, payment){
			if (!err) {
				if (payment.ptype === "Estudiantes"){
					for(i=0;i<req.students.length;i++){
						var sid = req.students[i].id;
						Students.findByIdAndUpdate(sid,{'$pull': {'payments':{'payment': payment.name, 'total': payment.amount, 'date': payment.date}}}, function(err, pulled_data){
							if (err) {
								console.log(err);
							} else {
								Students.findOne(sid, function(err, student){
                                                                        var new_debt = 0;
									var new_paid = 0; 
									for (i=0;i<student.payments.length;i++){
											
									}
								});		
							}
						});
					}
				} else {
					payment.remove();	
					res.redirect('/payments');
				}
			} else {
				console.log(err);
			}		
		});
	});

	app.post('/delete_expense', checkAuth, function(req, res){
		var expense_id = req.body.eid;
		console.log(expense_id);
		Expenses.findOne({'_id': expense_id}, function(err, expense){
			if (!err){
				console.log("Successfully found expense: ", expense);
				expense.remove();
				res.redirect('/expenses');
			} else {
				console.log(err);
			}
		});

	});

        app.get('/view_student/:sid', checkAuth, function(req, res){
		var error = req.flash('error')
		res.render('view_student', {student: req.student, message: error});
	})

	app.route('/pay/:sid/:pid')
		.get(checkAuth, function(req, res){
			res.render('pay', {payment: req.payment, student: req.student});
		})
		.post(checkAuth, function(req, res){
			var payment_amount = parseInt(req.body.payment_amount, 10);
			
			var new_paid_total = parseInt(req.paid,10) + payment_amount;
			var new_debt = parseInt(req.debt,10) - payment_amount;
		        var new_paid_local = parseInt(req.payment.paid,10) + payment_amount;	

			console.log("Total Required Payment: ",req.payment.total);
			if (new_paid_local === parseInt(req.payment.total,10)) {
				console.log("Deleting student from missing list");
				console.log(req.payment.payment);
				console.log(req.name);
				Payments.findOne({"name": req.payment.payment}, function(err, p){
					if (!err) {
						Payments.findByIdAndUpdate(p.id, {'$pull': {'missing': {'name': req.name } }} ,function(err, paymentobj){
							if (err){
								console.log(err);
							} else {
								console.log(paymentobj);		
							}
						});	
					} else {
						console.log(err)
						req.flash('error', "Couldn't Remove Student");
					}
				});
			}
			Students.findByIdAndUpdate(req.student_id, {debt: new_debt, paid: new_paid_total}, function(err){
				if (err){
					console.log(err);
				}
			}); 
			Students.update({'payments._id': req.payment.id}, {'$set': {'payments.$.paid': new_paid_local}}, function(err){
				if (err){
					console.log(err);
 				} else {
					res.redirect('/view_student/' + req.student_id);
				}
			});

			 
		})

	function calculateDebt(req, res, next){
		//Amount owed by students
                var monthly_debt = {};
		var debt = 0;
		console.log("Calculating Debt");
		for(i=0; i< req.students.length; i++){
			debt += parseInt(req.students[i].debt, 10);	
		}
		for (k=0; k < req.payments.length; k++){
			var num_missing = req.payments[k].missing.length;
                        var smonth_debt = parseInt(req.payments[k].amount,10) * num_missing;
			if (!(req.payments[k].date in monthly_debt)){
				monthly_debt[req.payments[k].date] = 0;
			}
			monthly_debt[req.payments[k].date] += parseInt(smonth_debt);
		}
		for (j=0; j < req.expenses.length; j++){
			if (!(req.expenses[j].date in monthly_debt)){
				monthly_debt[req.expenses[j].date] = 0;
			}
                        monthly_debt[req.expenses[j].date] += parseInt(req.expenses[j].amount,10);
			debt += parseInt(req.expenses[j].amount, 10);
		}
		req.school_debt = parseInt(debt,10);	
		req.monthly_debt = monthly_debt;
		console.log(monthly_debt);
		next();
	}

	function calculateIncome(req, res, next){
		var monthly_income = {};
		var income = 0;
		console.log("Calculating Income");
		for(i=0; i<req.students.length; i++){
			income += parseInt(req.students[i].paid, 10);
		}
		for(k=0; k < req.expenses.length; k++){
			if(!(req.expenses[k].date in monthly_income)){
				monthly_income[req.expenses[k].date] = 0;
			}
		}
		for(j=0; j<req.payments.length; j++){
			if (!(req.payments[j].date in monthly_income)){
				monthly_income[req.payments[j].date] = 0;
			}
			if (req.payments[j].ptype === "Ingreso"){
                                monthly_income[req.payments[j].date] += parseInt(req.payments[j].amount,10)
				income += parseInt(req.payments[j].amount, 10);
			} else {
				var num_paid = req.students.length - req.payments[j].missing.length;
				var smonth_income = parseInt(req.payments[j].amount,10) * num_paid;
				monthly_income[req.payments[j].date] += parseInt(smonth_income, 10);
			}
		}
		req.school_income = parseInt(income,10);
		req.monthly_income = monthly_income;
		console.log(monthly_income);
		next();
	}

	function initPayments(req, res, next){
		var payment_array = [];
                var total = 0;

		for(i=0;i<req.payments.length;i++) {
			var payment_info = {payment: req.payments[i].name, total: req.payments[i].amount, paid: 0};
			payment_array.push(payment_info);
			total += req.payments[i].amount;
		}
	
		req.student_payments = payment_array;	
		req.total_due = total;
		next();
	}

	function allStudents(req, res, next) {
		Students.find(function(err, all_students){
			if (!err) {
				req.students = all_students;
			}
			next();
		});
	}

	function allClasses(req, res, next) {
		Classes.find(function(err, all_classes){
			if (!err) {
				req.classes= all_classes;
			}
			next();
		});	
	}

	function allPayments(req, res, next) {
		Payments.find(function(err, all_payments){
			if (!err){
				req.payments = all_payments;
			}
			next();
		});
	}

	function allExpenses(req, res, next) {
		Expenses.find(function(err, all_expenses){
			if (!err) {
				req.expenses = all_expenses;
			}
			next();
		});
	}

	function checkAuth(req, res, next) {
		if (!req.session.user_id){
			req.flash('error', 'Not Logged In');
			res.redirect('/login');
		} else {
			next();
		}
	}
	
}
