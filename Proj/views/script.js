var json;

function load(){		// get the search word and send to server
	let fly = {};
	let text = document.getElementsByClassName('input')[0].value
	let choice = document.getElementsByTagName("select")[0].value
	fly['text'] = text;
	fly['choice'] = choice
	const Http = new XMLHttpRequest();
	Http.onreadystatechange = function(){
		if(this.readyState==4 && this.status==200){
			json = JSON.parse(this.responseText);
			loadBooks();		// once retrieved with required search results, continue.
		}
	}
	Http.open("POST", "/browse");
	Http.setRequestHeader("Content-Type", "application/json");
	Http.send(JSON.stringify(fly)); 
	
} 
function loadBooks(){			// generate url for each book as search results.
	let buffer = document.getElementById("buffer");	
	let upText = buffer.getElementsByClassName("upText");
	let down = document.getElementById("results");
	down.innerText="";
	dance:
	for(i in json){				
		for(let j=0; j<upText.length;j++){		//if in cart, don't show in search result

			if(upText[j].title == json[i].isbn){
				continue dance;
			}
		}
		let div = document.createElement("dee");
		let x = document.createElement("INPUT");
		x.setAttribute("type", "checkbox");
		x.setAttribute("class", "checkbox");
		div.appendChild(x);
		let a = document.createElement('a');
		let linkText = document.createTextNode(json[i].name);
		a.setAttribute("class","upText");
		a.appendChild(linkText);
		a.title = json[i].isbn;
		a.stock = json[i].book_num;
		a.href = "http://localhost:3000/browse/"+json[i].isbn;
		a.setAttribute('target', '_blank');

		let t = document.createTextNode("		Stock: " + a.stock);
		div.appendChild(a);
		div.appendChild(t)
		div.appendChild(document.createElement("BR"));
		down.appendChild(div);
	}

}

function transfer(){		//transfer selected questions to cart (upper area)
	const Http = new XMLHttpRequest();
	Http.onreadystatechange = function(){
		if(this.readyState==4 && this.status==200){
			if(this.responseText == 'true'){
				keepTransfer();		// if the user is logged in, continue
			}else{	
				alert("Need to Log In, if you don't have an account, register one.");	//if user not logged in, ask to login for adding to cart
				return;
			}
		}
	}
	Http.open("POST", "/transfer");
	Http.setRequestHeader("Content-Type", "text/plain");
	Http.send(); 	
}

function preLoad(){		//read the cart item stored in database and show in cart


	const Http = new XMLHttpRequest();
	Http.onreadystatechange = function(){
		if(this.readyState==4 && this.status==200){
			if(this.responseText == false){
				return;
			}
			json = JSON.parse(this.responseText);
			preLoadII();
		}
	}
	Http.open("POST", "/preLoad");
	Http.setRequestHeader("Content-Type", "application/json");
	Http.send(); 	
}

function preLoadII(){	
	let buffer = document.getElementById("buffer");	
	let upText = buffer.getElementsByClassName("upText");
	let down = document.getElementById("results");
	for(i in json){
		let div = document.createElement("dee");
		let x = document.createElement("INPUT");
		x.setAttribute("type", "checkbox");
		x.setAttribute("class", "checkbox");
		x.checked = true;
		div.appendChild(x);
		let a = document.createElement('a');
		let linkText = document.createTextNode(json[i].name);
		a.setAttribute("class","upText");
		a.appendChild(linkText);
		a.title = json[i].isbn;
		a.stock = json[i].stock;
		a.href = "http://localhost:3000/browse/"+json[i].isbn;
		a.setAttribute('target', '_blank');

		let t = document.createTextNode("		Stock: " + a.stock);
		div.appendChild(a);
		div.appendChild(t)
		div.appendChild(document.createElement("BR"));
		down.appendChild(div);
	}
	let results = document.getElementById("results");
	let box = document.getElementsByClassName("checkbox");
	for(i in box){
		if(box[i].checked && box[i].parentElement.parentElement.id == "results"){
			box[i].checked = false;
			let x = document.createElement("input");
			let br = document.createElement("BR");
			x.setAttribute("type", "number");
			x.setAttribute("value", json[i].book_num);
			x.addEventListener("change", updateCart)
			box[i].parentElement.appendChild(x);
			box[i].parentElement.appendChild(br);
			buffer.appendChild(box[i].parentElement);
		}
	}
	if(buffer.getElementsByClassName("checkbox").length != 0){
		buffer.childNodes[0].style.display="none";
	}else{
		buffer.childNodes[0].style.display="block";
	}
	
}

function keepTransfer(){
	let results = document.getElementById("results");
	let box = document.getElementsByClassName("checkbox");
	let buffer = document.getElementById("buffer");
	let count = 0;
	for(i in box){
		if (box[i].checked){
			count+=1;
			break;
		}
	}
	if(count == 0){
		alert("That is just not gonna work.")
		return;
	}
	for(i in box){
		if(box[i].checked && box[i].parentElement.parentElement.id == "results"){
			box[i].checked = false;
			let x = document.createElement("input");
			let br = document.createElement("BR");
			x.setAttribute("type", "number");
			x.setAttribute("value", "1");
			x.addEventListener("change", updateCart)
			box[i].parentElement.appendChild(x);
			box[i].parentElement.appendChild(br);
			buffer.appendChild(box[i].parentElement);
		}
	}
	updateCart();
	if(buffer.getElementsByClassName("checkbox").length != 0){
		buffer.childNodes[0].style.display="none";
	}else{
		buffer.childNodes[0].style.display="block";
	}

}

function updateCart(){
	let buffer = document.getElementById("buffer").childNodes;
	let final = []
	
	for(let i=1; i<buffer.length; i++){
		let stock = buffer[i].childNodes[1].stock
		let number = buffer[i].childNodes[4].value
		if(parseInt(stock) < parseInt(number)){
			number = stock;
			alert("Not Enough Stock, Buy Less!");
			return;
		}
		
	}
	
	for(let i=1; i<buffer.length; i++){
		let isbn = buffer[i].childNodes[1].title
		let number = buffer[i].childNodes[4].value
		let fly = {}
		fly['isbn'] = isbn;
		fly['bookNum'] = number;
		final.push(fly)
	}

	const Http = new XMLHttpRequest();
	Http.onreadystatechange = function(){
		if(this.readyState==4 && this.status==200){
			if(this.responseText){
				window.open("/browse")
			}else{
				return;
			}
		}
	}
	Http.open("POST", "/updateCart");
	Http.setRequestHeader("Content-Type", "application/json");
	Http.send(JSON.stringify(final)); 	

}


function remove(){				//remove questions from upper area and put back to dropdown list result area
	let results = document.getElementById("results");
	let buffer = document.getElementById("buffer");
	let box = buffer.getElementsByClassName("checkbox");
	for(let i = box.length-1; i>=0; i--){
		if(box[i].checked && box[i].parentElement.parentElement.id == "buffer"){
			box[i].checked = false;
			box[i].parentElement.childNodes[5].remove();
			box[i].parentElement.childNodes[4].remove();
			results.insertBefore(box[i].parentElement, results.childNodes[0]);
		}
	}
	if(buffer.getElementsByClassName("checkbox").length != 0){
		buffer.childNodes[0].style.display="none";
	}else{
		buffer.childNodes[0].style.display="block";
	}
	updateCart()
}
var address;
function checkOut(){			// checkOut the cart
	if (document.getElementById("buffer").childNodes.length ==1){
		alert("That is a no-no.")
		return;
	}
	const Http = new XMLHttpRequest();
	Http.onreadystatechange = function(){
		if(this.readyState==4 && this.status==200){
			let response = JSON.parse(this.responseText);
			address = response['address'];
			if(response.pass == 'true'){
				shippingAddress();
			}else{
				window.location.href = "http://localhost:3000/browse/"	
			}
		}
	}
	Http.open("POST", "/checkOut");
	Http.setRequestHeader("Content-Type", "application/json");
	Http.send(); 
	 
}
var body;

function shippingAddress(){
	let results = document.getElementById("results");
	let buffer = document.getElementById("buffer");
	let box = buffer.getElementsByClassName("checkbox");
	for(let i = box.length-1; i>=0; i--){
		if(box[i].parentElement.parentElement.id == "buffer"){
			let fly = {};		//{isbn:bookNum}
			fly["isbn"] = box[i].parentElement.childNodes[1].title;
			fly["num"] = box[i].parentElement.childNodes[4].value
			box[i].parentElement.remove()
			list.push(fly)
		}
	}

	if(confirm("Do you want to use your default information (name, phone, address) for this order? " + address + " ?")){
		keepCheckOut();
	}else{

	
		body = document.body.innerHTML;
		document.body.innerHTML = ""
		document.body.innerHTML+= "<label for='fname'>First name:</label><br> <input type='text' id='fname' name='fname' value=''><br> <label for='lname'>Last name:</label><br> <input type='text' id='lname' name='lname' value=''><br> <label for='phone'>Phone:</label><br> <input type='text' id='phone' name='phone' value=''><br> <label for='email'>Email:</label><br> <input type='text' id='email' name='email' value=''><br> <label for='address'>Address:</label><br> <input type='text' id='address' name='address' value=''><br><br> <button type='button'>Continue</button>"
		document.getElementsByTagName("button")[0].addEventListener("click", shippingAddress2)
		

	//continueCheckOut()
	}
}

function shippingAddress2(){
	let info={}
	info['first_name'] = document.getElementsByTagName("input")[1].value
	info['last_name'] = document.getElementsByTagName("input")[2].value
	info['phone'] = document.getElementsByTagName("input")[3].value
	info['email'] = document.getElementsByTagName("input")[4].value
	info['address'] = document.getElementsByTagName("input")[5].value

	for (i in info ){
		if(info[i] == null || info[i] == ""){
			alert("You missed something, try again.")
			return;
		}
	}

	const Http = new XMLHttpRequest();
	Http.onreadystatechange = function(){
		if(this.readyState==4 && this.status==200){
			document.body.innerHTML = body
			
			keepCheckOut()		
		}
	}
	Http.open("POST", "/shippingAddress");
	Http.setRequestHeader("Content-Type", "application/json");
	Http.send(JSON.stringify(info)); 
}


var list=[];
function keepCheckOut(){
	
	//remove from cart
			
	let results = document.getElementById("results");
	let buffer = document.getElementById("buffer");
	let box = buffer.getElementsByClassName("checkbox");

	/* for(let i = box.length-1; i>=0; i--){
		if(box[i].parentElement.parentElement.id == "buffer"){
			let fly = {};		//{isbn:bookNum}
			fly["isbn"] = box[i].parentElement.childNodes[1].title;
			fly["num"] = box[i].parentElement.childNodes[4].value
			box[i].parentElement.remove()
			list.push(fly)
		}
	} */

	if(buffer.getElementsByClassName("checkbox").length != 0){
		buffer.childNodes[0].style.display="none";
	}else{
		buffer.childNodes[0].style.display="block";
	}
	const Http = new XMLHttpRequest();
	Http.onreadystatechange = function(){
		if(this.readyState==4 && this.status==200){
			window.location.href = "http://localhost:3000/order/"+this.responseText;		
		}
	}
	Http.open("POST", "/keepCheckOut");
	Http.setRequestHeader("Content-Type", "application/json");
	Http.send(JSON.stringify(list)); 
	
}

function changeBook(){			//admin change information of a book
	let text = document.getElementsByTagName("input")[1].value
	
	const Http = new XMLHttpRequest();
	Http.onreadystatechange = function(){
		if(this.readyState==4 && this.status==200){
			if(this.responseText == "Invalid ISBN"){
				alert("Invalid ISBN")
				return
			}
			document.body.innerHTML = ""
			let json = JSON.parse(this.responseText);
			
			para = document.createElement("P");
			para.innerHTML = json.isbn;
			document.body.appendChild(para);
			  
			 para = document.createElement("P");
			para.innerHTML = "Title: ";
			document.body.appendChild(para);
			 x = document.createElement("INPUT");
			x.setAttribute("type", "text");
			x.setAttribute("value", json.name);
			document.body.appendChild(x); 
			x = document.createElement("BR");
			document.body.appendChild(x); 
			  
			 para = document.createElement("P");
			para.innerHTML = "Page Number: ";
			document.body.appendChild(para);
			 x = document.createElement("INPUT");
			x.setAttribute("type", "text");
			x.setAttribute("value", json.pagenum);
			document.body.appendChild(x); 
			x = document.createElement("BR");
			document.body.appendChild(x); 
			  
			 para = document.createElement("P");
			para.innerHTML = "Price: ";
			document.body.appendChild(para);
			 x = document.createElement("INPUT");
			x.setAttribute("type", "text");
			x.setAttribute("value", json.price);
			document.body.appendChild(x); 
			x = document.createElement("BR");
			document.body.appendChild(x); 
			  
			 para = document.createElement("P");
			para.innerHTML = "Cost: ";
			document.body.appendChild(para);
			 x = document.createElement("INPUT");
			x.setAttribute("type", "text");
			x.setAttribute("value", json.cost);
			document.body.appendChild(x); 
			x = document.createElement("BR");
			document.body.appendChild(x); 
			  
			 para = document.createElement("P");
			para.innerHTML = "Year: ";
			document.body.appendChild(para);
			 x = document.createElement("INPUT");
			x.setAttribute("type", "text");
			x.setAttribute("value", json.year);
			document.body.appendChild(x); 
			x = document.createElement("BR");
			document.body.appendChild(x); 

			 para = document.createElement("P");
			para.innerHTML = "Stock: ";
			document.body.appendChild(para);
			 x = document.createElement("INPUT");
			x.setAttribute("type", "text");
			x.setAttribute("value", json.stock);
			document.body.appendChild(x); 
			x = document.createElement("BR");
			document.body.appendChild(x); 

			var btn = document.createElement("BUTTON");
			btn.innerHTML = "save";
			btn.onclick = function() {changeBook2()};
			document.body.appendChild(btn);
		}
	}
	Http.open("POST", "/changeBook");
	Http.setRequestHeader("Content-Type", "text/plain");
	Http.send(text); 
}

function changeBook2(){
	let isbn = document.getElementsByTagName("p")[0].innerText
	let title = document.getElementsByTagName("input")[1].value
	let pageNum = document.getElementsByTagName("input")[2].value
	let price = document.getElementsByTagName("input")[3].value
	let cost = document.getElementsByTagName("input")[4].value
	let year = document.getElementsByTagName("input")[5].value
	let stock = document.getElementsByTagName("input")[6].value
	let fly = {}
	fly['title'] = title;
	fly['pageNum'] = pageNum
	fly['price'] = price
	fly['cost'] = cost
	fly['year'] = year
	fly['stock'] = stock
	fly['isbn'] = isbn

	const Http = new XMLHttpRequest();
	Http.onreadystatechange = function(){
		if(this.readyState==4 && this.status==200){
			if(this.responseText=="wrong"){
				alert("something's wrong")
			}
			window.location.href = "http://localhost:3000/admin"
		}
	}
	Http.open("POST", "/changeBook");
	Http.setRequestHeader("Content-Type", "application/json");
	Http.send(JSON.stringify(fly)); 
}




function changeProfile(){	//change customer profile
	let fname = document.getElementsByTagName("span")[0].innerText
	let lname = document.getElementsByTagName("span")[1].innerText
	let email = document.getElementsByTagName("span")[2].innerText
	let phone = document.getElementsByTagName("span")[3].innerText
	let address = document.getElementsByTagName("span")[4].innerText
	
	document.body.innerHTML =""
	
	let para = document.createElement("P");
  	para.innerHTML = "First Name: ";
	document.body.appendChild(para);
	let x = document.createElement("INPUT");
	x.setAttribute("type", "text");
	x.setAttribute("value", fname);
	document.body.appendChild(x); 
	x = document.createElement("BR");
	document.body.appendChild(x); 
	
	para = document.createElement("P");
  	para.innerHTML = "Last Name: ";
	document.body.appendChild(para);
	x = document.createElement("INPUT");
	x.setAttribute("type", "text");
	x.setAttribute("value", lname);
	document.body.appendChild(x); 
	x = document.createElement("BR");
	document.body.appendChild(x); 
	
	para = document.createElement("P");
  	para.innerHTML = "Email: " + email;
	document.body.appendChild(para);
	
	para = document.createElement("P");
  	para.innerHTML = "Phone: ";
	document.body.appendChild(para);
	x = document.createElement("INPUT");
	x.setAttribute("type", "text");
	x.setAttribute("value", phone);
	document.body.appendChild(x); 
	x = document.createElement("BR");
	document.body.appendChild(x); 
	
	para = document.createElement("P");
  	para.innerHTML = "Default Address: ";
	document.body.appendChild(para);
	x = document.createElement("INPUT");
	x.setAttribute("type", "text");
	x.setAttribute("value", address);
	document.body.appendChild(x); 
	x = document.createElement("BR");
	document.body.appendChild(x); 
	document.body.appendChild(x); 
	
	var btn = document.createElement("BUTTON");
	btn.innerHTML = "save";
	btn.onclick = function() {changeProfile2()};
  	document.body.appendChild(btn);

}

function changeProfile2(){
	let fname = document.getElementsByTagName("input")[1]
	let lname = document.getElementsByTagName("input")[2]
	let phone = document.getElementsByTagName("input")[3]
	let address = document.getElementsByTagName("input")[4]

	let fly = {}
	fly["fname"] = fname.value
	fly["lname"] = lname.value
	fly["phone"] = phone.value
	fly["address"] = address.value
	const Http = new XMLHttpRequest();
	Http.onreadystatechange = function(){
		if(this.readyState==4 && this.status==200){
			window.location.href = "http://localhost:3000/users/"+this.responseText;		
		}
	}
	Http.open("POST", "/changeProfile");
	Http.setRequestHeader("Content-Type", "application/json");
	Http.send(JSON.stringify(fly)); 
}

function track(){		
	let number = document.getElementsByClassName("text")[0].value;
	if(number == null || number==""){
		alert("Pointless, right?")
		return
	}
	if(number.length!=36){
		alert("The length is not even right")
		return
	}

	window.location.href = "http://localhost:3000/order/"+number;	


	
}