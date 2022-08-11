const express = require('express');
const sqlite3 = require('sqlite3');
const fs = require('fs');

const path_db = "./data/db.sqlite";
const path_init_db = "./data/init_db2.sql";
const web_port = process.env.PORT || 1337;

const db = new sqlite3.Database(path_db, initiate_db);
const app = express();

app.set('view engine', 'ejs');

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
    db.all("SELECT CDS.id AS 'Codice CDS', Insegnamenti.nome FROM CDS, Programmi, Insegnamenti where CDS.id = Programmi.id_corso AND Programmi.id_insegnamento = Insegnamenti.id", (err, rows) => {
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

app.get('/', (req, res) => {
    db.serialize(() => {
        db.all("SELECT * FROM CDS", (err, rows) => {
            if (err)
                console.log(err);
            else {
                console.log(rows[0]);
                res.render('index', {rows: rows});
            }
        });
    });
})

app.listen(web_port, () => {
    console.log(`web app is listeing to port: ${web_port}.`)
})

process.on('SIGTERM', () => {
    // closing the web app
    app.close(() => {
        console.log('web app terminated.');
    });
    db.close(() => {
        console.log('database terminated.');
    });
});
