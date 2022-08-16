const session = require('express-session');
const bodyParser = require('body-parser')
const express = require('express');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
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

server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: true }))

server.use(session({
    resave: false,            
    saveUninitialized: false,
    secret: 'keyboard cat'
}));

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
    console.log("Insegnamenti/Programmi/Docenti inserted.\n" +
                "Database ready.");
    //show_rows();
}

//function show_rows() {
//    //"SELECT CDS.id AS 'Codice CDS', Insegnamenti.* FROM CDS, Programmi, Insegnamenti where CDS.id = Programmi.id_corso AND Programmi.id_insegnamento = Insegnamenti.id
//    db.all("select * from Insegnamenti, SSD where Insegnamenti.ssd = ssd.code", (err, rows) => {
//        if (err)
//            console.log(err);
//        else {
//            //console.log(row.name + ": " + row.hired_on);
//            //console.log(rows, rows.length);
//            //console.log("sum is " + sum);
//        }
//    });
//}

server.get('/', (req, res) => {
    db.serialize(() => {
        db.all("SELECT * FROM CDS", (err, rows) => {
            if (err)
                console.log(err);
            else {
                var utente = {}
                if (req.session.utente) {
                    utente.tipo = req.session.utente.tipo
                    utente.id = req.session.utente.id
                }
                res.render('index', {
                    rows: rows,
                    utente: utente
                });
            }
        });
    });
})

server.post("/login", (req, res) => {
    var username, nome, cognome,password;
    try {
        username = req.body.username.trimStart().trimEnd().split('.');
        nome = username[0].toLowerCase()
        cognome = username[1].toLowerCase()
        password = req.body.password.trimStart().trimEnd()
    } catch {
        console.log("Incorrect username");
        res.redirect("/?error=Username+o+password+non+corretta.")
        return;
    }
    temp = nome.charAt(0).toUpperCase()
    nome = temp + nome.substring(1)
    temp = cognome.charAt(0).toUpperCase()
    cognome = temp + cognome.substring(1)
    console.log("input:", nome, cognome, password)
    db.serialize(() => {
        db.get(`SELECT * FROM Docenti WHERE nome = \"${nome}\" AND ` +
                `cognome = \"${cognome}\"`, (err, row) => {
            if (err)
                console.log(err);
            else {
                if (row.nome === nome &&
                        row.cognome === cognome &&
                        bcrypt.compareSync(password, row.password)) {
                    console.log("Accesso verificato")
                    req.session.utente = {
                        tipo : 'docente',
                        id : row.id
                    }
                } else {
                    console.log("Accesso Negato");
                }
            }
            res.redirect('/')
        });
    });

})

server.get('/manifesto/:id_cds', (req, res) => {
    var id_corso = req.params.id_cds
    db.serialize(() => {
        db.all(`SELECT P.id_insegnamento, P.anno, P.scelta, I.nome AS nome_insegnamento, I.cfu, I.path_scheda_trasparenza, I.ssd, I.id_docente, D.nome AS nome_docente, D.cognome AS cognome_docente FROM Programmi as P, Insegnamenti as I, ` +
                `Docenti as D WHERE P.id_corso = ${id_corso} AND ` +
                `P.id_insegnamento = I.id AND ` +
                `I.id_docente = D.id`, (err, rows) => {
            if (err) {
                console.log(err)
                res.redirect("/?error=cds+inesistente")
            } else {
                console.log(rows)
                if (req.session.utente) {
                    res.render('manifesto', {
                        rows: rows,
                        utente: req.session.utente
                    })
                } else {
                    res.render('manifesto', {
                        rows: rows
                    })
                }
            }
        })
    })
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
