# BookStore
an online bookstore (Javascript, PostgreSQL)

To run the program, you need to:
1.	Download PostgreSQL, create the database such the user is “postgres”, the password is “123456”, the port number “5432” and create a new database named “BookStore”, and then open SQL shell (psql), connect to the BookStore database (\connect BookStore), load the data from the BookStore.sql ("\i BookStore.sql"), finall leave the PostgreSQL running before launching the program

2.	If you don’t have MongoDB on your device, download and install, have it running before launching the program. https://www.mongodb.com/download-center/community

3.	Open the terminal/powershell/shell on your device, set the directory to /Proj, run “npm init”, and then “node server.js”, if there is no error message, then you are good to go.


The “customer” entity in the database contains two kinds of accounts, one is the admin account, the ‘admin’ attribute has a value of ‘true’ for admin accounts. The other one is the customer account, the ‘admin’ attribute of customer accounts has a value of ‘null’. Logging in to the admin account will enter the admin management page, logging into the customer account will enter the shopping page. 
