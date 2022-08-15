const express = require('express');
const sqlite3 = require('sqlite3');
const fs = require('fs');

const path_db = "./data/db.sqlite";
const path_create_tables = "./data/sql/create_tables.sql";
const path_insert_cds = "./data/sql/insert_cds.sql";
const path_insert_ssd = "./data/sql/insert_ssd.sql";
const path_insert_all = "./data/sql/insert_all.sql";

const web_port = process.env.PORT || 1337;

const db = new sqlite3.Database(path_db, initiate_db);
const server = express();

server.use(express.static('public'))
server.set('view engine', 'ejs');

function initiate_db() {
    // initiate db if empty
    var sql = fs.readFileSync(path_create_tables, { encoding: 'utf8', flag: 'r' });
    db.exec(sql, (err, row) => {
        if (err) {
            if (err.errno != 19) {
                console.log(err);
                return;
            }
        }
        console.log("The SQLite database created the tables.");
        insert_ssd();
    });
}

function insert_ssd() {
    var sql = fs.readFileSync(path_insert_ssd, { encoding: 'utf8', flag: 'r' });
    db.exec(sql, (err, row) => {
        if (err) {
            if (err.errno != 19) {
                console.log(err);
                return;
            }
        }
        console.log("SSDs inserted.");
        insert_cds();
    });
}

function insert_cds() {
    var sql = fs.readFileSync(path_insert_cds, { encoding: 'utf8', flag: 'r' });
    sql = sql.split(';');
    sql.forEach(element => {
        if (!element.includes('INSERT')) return;
        db.run(element, (err, row) => {
            if (err) {
                if (err.errno != 19) {
                    console.log(err);
                    return;
                }
            }
        });
    })
    console.log("CDSs inserted.");
    insert_all();
}

function insert_all() {
    var sql = fs.readFileSync(path_insert_all, { encoding: 'utf8', flag: 'r' });
    sql = sql.split(';');
    sql.forEach(element => {
        if (!element.includes('INSERT')) return;
        db.run(element, (err, row) => {
            if (err) {
                if (err.errno != 19) {
                    console.log(err);
                    return;
                }
            }
        });
    })
    console.log("Insegnamenti/Programmi/Docenti inserted.");
    show_rows();
}

function show_rows() {
    //"SELECT CDS.id AS 'Codice CDS', Insegnamenti.* FROM CDS, Programmi, Insegnamenti where CDS.id = Programmi.id_corso AND Programmi.id_insegnamento = Insegnamenti.id
    db.all("select * from Insegnamenti, SSD where Insegnamenti.ssd = ssd.code", (err, rows) => {
        if (err)
            console.log(err);
        else {
            //console.log(row.name + ": " + row.hired_on);
            console.log(rows, rows.length);
            //console.log("sum is " + sum);
        }
    });
}

server.get('/', (req, res) => {
    db.serialize(() => {
        db.all("SELECT * FROM CDS", (err, rows) => {
            if (err)
                console.log(err);
            else {
                console.log(rows);
                res.render('index', {rows: rows});
            }
        });
    });
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
