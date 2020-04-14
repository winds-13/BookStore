const express = require('express');
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const session = require('express-session')
const ObjectId = require('mongodb').ObjectID
const MongoDBStore = require('connect-mongodb-session')(session);
const uuidv4 = require('uuid/v4');
const {Pool, Client} = require('pg')

const store = new MongoDBStore({
	uri: 'mongodb://localhost:27017/BookStore_tokens',
    collection: 'sessiondata'
  });
const client = new Client({
    "user": "postgres",
    "password": "123456",
    "host": "localhost",
    "port": "5432",
    "database" :"BookStore"
})
let app=express();
app.use(bodyParser.text({ type: "text/plain" }));
app.use(session({ secret: 'some secret here', store: store }))
app.set("view engine", "pug");
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }));


start()
async function start(){
    await connect();
}

async function connect(){
    try{
        await client.connect()
    }
    catch(e){
        console.error(`failed to connect ${e}`)
    }
}


app.get("/", function(req, res){        //load main page
    res.render("main", {logged : req.session.loggedin, userId : req.session.userId, name : req.session.name});
})

app.get("/register", function(req, res){        // load register page
    res.render("registration")
})

app.post("/register", async function(req, res, next){   //register an account
    let id = uuidv4();
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let address = req.body.address;
    let email = req.body.email;
    let password = req.body.password;
    let phone = req.body.phone;
    if (firstName == "" || lastName == "" || address == "" || email == "" || phone == "" || password == "" ){
        res.status(404).render("registration", {message:"something's missing, do it again!"})
        return;
    }
    
    try{    // add to database
        const result = await client.query(
            "insert into customer (id, first_name, last_name, default_address, email, phone, password) values ($1, $2, $3, $4, lower($5), $6, $7)", [id, firstName, lastName, address, email, phone, password]
            )
        res.status(201).redirect("/");
    }
    catch(ex){
        console.log(`error write() ${ex}`)
        res.status(404).render("registration", {message:"this email has already been registered"})
    }
    
})



app.post("/login", async function(req, res){  //log in
    let username = req.body.username;
    let password = req.body.password;
    let result = await client.query("select email from customer where email = $1", [username])
    if (result.rows[0] == undefined){       // not found username
        res.render("main", {message:"incorrect username or password"});
    }else{                                  // found username, check password
        result = await client.query("select password from customer where email = $1", [username])
        result = result.rows[0]['password'];
        if (password == result){                // password match, logging in
            let _id = await client.query("select id from customer where email = $1", [username])
            let _name = await client.query("select first_name from customer where email = $1", [username])
            req.session.loggedin = true;
            req.session.name = _name.rows[0]['first_name'];
            req.session.username = username;
            req.session.userId = _id.rows[0]['id'];
            
            let admin = await client.query("select admin from customer where email = $1",[username])
            admin = admin.rows[0]['admin']
            if(admin == true){
                res.redirect('/admin')
                
            }else{
                res.render("main", {logged : req.session.loggedin, userId : req.session.userId, name : req.session.name})
            }
            

        }else{                                 // password does not match
            res.render("main", {message:"incorrect username or password"});
        }
    }   
    
})

app.get("/logout", function (req, res){			//log out
	if(req.session.loggedin){
		req.session.loggedin = false;
		res.status(200).redirect("/")		// redirect to home page
	}
})

app.get("/browse", async function(req, res){          // the shopping page
    res.render('browse',{logged:req.session.loggedin, name:req.session.name, userId:req.session.userId})

})

app.post("/browse", async function(req, res){       // search books
    let json = req.body;
    let search = json['text'];
    let choice = json['choice']
    
    
    if(choice=="Book Name"){    //fuzzy search no.1
        search = "%"+search+"%"         //approximate search
        var results = await client.query("SELECT * FROM book WHERE LOWER(name) like LOWER($1);", [search])  // fuzzy search no.1 result
    }else if(choice=="Author"){  //approximate search
        var results = await client.query("select book.* from book, write, author where book.isbn = write.isbn and write.author_id = author.id and similarity(lower(author.name), lower($1))>0.3", [search])  // fuzzy search no.1 result
    }else if(choice=="ISBN"){
        var results = await client.query("select * from book where isbn = $1", [search]) 
    }else if(choice=="genre"){
        var results = await client.query("select book.* from book, genre, book_genre where book.isbn = book_genre.isbn and genre.id = book_genre.genre_id and genre.name = $1", [search]) 

    }

    results = results.rows;
    if(results.length == 0){ // fuzzy search no.2
        results = await client.query("select * from book WHERE SIMILARITY(name, $1) > 0.4 ;", [search]);
        results = results.rows;
    }

    for(i in results){
        let bookNum = await client.query("select book_num from book, book_warehouse where book.isbn = book_warehouse.isbn and book.isbn = $1", [results[i].isbn])  // book num in warehouse
        bookNum = bookNum.rows[0].book_num
        results[i].book_num = bookNum

    }
    res.send(results)



    /* if (results.length != 0){       //fuzzy search no.1
        for(i in results){
            let bookNum = await client.query("select book_num from book, book_warehouse where book.isbn = book_warehouse.isbn and book.isbn = $1", [results[i].isbn])  // book num in warehouse
            bookNum = bookNum.rows[0].book_num
            results[i].book_num = bookNum

        }
        res.send(results)
    }else{                          // fuzzy search no.2
        results = await client.query("select * from book WHERE SIMILARITY(name, $1) > 0.4 ;", [search]);
        results = results.rows;
        for(i in results){
            let bookNum = await client.query("select book_num from book, book_warehouse where book.isbn = book_warehouse.isbn and book.isbn = $1", [results[i].isbn])  // book num in warehouse
            bookNum = bookNum.rows[0].book_num
            results[i].book_num = bookNum

        }
        res.send(results)
    } */
})

app.post("/preLoad", async function(req, res){      // load cart items

    if(req.session.loggedin == false){
        res.send("false")
        return
    }

    results = await client.query("select * from cart where customer_id = $1", [req.session.userId]);
    results = results.rows;
    
    for(i in results){
        let names = await client.query("SELECT * FROM book WHERE isbn = $1;", [results[i].isbn])  
        names = names.rows[0]
        results[i].name = names.name
        results[i].pagenum = names.pagenum
        results[i].cost = names.cost
        results[i].price = names.price
        results[i].year = names.year
    }
    
    for(i in results){
        let bookNum = await client.query("select book_num from book, book_warehouse where book.isbn = book_warehouse.isbn and book.isbn = $1", [results[i].isbn])  // book num in warehouse
        let stock = bookNum.rows[0].book_num
        results[i].stock = stock

    }    

    res.send(results)

})



app.get("/browse/:isbn", async function(req, res){     // book detail page
    let isbn = req.params.isbn;
    //basic information
    let book = await client.query("select * from book where book.isbn = $1 ", [isbn])  // book information  
    let publisher = await client.query("select publisher.name from book, publish, publisher where book.isbn = publish.isbn and publish.publisher_id = publisher.id and book.isbn = $1 ",[isbn]);
    let genre = await client.query("select genre.name from book, book_genre, genre where book.isbn = book_genre.isbn and book_genre.genre_id = genre.id and book.isbn = $1 ", [isbn]) 
    let author = await client.query("select author.name from book, write, author where book.isbn = write.isbn and write.author_id = author.id and book.isbn = $1 ", [isbn]) 
    let stock = await client.query("select book_num from book, book_warehouse where book.isbn = book_warehouse.isbn and book.isbn = $1", [isbn]) 


    book = book.rows[0];
    publisher = publisher.rows;
    genre = genre.rows;
    author = author.rows;
    stock = stock.rows[0].book_num;
    book['stock'] = stock

    
    // same author recommendation
    let author_final = {}
    let authorIds = await client.query("select author.id from book, write, author where book.isbn = write.isbn and write.author_id = author.id and book.isbn = $1 ", [isbn])
    authorIds = authorIds.rows;
    for (i in authorIds) {
        
        let id = authorIds[i]['id']
        bookNum = await client.query("select count(book.isbn) from book, write, author where book.isbn = write.isbn and write.author_id = author.id and author.id = $1", [id]) //book num of an author
        bookNum = bookNum.rows[0]['count']
        let result = await client.query("select book.isbn, book.name from book,write,author where book.isbn = write.isbn and write.author_id = author.id and author.id = $1 OFFSET floor(random()*$2) LIMIT 2", [id, bookNum])
        result=result.rows
        author_final[author[i]['name']] = result

    }

    res.render('single', {message: book, tags : genre, author:author, publisher:publisher, obj:author_final})

})

app.post("/transfer", function (req,res){           //helper function
    let fly = req.session.loggedin ? 'true' : 'false'
    res.send(fly);

})

app.post("/checkOut", async function (req,res){     //check out the cart
    let json = {}
    let fly = req.session.loggedin ? 'true' : 'false'
    json['pass'] = fly;

    let result = await client.query("select default_address from customer where id = $1", [req.session.userId]);
    result = result.rows[0].default_address
    json['address'] = result

    res.send(json)
    


})

app.post("/updateCart", async function (req,res){      // change book number in cart
    if(req.session.loggedin==false){
        res.end("not")
        return
    }
    let work = req.body;
    let result = await client.query("select * from cart where customer_id = $1", [req.session.userId]);
    result=result.rows
    if (result.length == 0){    // the cart is new
        for(i in work){
            let result = await client.query("insert into cart values ($1, $2, $3)", [work[i].isbn, req.session.userId, work[i].bookNum]);
        }
    }else{                      // cart exists, only update information
        let result = await client.query("delete from cart where customer_id = $1 ", [req.session.userId]);
        for(i in work){
            let result = await client.query("insert into cart values ($1, $2, $3)", [work[i].isbn, req.session.userId, work[i].bookNum]);
        }    
    }
    res.status(200).end;

})

app.post("/continueCheckOut", async function(req,res){  // second part check out
    if(req.body == 'stay'){
        await client.query("update customer set shipping_address = default_address where id = $1  ", [req.session.userId]);
        res.end()
        return;
    }
    await client.query("update customer set s_fName = $1, s_lName = $2, s_email = $3, s_phone = $4, shipping_address = $5 where id = $6  ", [info.first_name, info.last_name, info.email, info.phone, info.address, req.session.userId]);

})
var info;
app.post("/shippingAddress", async function(req,res){      // save new shipping address
    info = req.body
    // await client.query("update customer set s_fName = first_name, s_lName = last_name, s_email = $email, s_phone = phone, shipping_address = default_address where id = $6  ", [req.session.userId]);
    res.send();
})


app.post("/keepCheckOut", async function(req,res){     

    let json = req.body;
    // clear the cart
    await client.query("delete from cart where customer_id = $1", [req.session.userId]);

    if(info == undefined){  // check out using default address
        info={}
        let result = await client.query("select * from customer where id = $1 ", [req.session.userId]);
        result = result.rows[0]

        info['first_name'] = result.first_name
        info['last_name'] = result.last_name
        info['phone'] = result.phone
        info['email'] = result.email
        info['address'] = result.default_address
    }


    // create an order
    let order_id = uuidv4();
    
    let tracking_id = uuidv4();
    await client.query("insert into orders values($1, current_timestamp)  ", [order_id]);
    
    // connect with book (relation 'order_book')
    for(i in json){
        await client.query("insert into order_book (isbn, order_id, book_num) values($1, $2, $3)  ", [json[i].isbn, order_id, json[i].num]);
    }
   
    // connect with customer(relation 'track')

    await client.query("insert into track (order_id, customer_id, location, destination, tracking_id, s_email, s_phone, s_fname,s_lname) values($1, $2, $3, $4, $5, $6, $7, $8, $9)  ", [order_id, req.session.userId, "Warehouse", info.address, tracking_id, info.email, info.phone, info.first_name, info.last_name])
    
    for (i in json){
        
        // reduce the stock
        await client.query("update book_warehouse set book_num = book_num - $1 where isbn = $2",[json[i].num, json[i].isbn]);

         // if stock < 50, order new book
        let stock = await client.query("select book_num from book_warehouse where isbn = $1",[json[i].isbn]);
        stock = stock.rows[0].book_num
        if (stock < 50){  
            console.log("stock<50, placing new orders")  
            let last = 0;       //certain book sold last month
            let month =  await client.query("SELECT EXTRACT(MONTH FROM (SELECT CURRENT_TIMESTAMP))");
            month = month.rows[0].date_part
            if(month == 1){
                let year =  await client.query("SELECT EXTRACT(year FROM (SELECT CURRENT_TIMESTAMP))");
                year = year.rows[0].date_part
                let result = await client.query("select * from order_book where isbn = $1 and (SELECT EXTRACT (Month FROM ts ))=12 and (SELECT EXTRACT (year FROM ts ))= $2 ", [json[i].isbn, year-1])
                for (j in result.rows){
                    last+=parseInt(result.rows[j].book_num)               
                }
                if (last == 0){         // if no last month sales, set stock to 100
                    last = 100;
                }
                await client.query("update book_warehouse set book_num = $1 where isbn = $2",[last, json[i].isbn]);

            }else{
                let result = await client.query("select book_num from order_book where isbn = $1 and (SELECT EXTRACT (Month FROM ts ))=$2", [json[i].isbn, month-1])
              
                for (j in result.rows){
                    last+=parseInt(result.rows[j].book_num)               
                }
                if (last == 0){
                    last = 100;
                }
                
               await client.query("update book_warehouse set book_num = $1 where isbn = $2",[last, json[i].isbn]);
            }
        }
    }
    
    res.end(order_id)
})


app.get("/order/:id", async function(req,res){      //order detail page
    let id = req.params.id
    
    let book = await client.query("select * from book, order_book, orders where orders.id = $1 and orders.id = order_book.order_id and order_book.isbn = book.isbn",[id]);
    book = book.rows
    
    let track = await client.query("select tracking_id from orders, track where orders.id = track.order_id and orders.id = $1",[id]);
    track = track.rows
    if(track.length == 0){
        res.send("So bad, It seems like you got the order number wrong. Go back and try again perhaps.")
        return
    }
    res.render("order_single", {result:book,track:track ,name:req.session.name, userId:req.session.userId})

})

app.get("/order", async function(req,res){          // list all orders
    let result = await client.query("select * from orders, customer, track where customer.id = $1 and orders.id = track.order_id and customer.id = track.customer_id",[req.session.userId]);
    result = result.rows
    res.render("order", {result:result, name:req.session.name, userId:req.session.userId})

})

app.get("/track/:id", async function(req,res){      //tracking detail page
    let id = req.params.id
    // let result = await client.query("select * from orders, track, customer where orders.id = track.order_id and track.customer_id = customer.id and track.tracking_id = $1",[id]);
    let result = await client.query("select * from track where track.tracking_id = $1",[id]);
    result = result.rows[0]
    res.render("track", {result:result, name:req.session.name, userId:req.session.userId})


})

app.get("/users/:id", async function (req, res){        //user profile page
    let id = req.params.id
    let result = await client.query("select * from customer where id = $1",[id]);
    result = result.rows[0]
    res.render("profile",{result:result, name:req.session.name})

})

app.post("/changeProfile", async function(req,res){     // change user information
    let info = req.body
    await client.query("update customer set first_name = $1, last_name = $2, phone = $3, default_address = $4 where customer.id = $5",[info.fname, info.lname, info.phone, info.address, req.session.userId]);
    req.session.name = info.fname;
    res.end(req.session.userId)
})


app.get("/admin", async function (req,res){             //admin page
    if(req.session.loggedin == false){
        res.end()
        return;
    }
    let result = await client.query("select admin from customer where id = $1",[req.session.userId])

        if(result == null){
            res.end()
            return;
            
        }else{
            res.render('admin_main')
        }
   
    

    
})

app.get("/admin/book", async function (req,res){        //admin manage book page
    if(req.session.loggedin == false){
        res.end()
        return;
    }
    let result = await client.query("select admin from customer where id = $1",[req.session.userId])

        if(result == null){
            res.end()
            return;
            
        }else{
            res.render('admin_book')
        }
})

app.get("/admin/addBook", async function (req,res){     //admin addbook page
    if(req.session.loggedin == false){  
        res.end()
        return;
    }
    let result = await client.query("select admin from customer where id = $1",[req.session.userId])

        if(result == null){
            res.end()
            return;
            
        }else{
            res.render('admin_addBook')
        }
})

app.get("/admin/deleteBook", async function (req,res){  //admin delete book page
    if(req.session.loggedin == false){
        res.end()
        return;
    }
    let result = await client.query("select admin from customer where id = $1",[req.session.userId])

        if(result == null){
            res.end()
            return;
            
        }else{
            res.render('admin_deleteBook')
        }
})

app.get("/admin/changeBook", async function (req,res){  // admin change book information page
    if(req.session.loggedin == false){
        res.end()
        return;
    }
    let result = await client.query("select admin from customer where id = $1",[req.session.userId])
        if(result == null){
            res.end()
            return;
            
        }else{
            res.render('admin_changeBook')
        }
})


app.post("/admin/delBook", async function(req,res){      
    try{
        await client.query("delete from book_warehouse where isbn = $1", [req.body.isbn])
        await client.query("delete from book where isbn = $1", [req.body.isbn])
        res.redirect("/admin")
    }catch(ex){
        console.log(`something's wrong ${ex}`)
        res.send("Probably incorrect")
    }

})

app.post("/admin/addBook", async function (req,res){
    let info = req.body
    try{
        let w_id = await client.query('select id from warehouse');
        w_id = w_id.rows[0].id
        await client.query("insert into book values($1, $2,$3,$4,$5,$6)",[info.isbn,info.title,info.pageNum,info.price,info.cost,info.year]);
        await client.query("insert into book_warehouse values($1,$2,$3)",[w_id, info.isbn, info.bookNum])
        res.redirect("/admin")
    }catch(ex){
        console.log(`something's wrong ${ex}`)
        res.send("wrong input")
    }
})

app.post("/changeBook", async function(req,res){
    if(typeof(req.body)=='string'){
        let number = req.body;
        let book = await client.query("select * from book where isbn = $1",[number])
        book = book.rows[0]
        if(book == undefined){
            res.send("Invalid ISBN")
            return;
        }
        let stock = await client.query("select book_num from book_warehouse where isbn = $1",[number])
        stock = stock.rows[0].book_num
        book['stock'] = stock
        res.send(book)
    }else{
        try{
            let book = req.body;
            await client.query("update book set name = $1, pagenum=$2, cost=$3, price=$4,year=$5 where isbn=$6", [book.title, book.pageNum, book.cost, book.price, book.year,book.isbn])
            await client.query("update book_warehouse set book_num = $1 where isbn=$2", [book.stock, book.isbn])
            res.end();
        }catch(ex){
            console.log(`something's wrong ${ex}`)
            res.send("wrong")
        }
    }
    
})

app.get("/admin/view", async function (req,res){            //admin/view main page
    if(req.session.loggedin == false){
        res.end()
        return;
    }
    let result = await client.query("select admin from customer where id = $1",[req.session.userId])
    if(result == null){
        res.end()
        return;
        
    }else{
        res.render('admin_view')
    }
})

app.get("/admin/view/vs", async function (req,res){         //admin page view total sales

    if(req.session.loggedin == false){
        res.end()
        return;
    }
    let result = await client.query("select admin from customer where id = $1",[req.session.userId])
    if(result == null){
        res.end()
        return;
        
    }else{
        let result = await client.query("select sum(book.cost)as cost, sum(book.price)as sales from book, order_book where book.isbn = order_book.isbn")
        result = result.rows[0]
        res.render('admin_view_vs', {expenditure:result.cost, sales:result.sales})
    }
})

app.get("/admin/view/author", async function (req,res){         //admin page view author sales
    if(req.session.loggedin == false){
        res.end()
        return;
    }
    let result = await client.query("select admin from customer where id = $1",[req.session.userId])
    if(result == null){
        res.end()
        return;
    }else{
        res.render("admin_view_author", {first:true})
    }

})

app.post("/admin/view/author", async function (req,res){       //admin page view author sales
    let id = req.body.id
    let result = await client.query("select author.name, sum(cost) as cost, sum(price) as sales from order_book, book, write, author where order_book.isbn = book.isbn and book.isbn = write.isbn and write.author_id = author.id and author.id = $1 group by author.name",[id])
    result = result.rows[0]
    res.render("admin_view_author", {first:false, expenditure:result.cost, sales:result.sales, name:result.name })
})

app.get("/admin/view/genre", async function (req,res){      //admin page view genre sales
    if(req.session.loggedin == false){
        res.end()
        return;
    }
    let result = await client.query("select admin from customer where id = $1",[req.session.userId])
    if(result == null){
        res.end()
        return;
    }else{
        res.render("admin_view_genre", {first:true})
    }

})

app.post("/admin/view/genre", async function (req,res){     //admin page view genre sales
    let id = req.body.id
    let result = await client.query("select genre.name, sum(cost) as cost, sum(price) as sales from order_book, book, book_genre, genre where order_book.isbn = book.isbn and book.isbn = book_genre.isbn and book_genre.genre_id = genre.id and genre_id = $1 group by genre.name",[id])
    result = result.rows[0]
    res.render("admin_view_genre", {first:false, expenditure:result.cost, sales:result.sales, name:result.name })
})


//Connect to session database
mongoose.connect('mongodb://localhost/BookStore', {useNewUrlParser: true});
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	app.listen(3000);
	console.log("Server listening on port 3000");
});