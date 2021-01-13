const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const express = require('express');
const session = require('express-session')
const ObjectId = require('mongodb').ObjectID
const Question = require("./QuestionModel");
const User = require("./UserModel");
const MongoDBStore = require('connect-mongodb-session')(session);
const store = new MongoDBStore({
	uri: 'mongodb://localhost:27017/tokens',
	collection: 'sessiondata'
  });
  
const app = express();
app.use(session({ secret: 'some secret here', store: store }))
app.set("view engine", "pug");
app.use(express.static("public"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// all of my pug files use a "if" statement to show different content regarding whether the user is logged in or not
// so I simply send a status of login every time I render a pug file.


app.get('/', function(req, res, next) {							// the main page
	//console.log("session= "+JSON.stringify(req.session))
	db.collection("users").findOne({username: req.session.username}, function(err, result){
		if(err)throw err;
		//console.log(result);
		res.render("bacl/index", {logged : req.session.loggedin, featured:result});
	});	
});

app.get("/logout", logout);
function logout(req, res, next){			//log out
	if(req.session.loggedin){
		req.session.loggedin = false;
		res.status(200).redirect("/")		// redirect to home page
	}
}

app.post('/private/:id',function(req, res, next) {    
	//console.log(req.body);					//privacy = true or false
	res.status(204).send();						//just a trick to stay on the user page
	let pri = (req.body.private =="On") ? true : false;
	// set privacy in database
	db.collection("users").updateOne({_id:ObjectId(req.params.id)}, {"$set": {privacy: pri}}, function(err,result){
		if(err) throw err;
		console.log("suc");
	});
});

app.post("/login",function(req, res, next){  //log in
	//req.body = username & password
	let username = req.body.username;
	let password = req.body.password;
	db.collection("users").findOne({username: username}, function(err, result){
		if(err)throw err;
		if(result){
			if(result.password === password){
				req.session.loggedin = true;
				req.session.username = username;
				req.session.userId = result._id;
				res.redirect("/users/"+req.session.userId)		//redirect to the logged in user detail page
			}else{
				res.status(409).redirect("/");					// if login not successful, direct to main page
			}
		}else{
			res.status(409).redirect("/")						// if login not successful, direct to main page
			
		}
	});
});


app.get('/users/:id',function(req, res, next) {  				// the user detail page
	if (req.params.id.length != 24){							// if the user id length is even incorrect, send 404 directly.
		res.status(404).send("no user found")
		return;
	}  
	let o_id = new ObjectId(req.params.id);
	db.collection("users").find({"_id" : o_id}).toArray(function(error, result) {	// try to find the req.params.id in database
		if(result.length==0){														// if no result,
			res.status(404).send("no user found");										//send 404 with no user found
			return;
		}
		
		if((result[0].privacy == true && req.session.loggedin==false) || (result[0].privacy == true && String(req.params.id)!=String(req.session.userId) && req.session.loggedin==true)){
			// if you are not logged in and trying to access a private page
				// or you are logged in and trying to access others' private page
					// you will get a 403 error
			res.status(403).send("Profile Cannot be Accessed");
			return;
		}
		
		let send = {};
		send["username"]=req.session.username;
		send["_id"]=String(req.session.userId);
		if(result[0].total_quizzes == 0){	// if there is no quiz completed, set average score to zero
			result[0]["average"] = 0;
			res.render("bacl/single",{featured:result, logged:req.session.loggedin, person:send});
			return;
		}

		let ave = result[0].total_score/result[0].total_quizzes;	//else, average is calculated.
		result[0]["average"] = ave;
		res.render("bacl/single",{featured:result, logged:req.session.loggedin, person:send});

		
	});

});

app.get('/users',function(req, res, next) {		// a list of 10 users
	db.collection("users").find({privacy:false}).toArray(function(error, result) {//only find those with (privacy == false)
		let send = {};
		send["username"]=req.session.username;
		send["_id"]=req.session.userId;
		res.render("bacl/users",{person:send, logged:req.session.loggedin, featured:result});

	});

});

//Returns a page with a new quiz of 10 random questions
app.get("/quiz", function(req, res, next){
	Question.getRandomQuestions(function(err, results){
		if(err) throw err;
		let send = {};
		send["username"]=req.session.username;
		send["_id"]=req.session.userId;
		//req.session.loggedin=true;
		res.status(200).render("bacl/quiz", {featured:send, questions: results, logged:req.session.loggedin});
		
	
	});
})

//The quiz page posts the results here
//Extracts the JSON containing quiz IDs/answers
//Calculates the correct answers and replies
app.post("/quiz", function(req, res, next){
	console.log("here")
	let ids = [];
	try{
		//Try to build an array of ObjectIds
		for(id in req.body){
			ids.push(new mongoose.Types.ObjectId(id));
		}
		
		//Find all questions with Ids in the array
		Question.findIDArray(ids, function(err, results){
			if(err)throw err; //will be caught by catch below
			
			//Count up the correct answers
			let correct = 0;
			for(let i = 0; i < results.length; i++){
				if(req.body[results[i]._id] === results[i].correct_answer){
					correct++;
				}
			}

			if(req.session.loggedin){		// if the user is logged in, their profile will be updated.
				db.collection("users").update({username:req.session.username}, {"$inc": {total_score: correct, total_quizzes:1}}, function(err,result){
					if(err) throw err;
					console.log("quiz number updated");
					res.json({url: "/users/"+req.session.userId, correct: correct});	// and direct to user detail page
					return;
				});
				return;
			}

			
			
			//Send response
			res.json({url: "/", correct: correct});	// if the user is not logged in, the quiz result will not be saved, 
															// and will be directed to home page.
			return;
		});
	}catch(err){
		//If any error is thrown (casting Ids or reading database), send 500 status
		console.log(err);
		res.status(500).send("Error processing quiz data.");
		return;
	}
	
});

//Connect to database
mongoose.connect('mongodb://localhost/quiztracker', {useNewUrlParser: true});
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	app.listen(3000);
	console.log("Server listening on port 3000");
});