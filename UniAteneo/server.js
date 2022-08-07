const sqljs = require('sql.js');
const http = require('http');
const fs = require('fs');

const filebuffer = fs.readFileSync('./data/db.sqlite');

const web_port = process.env.PORT || 1337;

sqljs().then(function (SQL) {
    // Load the db
    const db = new SQL.Database(filebuffer);
});

const server = http.createServer(function (req, res) {
    res.writeHead(200);
    res.end('Hello, World!');
});

server.listen(web_port);


process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Process terminated');
    });
});
