Name: 
	Henry Tu

Student Number:
	101120384

run:
	install mongoDB
	$ npm install
	$ node server.js



The code has detailed comments throughout

only   clicking the log out buttom and close the web browser (not tab) can result in a success log out. Disconnecting the server or close the tab will not log you out.  

if loggin successfull, it will direct you to the user detail page, else, you will be directed to the main page without any alert.

There is a the "log out" button included in the header, you can log out from any page.

There will not be a logout button if you are not logged in, in the same way, there will not be a login form and login button if you are already logged in.

there is no comments in pug file, any neccessary comments related to pug files is included in comments in server.js

if you attempt to view someone elses' user page that is set to private, a 403 error alone with a message will be sent to you, simply click the back button on chrome to go back to previous page.

after you finished a quiz, if you are logged in, you will be directed to the user detail page. Else, you will be directed to the main page.