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
		res.render('summary', {school_debt: req.school_debt, school_income: req.school_income, monthly_income: req.monthly_income, monthly_debt: req.monthly_debt, school_profit: profit});
	});

	app.get('/classes', checkAuth, allClasses, function(req, res){
		res.render('classes', {classes: req.classes});
	});

	app.post('/home', checkAuth, allStudents, allClasses, allPayments, function(req, res){
		var class_filter = req.body.curso;
		
		if (class_filter === "Todos"){
			res.redirect('home');
		} else {
			console.log(class_filter);
			Students.find({grade: class_filter}, function(err, class_students){
				var error = req.flash('error');
				res.render('home', {selected: class_filter, students: class_students, classes: req.classes, payments: req.payments, message: error});	
			});
		}
	});

	app.route('/add_student')
		.get(checkAuth, allClasses, function(req, res, next){
			res.render('add_student', {classes: req.classes});	
		})
		.post(checkAuth, function(req, res, next){
			var name = req.body.student_name;
			var curso = req.body.student_class;
			var date = req.body.enroll_date;
			
			var new_student = new Students({name: name, 
							grade: curso,  
							enroll_date: date});
			console.log("Created New Student: ", new_student);

				
			new_student.save(function(err, saved_student){
				if (!err) {
					
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

			var new_class = new Classes({name: class_name});

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

			var new_expense = new Expenses({name: expense_name, amount: amount});

			new_expense.save(function(err, saved_expense){
				if (err) {
					console.log(err);
				} else {
					res.redirect('/expenses');
				}
			});
		})

	app.route('/add_payment')
		.get(checkAuth, allClasses, function(req, res, next){
			res.render('add_payment', {classes: req.classes});
		})
		.post(checkAuth, allStudents, function(req, res, next){
			var name = req.body.payment_name;
			var amount = req.body.amount;			
			var date = req.body.date;

			var new_payment = new Payments({name: name, amount: amount, date: date, students: []});
	
			new_payment.save(function(err, saved_payment){
				if(err){
					console.log(err);
					req.flash('error', "Couldn't create payment");
				}
				addStudentsByClass(req, saved_payment);
				res.redirect('/payments');
			});
		})

	app.param('sid', function(req, res, next, sid){
		Students.findOne({'_id':sid}, function(err, student){
			if (!err) {
				req.student = student;
				next();
			} else {
				console.log(err);
			}
		});
	});

	app.param('pid', function(req, res, next, pid){
		Payments.findOne({'_id': pid}, function(err, p){
			if (!err){
				req.payment = p;
				next()
			} else {
				console.log(err);
			}
		});
	});

	app.post('/delete_payment', checkAuth, function(req, res){
		var payment_id = req.body.pid;

		Payments.findOne({'_id': payment_id}, function(err, payment){
			if (!err) {
				payment.remove();	
				res.redirect('/payments');
			} else {
				console.log(err);
			}		
		});
	});

	app.post('/delete_student', checkAuth, allPayments, function(req, res){
		var student_id = req.body.sid;

		Students.findOne({'_id': student_id}, function(err, student){
			if (!err){
				removeStudentFromPayments(req, student);
				student.remove();
				res.redirect('/home');
			} else {
				console.log(err);
			}	
		});
	});

	app.post('/delete_expense', checkAuth, function(req, res){
		var expense_id = req.body.eid;
		Expenses.findOne({'_id': expense_id}, function(err, expense){
			if (!err){

				expense.remove();
				res.redirect('/expenses');
			} else {
				console.log(err);
			}
		});

	});


	app.post('/edit_payment/:pid/add_student', checkAuth, function(req, res){
		var new_student = req.body.student;

		Students.findOne({name: new_student}, function(err, s){
			var student_info = { name: s.name, sid: s.id, paid: 0};
			req.payment.students.push(student_info);
			req.payment.save();
			res.redirect('/view_payment/' + req.payment.id);
		});

	});

	app.post('/edit_payment/:pid', checkAuth, function(req, res){
		var new_name = req.body.p_name;
		var new_date = req.body.p_date;
		var new_amount = req.body.p_amount;

		Payments.update({'_id': req.payment.id}, {name: new_name, date: new_date, amount: new_amount}, function(err, p){
			if (err){
				console.log(err)
			} else {
				res.redirect('/payments');
			}

		});
	});
	

	app.get('/view_payment/:pid', checkAuth, allStudents, function(req, res){
		var total_paid = 0;
		var total_owed = 0;


		for (i=0; i<req.payment.students.length; i ++) {
			var student = req.payment.students[i];
			total_paid += parseInt(student.paid,10);
		}

		total_owed = (parseInt(req.payment.amount,10) * parseInt(req.payment.students.length,10)) - total_paid;
		res.render('view_payment', {payment: req.payment, all_students: req.students, total_paid: total_paid, total_owed: total_owed});
	});

	app.post('/edit_student/:sid', checkAuth, function(req, res){
		var new_name = req.body.s_name;
		var new_enroll = req.body.s_date;
		var new_class = req.body.s_class;

		Students.update({'_id': req.student.id}, {name: new_name, enroll_date: new_enroll, grade: new_class}, function(err, s){
			if (err) {
				console.log(err);
			} else {
				res.redirect('/view_student/' + req.student.id);
			}
		});

	});

        app.get('/view_student/:sid', checkAuth, allPayments, allClasses, function(req, res){
		var error = req.flash('error')
		var payments = getPaymentsByStudent(req.payments, req.student.id);	
		console.log(req.classes);
		console.log(req.student);

		res.render('view_student', {student: req.student, classes: req.classes, student_payments: payments[0], debt: payments[1], paid: payments[2], message: error});
	})

	app.post('/view_student/:sid/delete_payment/:pid', checkAuth, function(req, res){
	        console.log("Delete payment received by server");	
		console.log(req.payment.students.length);
		Payments.findOneAndUpdate({'_id': req.payment.id}, {'$pull':{'students':{'sid': req.student.id}}}, function(err, p){
			res.redirect('/view_student/' + req.student.id);
		});
	});

	app.route('/pay/:sid/:pid')
		.get(checkAuth, allPayments, function(req, res){
			//TODO: Display better information on payment page
			res.render('pay', {payment: req.payment, student: req.student});
		})
		.post(checkAuth, function(req, res){
			var payment_amount = parseInt(req.body.payment_amount, 10);
			Payments.findOneAndUpdate({'_id': req.payment.id, 'students.sid': req.student.id}, {'$inc': {'students.$.paid':payment_amount}}, function(err, p){
				if (!err){
					res.redirect('/view_student/' + req.student.id);
				}
			});
		})

	function calculateDebt(req, res, next){
                var monthly_debt = {};
		var debt = 0;
		console.log("Calculating Debt");
		
		for (j=0; j < req.expenses.length; j++){
			if (!(req.expenses[j].date in monthly_debt)){
				monthly_debt[req.expenses[j].date] = 0;
			}
                        monthly_debt[req.expenses[j].date] += parseInt(req.expenses[j].amount,10);
			debt += parseInt(req.expenses[j].amount, 10);
		}

		for (i=0; i < req.payments.length; i++) {
			if (!(req.payments[i].date in monthly_debt)){
				monthly_debt[req.payments[i].date] = 0;
			}
		}

		req.school_debt = parseInt(debt,10);	
		req.monthly_debt = monthly_debt;
		console.log(debt);
		console.log(monthly_debt);
		next();
	}

	function calculateIncome(req, res, next){
		//TODO: Income NaN when Students Missing Payments
		//TODO: Distinguish between one time payments and students owing
		var monthly_income = {};
		var income = 0;
		console.log("Calculating Income");
		
		for(k=0; k < req.expenses.length; k++){
			if(!(req.expenses[k].date in monthly_income)){
				monthly_income[req.expenses[k].date] = 0;
			}
		}
		for(j=0; j<req.payments.length; j++){
			var this_payment = req.payments[j];
			
			if (!(this_payment.date in monthly_income)){
				monthly_income[this_payment.date] = 0;
			}	
			if (this_payment.students.length === 0) {
				monthly_income[this_payment.date] += parseInt(this_payment.amount, 10);	
				income += parseInt(this_payment.amount, 10);
			} else {
				for(i=0; i< this_payment.students.length; i++){
			        	monthly_income[this_payment.date] += parseInt(this_payment.students[i].paid, 10);	
					income += parseInt(this_payment.students[i].paid, 10);
				}
			}
		}

	
		req.school_income = parseInt(income,10);
		req.monthly_income = monthly_income;
		console.log(income);
		console.log(monthly_income);
		next();
	}

	function getPaymentsByStudent(all_payments, sid) {
                var student_payments = [];
		var debt = 0;
		var paid = 0;

		for (i=0;i<all_payments.length;i++){
			var this_payment = all_payments[i];
			var payment_info = {};

			for (j=0;j<this_payment.students.length; j++){ 
				var stud = this_payment.students[j];		
				if (stud.sid === sid) {
					payment_info['name'] = this_payment.name;
					payment_info['id']= this_payment.id;
					payment_info['amount'] = this_payment.amount;
					payment_info['date'] = this_payment.date;
					payment_info['paid'] = stud.paid;

					paid += parseInt(stud.paid,10);
					debt += parseInt(this_payment.amount,10) - parseInt(stud.paid,10);
					student_payments.push(payment_info);
				}
			}	
		}
		console.log(debt);
		console.log(paid);
		return [student_payments, debt, paid];
	}

	function addStudentsByClass(req, payment){ 
		for (var key in req.body) {
			if (req.body[key] === "on"){
				key = key.replace(/(\r\n|\n|\r)/gm,"")
				Students.find({'grade': key}, function(err, found_students){
					if (!err){
						for (i=0; i<found_students.length; i++) {
							var s = found_students[i];
							student_info = {};
							student_info['name'] = s.name;
							student_info['sid'] = s.id;
							payment.students.push(student_info);
							payment.save(function (err){
								if (err){
									console.log(err);
								}
							});
						}
					} else {
						console.log(err);
					}
				});		
			}
		}
	}

	function removeStudentFromPayments(req, student){
		for (i=0; i < req.payments.length; i ++){
			Payments.update({'_id': req.payments[i].id}, {'$pull': {'students': {'sid': student.id}}}, function(err, p){
				if (err) {
					console.log(err);
				}
			});	
		}	
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
			if (!err){
				for (i=0; i < all_classes.length; i ++) {
					all_classes[i].name = all_classes[i].name.replace(/(\r\n|\n|\r)/gm,"")
				}
				req.classes = all_classes;
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
