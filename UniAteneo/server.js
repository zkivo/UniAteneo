const express = require('express');
const sqlite3 = require('sqlite3');
const fs = require('fs');

const path_db = "./data/db.sqlite";
const path_init_db = "./data/init_db2.sql";
const web_port = process.env.PORT || 1337;

const db = new sqlite3.Database(path_db, initiate_db);
const server = express();

function initiate_db() {
    // initiate db if empty
    const sql_string = fs.readFileSync(path_init_db, { encoding: 'utf8', flag: 'r' });
    db.exec(sql_string, (err, row) => {
        if (err) {
            if (err.errno != 19) {
                console.log(err);
                return;
            }
        }
        console.log("The SQLite database has been initiated in '" +
            path_db +
            "'.");
        show_rows();
    });
}

function show_rows() {
    db.all("SELECT * FROM CDS;", (err, rows) => {
        if (err)
            console.log(err);
        else {
            //console.log(row.name + ": " + row.hired_on);
            //console.log("row: " + row);
            rows.forEach(function (row) {
                console.log(row);
            });
        }
    });
}

server.get('/', (req, res) => {
    res.send('Hello World!')
})

server.listen(web_port, () => {
    console.log(`web server is listeing to port: ${web_port}.`)
})

process.on('SIGTERM', () => {
    // closing the web server
    server.close(() => {
        console.log('web server terminated.');
    });
    db.close(() => {
        console.log('database terminated.');
    });
});
