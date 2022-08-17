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
}

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
                } else {
                    utente = null
                }
                res.render('index', {
                    rows: rows,
                    utente: utente,
                    path: '/',
                    depth : 0
                });
            }
        });
    });
})

function get_error_parm(error_string) {
    return '?error=' + error_string.split(' ').join('+')
}

server.get("/logout", (req, res) => {
    if (req.session.utente) {
        req.session.utente = null
        if (req.query.callback) {
            res.redirect(req.query.callback)
        } else {
            res.redirect('/' + get_error_parm("no callback param"))
        }
    } else {
        res.redirect('/' + get_error_parm("Prima fai il login"))
    }
})

server.get('/portale', (req, res) => {
    if (req.session.utente) {
        switch (req.session.utente.tipo) {
            case 'docente':
                res.render('docente', {
                    rows: null,
                    utente: req.session.utente,
                    path: '/portale',
                    depth: 1
                });
                break
            case 'studente':
                res.render('studente', {
                    rows: null,
                    utente: req.session.utente,
                    path: '/portale',
                    depth: 1
                });
                break
            case 'admin':
                res.render('admin', {
                    rows: null,
                    utente: req.session.utente,
                    path: '/portale',
                    depth: 1
                });
                break
            default:
                res.redirect('/' + get_error_parm("tipo utente non identificato"))
        }
    } else {
        res.redirect('/' + get_error_parm("Effettuare prima il login"))
    }
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
        res.redirect("/" + get_error_parm("Username o password non corretta."))
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
            if (req.query.callback) {
                res.redirect(req.query.callback)
            } else {
                res.redirect('/' + get_error_parm("no callback param"))
            }
        });
    });

})

server.get('/manifesto/:id_cds', (req, res) => {
    var id_corso = req.params.id_cds
    db.serialize(() => {
        db.all(`SELECT P.id_insegnamento, P.anno, P.scelta, I.nome AS nome_insegnamento, I.cfu, I.path_scheda_trasparenza, I.ssd, I.id_docente, D.nome AS nome_docente, D.cognome AS cognome_docente, C.tipo AS tipo_cds FROM CDS as C, Programmi as P, Insegnamenti as I, ` +
                `Docenti as D WHERE P.id_corso = ${id_corso} AND ` +
                `P.id_insegnamento = I.id AND ` +
                `I.id_docente = D.id AND ` +
                `P.id_corso = C.id`, (err, rows) => {
            if (err) {
                console.log(err)
                res.redirect('/' + get_error_parm("errore: 2345"))
            } else {
                if (rows.length == 0) {
                    res.redirect('/' + get_error_parm(`id corso: ${id_corso} inesistente`))
                    return
                }
                console.log(rows)
                if (req.session.utente) {
                    res.render('manifesto', {
                        rows: rows,
                        utente: req.session.utente,
                        path: '/manifesto/' + id_corso,
                        depth : 2
                    })
                } else {
                    res.render('manifesto', {
                        rows: rows,
                        utente: null,
                        path: '/manifesto/' + id_corso,
                        depth: 2
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

function print_query(query) {
    db.all(query, (err, rows) => {
        if (err)
            console.log(err);
        else {
            console.log(rows);
        }
    });
}
