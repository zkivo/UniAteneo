if (process.env.NODE_END !== 'production') {
    require('dotenv').config()
}
 
const express = require('express');
const sqlite3 = require('sqlite3');
const fs = require('fs');
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')

const users = [ {id: 1, username: 'Rob@w', password: 'ok'}]

const initializePassport = require('./passport-config')
initializePassport(
    passport, 
    username => users.find(user => user.username === username),
    id => users.find(user => user.id === id)
)


const path_db = "./data/db.sqlite";
const path_init_db = "./data/init_db2.sql";
const web_port = process.env.PORT || 1337;

const db = new sqlite3.Database(path_db, initiate_db);
const server = express();


server.set('view engine', 'ejs');
server.use(express.static('public'))
server.use(express.urlencoded({ extended: false}))
server.use(flash())
server.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
server.use(passport.session())

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
    db.all("SELECT CDS.id AS 'Codice CDS', Insegnamenti.* FROM CDS, Programmi, Insegnamenti where CDS.id = Programmi.id_corso AND Programmi.id_insegnamento = Insegnamenti.id", (err, rows) => {
        if (err)
            console.log(err);
        else {
            //console.log(row.name + ": " + row.hired_on);
            console.log(rows);
            var sum = 0;
            rows.forEach(function (row) {
                sum += row.cfu;
            });
            console.log("sum is " + sum);
        }
    });
}

server.get('/', (req, res) => {
    db.serialize(() => {
        db.all("SELECT * FROM CDS", (err, rows) => {
            if (err)
                console.log(err);
            else {
                console.log(rows[0]);
                res.render('index.ejs', {rows: rows});
            }
        });
    });
})

//server.get('/login', (req, res) => {
//    res.render('login.ejs')
//})

server.post('/', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/',
    failureFlash: true
}))


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
