const session = require('express-session');
const bodyParser = require('body-parser')
const express = require('express');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const helpers = require('./js/helpers');

const path_db = "./data/db.sqlite";
const path_create_tables = "./data/sql/create_tables.sql";
const path_insert_ssd = "./data/sql/insert_ssd.sql";
const path_insert_all = "./data/sql/insert_all.sql";

const web_port = process.env.PORT || 1337;

const db = new sqlite3.Database(path_db, initiate_db);
const lista_materie_ssd = JSON.parse(fs.readFileSync("./data/materie_ssd.json"))
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
        insert_all();
    });
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
                var utente = null
                if (req.session.utente) {
                    utente = req.session.utente
                }
                res.render('index', {
                    rows: rows,
                    utente: utente,
                    path: '/',
                    depth: 0
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
        res.redirect('/');
    } else {
        res.redirect('/' + get_error_parm("Prima fai il login"))
    }
})

server.get('/portale', (req, res) => {
    if (typeof req.session.utente === 'undefined') {
        res.redirect('/' + get_error_parm("Effettua prima il login"))
        return
    }
    if (req.session.utente) {
        switch (req.session.utente.tipo) {
            case 'docente':
                var id_docente = req.session.utente.id
                    db.serialize(() => {
                        db.all(`SELECT P.id_insegnamento, P.anno, P.scelta, I.nome AS nome_insegnamento, I.cfu, I.path_scheda_trasparenza, I.ssd, I.id_docente, D.nome AS nome_docente, D.cognome AS cognome_docente, C.tipo AS tipo_cds FROM CDS as C, Programmi as P, Insegnamenti as I, ` +
                                `Docenti as D WHERE ` +
                                `P.id_insegnamento = I.id AND ` +
                                `I.id_docente = D.id AND ` +
                                `P.id_corso = C.id AND D.id = ${id_docente}`, (err, rows) => {
                            if (err) {
                                console.log(err)
                                res.redirect('/' + get_error_parm("errore: 5432"))
                            } else {
                                if (rows.length == 0) {
                                    res.redirect('/portale' + get_error_parm(`Non esistono insegnamenti`))
                                    return
                                }
                                res.render('docente', {
                                    rows: rows,
                                    utente: req.session.utente,
                                    path: '/portale',
                                    depth : 1
                                })
                            }
                        })
                    })
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
                res.redirect("admin/admin_page")
                break
            default:
                res.redirect('/' + get_error_parm("tipo utente non identificato"))
        }
    } else {
        res.redirect('/' + get_error_parm("Effettuare prima il login"))
    }
})

server.get("/admin/elimina_cds", (req, res) => {
    if (typeof req.session.utente === 'undefined') {
        res.redirect('/' + get_error_parm("Effettua prima il login"))
        return
    }
    if (req.session.utente.tipo !== 'admin') {
        res.redirect('/' + get_error_parm("Pagina riservata all'amministratore"))
        return
    }
    res.render('admin/elimina_cds', {
        rows: null,
        utente: req.session.utente,
        path: '/admin/elimina_cds',
        depth: 2
    });
})

server.post("/admin/elimina_cds", (req, res) => {
    if (typeof req.session.utente === 'undefined') {
        res.redirect('/' + get_error_parm("Effettua prima il login"))
        return
    }
    if (req.session.utente.tipo !== 'admin') {
        res.redirect('/' + get_error_parm("Pagina riservata all'amministratore"))
        return
    }
    var id_cds = req.body.id_cds.trimEnd().trimStart()
    console.log(id_cds)
    if (id_cds !== "") {
        db.serialize(() => {
            db.run(`DELETE FROM CDS WHERE id = ${id_cds};`, (err, row) => {
                if (err) {
                    console.log(err)
                } else {
                    db.run(`DELETE Programmi WHERE id = ${id_cds};`, (err, row) => {
                        if (err) {
                            console.log(err)
                        }
                    })
                }
            })
        })
    } else {
        res.redirect("/admin/elimina_cds" + get_error_parm("Inserire un codice"))
    }
})

server.post("/admin/crea_modifica_cds", (req, res) => {
    if (typeof req.session.utente === 'undefined') {
        res.redirect('/' + get_error_parm("Effettua prima il login"))
        return
    }
    if (req.session.utente.tipo !== 'admin') {
        res.redirect('/' + get_error_parm("Pagina riservata all'amministratore"))
        return
    }
    var id_cds = req.body.id_cds
    var nome_cds = req.body.nome_cds
    var tipo_cds = req.body.tipo_cds
    var materie = []
    for (i = 0; ; i++) {
        if (req.body['id_' + i] !== 'undefined') {
            scelta = req.body['scelta_' + i]
            if (scelta.toUpperCase() === 'SI') {
                scelta = true
            } else {
                scelta = false
            }
            materie.push({
                id: req.body['id_' + i],
                nome: req.body['nome_' + i],
                ssd: req.body['ssd_' + i],
                cfu: req.body['cfu_' + i],
                anno: req.body['anno_' + i],
                scelta: scelta
            })
        }
    }
    db.serialize(() => {
        db.get(`select id from CDS where id = ${id_cds}`, (err, row) => {
            if (err) {
                console.log(err)
            } else {
                if (row.id == id_cds) {
                    // MODIFICA CDS
                    db.all(`SELECT P.id, P.anno, P.scelta, I.nome` +
                        `, I.cfu, I.ssd, C.tipo AS tipo_cds,` +
                        `C.id AS id_cds, C.nome AS nome_cds FROM CDS as C, Programmi as P, Insegnamenti AS I ` +
                        `WHERE P.id_insegnamento = I.id AND ` +
                        `P.id_corso = C.id AND C.id = ${id_cds}`, (err, rows) => {
                            if (err) {
                                console.log(err)
                            } else {
                                var sql = 'UPDATE CDS SET'
                                if (rows[0].nome_cds !== nome_cds) {
                                    sql += ` nome = ${nome_cds} `
                                }
                                if (rows[0].tipo_cds !== tipo_cds) {
                                    if (sql !== 'UPDATE CDS SET') sql += ','
                                    sql += ` tipo = ${tipo_cds} `
                                }
                                if (sql !== 'UPDATE CDS SET') {
                                    sql += `where id = ${id_cds}`
                                } else {
                                    sql = null
                                }
                                db.get(sql, (err, row) => {
                                    if (err) {
                                        console.log(err)
                                    }
                                })
                                var sql1
                                var sql2
                                rows.forEach(row => {
                                    sql1 = 'UPDATE Insegnamenti SET'
                                    sql2 = 'UPDATE Programmi SET'
                                    materie.forEach((materia_input, i) => {
                                        if (materia_input.id === row.id.toString()) {
                                            if (materia_input.nome !== row.nome.toString()) {
                                                sql1 += `nome = ${materia_input.nome}`
                                            }
                                            if (materia_input.ssd !== row.ssd.toString()) {
                                                if (sql1 !== 'UPDATE Insegnamenti SET') sql1 += ','
                                                sql1 += `ssd = ${materia_input.ssd}`
                                            }
                                            if (materia_input.cfu !== row.cfu.toString()) {
                                                if (sql1 !== 'UPDATE Insegnamenti SET') sql1 += ','
                                                sql1 += `cfu = ${materia_input.cfu}`
                                            }
                                            if (materia_input.scelta !== row.scelta.toString()) {
                                                sql2 += `scelta = ${materia_input.scelta}`
                                            }
                                            if (materia_input.anno !== row.anno.toString()) {
                                                if (sql2 !== 'UPDATE Programmi SET') sql2 += ','
                                                sql2 += `anno = ${materia_input.anno}`
                                            }
                                            if (sql1 !== 'UPDATE Insegnamenti SET') {
                                                sql1 += `where id = ${materia_input.id}`
                                            }
                                            if (sql2 !== 'UPDATE Programmi SET') {
                                                sql2 += `where id_insegnamento = ${materia_input.id}`
                                            }
                                            materie[i] = null
                                        }
                                    })
                                    if (sql1 !== 'UPDATE Insegnamenti SET') {
                                        db.get(sql1, (err, row) => {
                                            if (err) {
                                                console.log(err)
                                            }
                                        })
                                    }
                                    if (sql2 !== 'UPDATE Programmi SET') {
                                        db.get(sql2, (err, row) => {
                                            if (err) {
                                                console.log(err)
                                            }
                                        })
                                    }
                                })
                            }
                        })
                } else {
                    // CREA CDS
                    var sql = `INSERT INTO CDS (id, nome, tipo) VALUES(${id_cds}, \"${nome_cds}\", \"${tipo_cds}\")`
                    db.get(sql2, (err, row) => {
                        if (err) {
                            console.log(err)
                        }
                    })
                }
                // insert all remaining elements from materie
                var sql = ""
                materie.forEach(element => {
                    sql += `INSERT INTO Insegnamenti (id, nome, cfu, ssd) VALUES (${element.id}, \"${element.nome}\", ${element.cfu}, \"${element.ssd}\";\n`;
                    sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (${id_corso}, ${element.id}, ${element.scelta}, ${element.anno});\n`;
                })
                db.exec(sql, (err, row) => {
                    if (err) {
                        console.log(err)
                    }
                })
            }
        })
    })
})

server.get("/admin/crea_modifica_cds", (req, res) => {
    if (typeof req.session.utente === 'undefined') {
        res.redirect('/' + get_error_parm("Effettua prima il login"))
        return
    }
    if (req.session.utente.tipo !== 'admin') {
        res.redirect('/' + get_error_parm("Pagina riservata all'amministratore"))
        return
    }
    db.serialize(() => {
        db.all(`SELECT P.id_insegnamento, P.anno, P.scelta, I.nome AS nome_insegnamento, I.cfu, I.path_scheda_trasparenza, I.ssd, C.tipo AS tipo_cds, C.nome AS nome_cds, C.id AS id_cds FROM CDS as C, Programmi as P, Insegnamenti as I ` +
                `WHERE P.id_insegnamento = I.id AND ` +
                `P.id_corso = C.id`, (err, rows) => {
                if (err) {
                    console.log(err)
                    res.redirect('/admin/crea_modifica_cds' + get_error_parm("errore: 5342"))
                } else {
                    res.render('admin/crea_modifica_cds', {
                        rows: rows,
                        utente: req.session.utente,
                        path: '/admin/crea_modifica_cds',
                        depth: 2,
                        lista_materie_ssd: lista_materie_ssd
                    })
                }
            })
    })

})

server.get("/admin/admin_page", (req, res) => {
    if (typeof req.session.utente === 'undefined') {
        res.redirect('/' + get_error_parm("Effettua prima il login"))
        return
    }
    if (req.session.utente.tipo !== 'admin') {
        res.redirect('/' + get_error_parm("Pagina riservata all'amministratore"))
        return
    }
    res.render('admin/admin_page', {
        rows: null,
        utente: req.session.utente,
        path: '/admin/admin_page',
        depth: 2
    })
})

server.post("/login", (req, res) => {
    var username, nome, cognome, password;
    if (req.body.username === 'admin' &&
        req.body.password === '1234') {
        req.session.utente = {
            tipo: 'admin',
            nome: 'admin',
            cognome: 'server'
        }
        res.redirect('admin/admin_page')
        return
    }
    try {
        username = req.body.username.trimStart().trimEnd().split('.');
        nome = username[0].toUpperCase()
        cognome = username[1].toUpperCase()
        password = req.body.password.trimStart().trimEnd()
    } catch {
        console.log("Incorrect username");
        res.redirect("/" + get_error_parm("Username o password non corretta."))
        return;
    }
    console.log("input:", nome, cognome, password)
    db.serialize(() => {
        db.get(`SELECT * FROM Docenti WHERE nome = \"${nome}\" AND ` +
                `cognome = \"${cognome}\"`, (err, row) => {
            if (err)
                console.log(err);
            else {
                if (typeof row === 'undefined') {
                    console.log("Incorrect username");
                    res.redirect("/" + get_error_parm("Username o password non corretta."))
                    return;
                }
                if (row.nome === nome &&
                        row.cognome === cognome &&
                        bcrypt.compareSync(password, row.password)) {
                    console.log("Accesso verificato")
                    req.session.utente = {
                        tipo : 'docente',
                        id : row.id,
                        nome : nome,
                        cognome : cognome
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
                `Docenti as D WHERE (P.id_corso = ${id_corso} AND ` +
                `P.id_insegnamento = I.id AND ` +
                `I.id_docente = D.id AND ` +
                `P.id_corso = C.id)` , (err, rows) => {
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

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/');
    },

    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + req.body.codice + path.extname(file.originalname));
    }
});

server.post('/upload', (req, res) => {
    let upload = multer({ storage: storage, fileFilter: helpers.pdfFilter }).single('scheda_trasparenza');

    upload(req, res, function(err) {
        // req.file contains information of uploaded file
        // req.body contains information of text fields, if there were any

        if (req.fileValidationError) {
            return res.send(req.fileValidationError);
        }
        else if (!req.file) {
            return res.send('Seleziona un PDF da caricare.');
        }
        else if (err instanceof multer.MulterError) {
            return res.send(err);
        }
        else if (err) {
            return res.send(err);
        }

        console.log(`PDF CARICATO`);
        res.redirect('portale');
    });
});

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

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('>>', str => {
    print_query(str)
    readline.close();
});