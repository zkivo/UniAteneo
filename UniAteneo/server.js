const sql_js = require('sql.js');
const http = require('http');
const fs = require('fs');

const path_db = "./data/db.sqlite";
const path_init_db = "./data/init_db.sql";
const web_port = process.env.PORT || 1337;

//const SQL = await sql_js.Database;
//var db;

try {
    // create the database
    if (fs.existsSync(path_db)) {
        console.log("asd");
        const file_buffer = fs.readFileSync(path_db);
        //sql_js().then(function (SQL) {
        //    // load the db
        //    db = new SQL.Database(file_buffer);
        //});
    } else {
        const sql_string = fs.readFileSync(path_init_db, { encoding: 'utf8', flag: 'r' });
        //sql_js().then(function (SQL) {
        //    // load the db
        //    db = new SQL.Database();
        //});
        db = new sql_js.Database();
        db.exec(sql_string);
    }
} catch (err) {
    console.log(err);
}

// create the web server
const server = http.createServer(function (req, res) {
    res.writeHead(200);
    res.end('Hello, World!');
});
server.listen(web_port);

process.on('SIGTERM', () => {
    // closing the web server
    server.close(() => {
        console.log('web server terminated');
    });
    // exporting the database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(path_db, buffer);
    db.close();
});
