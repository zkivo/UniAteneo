const express = require('express');
const sql_js = require('sql.js');
const fs = require('fs');

const path_db = "./data/db.sqlite";
const path_init_db = "./data/init_db.sql";
const web_port = process.env.PORT || 1337;

const server = express();

// create the database if it doesn't exist
if (!fs.existsSync(path_db)) {
    const sql_string = fs.readFileSync(path_init_db, { encoding: 'utf8', flag: 'r' });
    sql_js().then(function (SQL) {
        const db = new SQL.Database();
        db.exec(sql_string);
        fs.writeFileSync(path_db, Buffer.from(db.export()));
        console.log("The SQLite database has been initiated and stored in '" +
                    path_db + 
                    "'.")
        db.close();
    });
}

server.get('/', (req, res) => {
    res.send('Hello World!')
})

server.listen(web_port, () => {
    console.log(`web server is listeing to port: ${web_port}.`)
})

//process.on('SIGTERM', () => {
//    // closing the web server
//    server.close(() => {
//        console.log('web server terminated.');
//    });
//});
