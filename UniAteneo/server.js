const session = require('express-session');
const bodyParser = require('body-parser')
const express = require('express');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const helpers = require('./js/helpers');
const { basename } = require('path');

const path_db = "./data/db.sqlite";
const path_create_tables = "./data/sql/create_tables.sql";
const path_insert_ssd = "./data/sql/insert_ssd.sql";
const path_insert_all = "./data/sql/insert_all.sql";

const web_port = process.env.PORT || 1337;

const db = new sqlite3.Database(path_db, initiate_db);
const lista_materie_ssd = JSON.parse(fs.readFileSync("./data/materie_ssd.json"))
const server = express();

function assert_you_are_admin(req, res) {
    if (typeof req.session.utente === 'undefined') {
        res.redirect('/' + get_error_parm("Effettua prima il login"))
        return false
    }
    if (req.session.utente.tipo !== 'admin') {
        res.redirect('/' + get_error_parm("Pagina riservata all amministratore"))
        return false
    }
    return true
}

function solo_unici(value, index, self) {
    return self.indexOf(value) === index;
}

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

function get_text_parm(str) {
    return '?text=' + str.split(' ').join('+')
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
    if (!assert_you_are_admin(req, res)) return
    res.render('admin/elimina_cds', {
        rows: null,
        utente: req.session.utente,
        path: '/admin/elimina_cds',
        depth: 2
    });
})

server.post("/admin/elimina_cds", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    var id_cds = req.body.id_cds.trimEnd().trimStart()
    if (id_cds !== "") {
        num = parseInt(id_cds, 10);
        if (isNaN(num)) {
            res.redirect("/admin/elimina_cds" + get_error_parm("Nessun corso con id: " + id_cds))
            return
        }
        id_cds = num
        db.serialize(() => {
            db.get(`select COUNT(id) from CDS where id = ${id_cds};`, (err, row) => {
                if (row['COUNT(id)'] < 1) {
                    res.redirect("/admin/elimina_cds" + get_error_parm("Nessun corso con id: " + id_cds))
                    return
                }
                db.get(`DELETE FROM CDS WHERE id = ${id_cds};`, (err, row) => {
                    if (err) {
                        console.log(err)
                    } else {
                        db.get(`DELETE FROM Programmi WHERE id_corso = ${id_cds};`, (err, row) => {
                            if (err) {
                                console.log(err)
                            } else {
                                res.redirect("/admin/elimina_cds" + get_text_parm("Corso eliminato con successo"))
                            }
                        })
                    }
                })

            })
        })
    } else {
        res.redirect("/admin/elimina_cds" + get_error_parm("Inserire un codice"))
    }
})

// server.post("/admin/crea_modifica_cds", (req, res) => {
//     if (!assert_you_are_admin(req, res)) return
//     var id_cds = req.body.id_cds
//     var nome_cds = req.body.nome_cds
//     var tipo_cds = req.body.tipo_cds
//     var materie = []
//     for (i = 0; ; i++) {
//         if (req.body['id_' + i] !== 'undefined') {
//             scelta = req.body['scelta_' + i]
//             if (scelta.toUpperCase() === 'SI') {
//                 scelta = true
//             } else {
//                 scelta = false
//             }
//             materie.push({
//                 id: req.body['id_' + i],
//                 nome: req.body['nome_' + i],
//                 ssd: req.body['ssd_' + i],
//                 cfu: req.body['cfu_' + i],
//                 anno: req.body['anno_' + i],
//                 scelta: scelta
//             })
//         }
//     }
//     db.serialize(() => {
//         db.get(`select id from CDS where id = ${id_cds}`, (err, row) => {
//             if (err) {
//                 console.log(err)
//             } else {
//                 if (row.id == id_cds) {
//                     // MODIFICA CDS
//                     db.all(`SELECT P.id, P.anno, P.scelta, I.nome` +
//                            `, I.cfu, I.ssd, C.tipo AS tipo_cds,` +
//                            `C.id AS id_cds, C.nome AS nome_cds FROM CDS as C, Programmi as P, Insegnamenti AS I ` +
//                            `WHERE P.id_insegnamento = I.id AND ` +
//                            `P.id_corso = C.id AND C.id = ${id_cds}`, (err, rows) => {
//                             if (err) {
//                                 console.log(err)
//                             } else {
//                                 var sql = 'UPDATE CDS SET'
//                                 if (rows[0].nome_cds !== nome_cds) {
//                                     sql += ` nome = ${nome_cds} `
//                                 }
//                                 if (rows[0].tipo_cds !== tipo_cds) {
//                                     if (sql !== 'UPDATE CDS SET') sql += ','
//                                     sql += ` tipo = ${tipo_cds} `
//                                 }
//                                 if (sql !== 'UPDATE CDS SET') {
//                                     sql += `where id = ${id_cds}`
//                                 } else {
//                                     sql = null
//                                 }
//                                 db.get(sql, (err, row) => {
//                                     if (err) {
//                                         console.log(err)
//                                     }
//                                 })
//                                 var sql1
//                                 var sql2
//                                 rows.forEach(row => {
//                                     sql1 = 'UPDATE Insegnamenti SET'
//                                     sql2 = 'UPDATE Programmi SET'
//                                     materie.forEach((materia_input, i) => {
//                                         if (materia_input.id === row.id.toString()) {
//                                             if (materia_input.nome !== row.nome.toString()) {
//                                                 sql1 += `nome = ${materia_input.nome}`
//                                             }
//                                             if (materia_input.ssd !== row.ssd.toString()) {
//                                                 if (sql1 !== 'UPDATE Insegnamenti SET') sql1 += ','
//                                                 sql1 += `ssd = ${materia_input.ssd}`
//                                             }
//                                             if (materia_input.cfu !== row.cfu.toString()) {
//                                                 if (sql1 !== 'UPDATE Insegnamenti SET') sql1 += ','
//                                                 sql1 += `cfu = ${materia_input.cfu}`
//                                             }
//                                             if (materia_input.scelta !== row.scelta.toString()) {
//                                                 sql2 += `scelta = ${materia_input.scelta}`
//                                             }
//                                             if (materia_input.anno !== row.anno.toString()) {
//                                                 if (sql2 !== 'UPDATE Programmi SET') sql2 += ','
//                                                 sql2 += `anno = ${materia_input.anno}`
//                                             }
//                                             if (sql1 !== 'UPDATE Insegnamenti SET') {
//                                                 sql1 += `where id = ${materia_input.id}`
//                                             }
//                                             if (sql2 !== 'UPDATE Programmi SET') {
//                                                 sql2 += `where id_insegnamento = ${materia_input.id}`
//                                             }
//                                             materie[i] = null
//                                         }
//                                     })
//                                     if (sql1 !== 'UPDATE Insegnamenti SET') {
//                                         db.get(sql1, (err, row) => {
//                                             if (err) {
//                                                 console.log(err)
//                                             }
//                                         })
//                                     }
//                                     if (sql2 !== 'UPDATE Programmi SET') {
//                                         db.get(sql2, (err, row) => {
//                                             if (err) {
//                                                 console.log(err)
//                                             }
//                                         })
//                                     }
//                                 })
//                             }
//                         })
//                 } else {
//                     // CREA CDS
//                     var sql = `INSERT INTO CDS (id, nome, tipo) VALUES(${id_cds}, \"${nome_cds}\", \"${tipo_cds}\")`
//                     db.get(sql2, (err, row) => {
//                         if (err) {
//                             console.log(err)
//                         }
//                     })
//                 }
//                 // insert all remaining elements from materie
//                 var sql = ""
//                 materie.forEach(element => {
//                     sql += `INSERT INTO Insegnamenti (id, nome, cfu, ssd) VALUES (${element.id}, \"${element.nome}\", ${element.cfu}, \"${element.ssd}\";\n`;
//                     sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (${id_corso}, ${element.id}, ${element.scelta}, ${element.anno});\n`;
//                 })
//                 db.exec(sql, (err, row) => {
//                     if (err) {
//                         console.log(err)
//                     }
//                 })
//             }
//         })
//     })
// })

// server.get("/admin/crea_modifica_cds", (req, res) => {
//     if (!assert_you_are_admin(req, res)) return
//     db.serialize(() => {
//         db.all('Select * from CDS', (err, rows) => {
//                 if (err) {
//                     console.log(err)
//                     res.redirect('/admin/crea_modifica_cds' + get_error_parm("errore: 5342"))
//                 } else {
//                     db.all(`SELECT P.id_insegnamento, P.anno, P.scelta, I.nome AS nome_insegnamento, I.cfu, I.path_scheda_trasparenza, I.ssd, I.id_docente, D.nome AS nome_docente, D.cognome AS cognome_docente, C.tipo AS tipo_cds, C.id AS id_cds FROM CDS as C, Programmi as P, Insegnamenti as I, ` +
//                             `Docenti as D WHERE ` +
//                             `P.id_insegnamento = I.id AND ` +
//                             `I.id_docente = D.id AND ` +
//                             `P.id_corso = C.id`, (err, rows2) => {
//                         if (err) {
//                             console.log(err)
//                             res.redirect('/admin/crea_modifica_cds' + get_error_parm("errore: 3345"))
//                         } else {
//                             res.render('admin/crea_modifica_cds', {
//                                 lista_cds: rows,
//                                 lista_materie: rows2,
//                                 utente: req.session.utente,
//                                 path: '/admin/crea_modifica_cds',
//                                 depth: 2,
//                                 lista_materie_ssd: lista_materie_ssd
//                             })
//                         }
//                     })
//             }
//         })
//     })

// })

server.post("/admin/modifica_cds", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    var pallina = {}
    var id_cds = req.body.id_cds.trimEnd().trimStart()
    pallina['id_cds'] = id_cds
    var nome_cds = req.body.nome_cds.trimEnd().trimStart()
    pallina['nome_cds'] = nome_cds
    var tipo_cds = req.body.tipo_cds.trimEnd().trimStart()
    pallina['tipo_cds'] = tipo_cds
    var tot_righe = req.body.tot_righe.trimEnd().trimStart()
    pallina['tot_righe'] = tot_righe
    var materie = []
    for (i = 0; i < parseInt(tot_righe, 10); i++) {
        var nome = req.body['nome_' + i]
        if (typeof nome === 'undefined') {
            continue
        }
        var id = req.body['id_' + i]
        var ssd = req.body['ssd_' + i]
        var cfu = req.body['cfu_' + i]
        var anno = req.body['anno_' + i]
        var scelta = req.body['scelta_' + i]
        materie.push({
            nome: nome.trimEnd().trimStart(),
            id  : (typeof id !== 'undefined' ? id.trimEnd().trimStart() : ""),
            ssd : (typeof ssd !== 'undefined' ? ssd.trimEnd().trimStart() : ""),
            cfu : (typeof cfu !== 'undefined' ? cfu.trimEnd().trimStart() : ""),
            anno : (typeof anno !== 'undefined' ? anno.trimEnd().trimStart() : ""),
            scelta : (typeof scelta !== 'undefined' ? scelta.trimEnd().trimStart() : "")
        })
    }
    pallina.materie = materie
    // console.log(pallina)
    var needed_cfu
    var max_anno
    if (tipo_cds === 'LT') {
        needed_cfu = 180
        max_anno = 3
    } else if (tipo_cds === 'LM') {
        needed_cfu = 120
        max_anno = 2
    } else if (tipo_cds === 'LMC') {
        needed_cfu = 300
        max_anno = 5
    }
 /* ****************************************** */
 /* ************* pallina filled ****************** */
 /* ****************************************** */
    db.all('select I.* from Programmi as P, Insegnamenti as I ' +
            'where P.id_insegnamento = I.id and P.scelta = false and ' +
            'I.nome <> "Tirocinio" and ' + 
            'I.nome <> "Prova finale" and ' + 
            'I.nome <> "Tesi"', (err, materie_attive) => {
        if (err) {
            console.log(err)
            return
        }
        db.all('select * from CDS', (err, lista_cds) => {
            if (err) {
                console.log(err)
                return
            }
            // controllare che gli anni non superino max_anno 
            var flag = false
            materie.forEach((materia, index) => {
                if (flag) return
                if (parseInt(materia.anno, 10) > max_anno) {
                    flag = true
                    return
                }
            })
            if (flag) {
                pallina.error = "Per questo tipo di leaura l anno massimo è: " + max_anno
                res.render('admin/modifica_cds', {
                    pallina : pallina,
                    materie_attive: materie_attive,
                    lista_cds : lista_cds,
                    utente: req.session.utente,
                    path: '/admin/modifica_cds',
                    depth: 2,
                    lista_materie_ssd: lista_materie_ssd
                })
                return
            }
            // controllare che 
            // tirocinio/tesi/prova finale e materie a scelta
            // siano inseriti correttamente
            nome_materie = materie.map(element => {
                return element.nome.toUpperCase()
            })
            if (!nome_materie.includes('TIROCINIO')) {
                pallina.error = "Il corso di studi deve prevedere un Tirocinio"
                res.render('admin/modifica_cds', {
                    pallina : pallina,
                    materie_attive: materie_attive,
                    lista_cds : lista_cds,
                    utente: req.session.utente,
                    path: '/admin/modifica_cds',
                    depth: 2,
                    lista_materie_ssd: lista_materie_ssd
                })
                return
            }
            flag = false
            materie.forEach(mat => {
                if (flag) return
                if (mat.nome.toUpperCase() === 'TIROCINIO') {
                    if (parseInt(mat.cfu,10) != 3 &&
                            parseInt(mat.cfu,10) != 6) {
                        flag = true
                        pallina.error = "Il Tirocinio deve essere di 3 o 6 CFU"
                        res.render('admin/modifica_cds', {
                            pallina : pallina,
                            materie_attive: materie_attive,
                            lista_cds : lista_cds,
                            utente: req.session.utente,
                            path: '/admin/modifica_cds',
                            depth: 2,
                            lista_materie_ssd: lista_materie_ssd
                        })
                        return
                    }
                }
            })
            if (flag) return
            if (tipo_cds === 'LT') {
                if (!nome_materie.includes('PROVA FINALE')) {
                    pallina.error = "La Triennale deve prevedere la Prova Finale"
                    res.render('admin/modifica_cds', {
                        pallina : pallina,
                        materie_attive: materie_attive,
                        lista_cds : lista_cds,
                        utente: req.session.utente,
                        path: '/admin/modifica_cds',
                        depth: 2,
                        lista_materie_ssd: lista_materie_ssd
                    })
                    return
                } else {
                    flag = false
                    materie.forEach(mat => {
                        if (flag) return
                        if (mat.nome.toUpperCase() === 'PROVA FINALE') {
                            if (parseInt(mat.cfu,10) != 9 &&
                                    parseInt(mat.cfu,10) != 12) {
                                flag = true
                                res.render('admin/modifica_cds', {
                                    pallina : pallina,
                                    materie_attive: materie_attive,
                                    lista_cds : lista_cds,
                                    utente: req.session.utente,
                                    path: '/admin/modifica_cds',
                                    depth: 2,
                                    lista_materie_ssd: lista_materie_ssd
                                })
                                return
                            }
                        }
                    })
                    if (flag) return
                }
            } else {
                if (!nome_materie.includes('TESI')) {
                    pallina.error = "I corsi Magistrali prevedono la Tesi"
                    res.render('admin/modifica_cds', {
                        pallina : pallina,
                        materie_attive: materie_attive,
                        lista_cds : lista_cds,
                        utente: req.session.utente,
                        path: '/admin/modifica_cds',
                        depth: 2,
                        lista_materie_ssd: lista_materie_ssd
                    })
                    return
                } else {
                    flag = false
                    materie.forEach(mat => {
                        if (flag) return
                        if (mat.nome.toUpperCase() === 'TESI') {
                            if (parseInt(mat.cfu,10) != 9 &&
                                    parseInt(mat.cfu,10) != 12) {
                                flag = true
                                res.render('admin/modifica_cds', {
                                    pallina : pallina,
                                    materie_attive: materie_attive,
                                    lista_cds : lista_cds,
                                    utente: req.session.utente,
                                    path: '/admin/modifica_cds',
                                    depth: 2,
                                    lista_materie_ssd: lista_materie_ssd
                                })
                                return
                            }
                        }
                    })
                    if (flag) return
                }
                // **************************************
                //     controllare la correttezza
                //     delle materie a scelta
                // **************************************
                var scelta_1 = {
                    num_trovate : 0,
                    anno : 0,             
                    ssd : "",
                    cfu : 0,
                    materie : []
                }
                var scelta_2 = {
                    num_trovate : 0,
                    anno : 0,
                    ssd : "",
                    cfu : 0,
                    materie : []
                }
                var scelta_3 = {
                    num_trovate : 0,
                    anno : 0,
                    ssd : "",
                    cfu : 0,
                    materie : []
                }
                var flag = false
                materie.forEach(materia => {
                    if (flag) return
                    if (materia.scelta !== 'No') {
                        // controlla che nel campo nome ci sia un numero
                        // e che appartenga ad un insegnamento attivo
                        id = parseInt(materia.nome, 10)
                        if (isNaN(id)) {
                            pallina.error = 'Inserire un codice di Insegnamento per le materie a scelta'
                            flag = true
                            return
                        }
                        // la materia deve esistere nell'ateneo
                        // ed avere ssd corretto
                        var trovato = false
                        var corretto = false
                        materie_attive.forEach(mat => {
                            if (trovato) return
                            if (mat.id == id) {
                                trovato = true
                                if (mat.ssd === materia.ssd) {
                                    corretto = true
                                }
                            }
                        })
                        if (!trovato) {
                            pallina.error = 'Il codice della materia a scelta deve fare riferimento ad un insegnamento attivo nell ateneo'
                            flag = true
                            return
                        }
                        if (!corretto) {
                            pallina.error = 'L SSD della materia a scelta deve essere coerente con il codice scelto'
                            flag = true
                            return
                        }
                        if (materia.anno === '1') {
                            pallina.error = 'Le materie a scelta devono essere erogate dal secondo anno in poi'
                            flag = true
                            return
                        }
                    }
                    if (materia.scelta === 'Primo blocco') {
                        if (scelta_1.num_trovate == 3) {
                            pallina.error = 'Le materie a scelta devono essere massimo 3 per blocco.'
                            flag = true
                            return
                        }
                        if (scelta_1.num_trovate == 0) {
                            scelta_1.ssd = materia.ssd
                            scelta_1.cfu = materia.cfu
                            scelta_1.anno = materia.anno
                            scelta_1.num_trovate++
                            scelta_1.materie.push(materia.nome)
                            return
                        }
                        if (materia.ssd !== scelta_1.ssd) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso ssd per blocco'
                            flag = true
                            return
                        }
                        if (materia.anno !== scelta_1.anno) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso anno per blocco'
                            flag = true
                            return
                        }
                        if (materia.cfu !== scelta_1.cfu) {
                            pallina.error = 'Le materie a scelta devono avere gli stessi CFU per blocco'
                            flag = true
                            return
                        }
                        if (scelta_1.materie.includes(materia.nome)) {
                            pallina.error = 'Le materie a scelta devono essere diverse dentro un blocco'
                            flag = true
                            return
                        }
                        scelta_1.num_trovate++
                        scelta_1.materie.push(materia.nome)
                    } else if (materia.scelta === 'Secondo blocco') {
                        if (scelta_2.num_trovate == 3) {
                            pallina.error = 'Le materie a scelta devono essere massimo 3 per blocco.'
                            flag = true
                            return
                        }
                        if (scelta_2.num_trovate == 0) {
                            scelta_2.ssd = materia.ssd
                            scelta_2.cfu = materia.cfu
                            scelta_2.anno = materia.anno
                            scelta_2.num_trovate++
                            scelta_2.materie.push(materia.nome)
                            return
                        }
                        if (materia.ssd !== scelta_2.ssd) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso ssd per blocco'
                            flag = true
                            return
                        }
                        if (materia.anno !== scelta_2.anno) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso anno per blocco'
                            flag = true
                            return
                        }
                        if (materia.cfu !== scelta_2.cfu) {
                            pallina.error = 'Le materie a scelta devono avere gli stessi CFU per blocco'
                            flag = true
                            return
                        }
                        if (scelta_2.materie.includes(materia.nome)) {
                            pallina.error = 'Le materie a scelta devono essere diverse dentro un blocco'
                            flag = true
                            return
                        }
                        scelta_2.num_trovate++
                        scelta_2.materie.push(materia.nome)
                    } else if (materia.scelta === 'Terzo blocco') {
                        if (scelta_3.num_trovate == 3) {
                            pallina.error = 'Le materie a scelta devono essere massimo 3 per blocco.'
                            flag = true
                            return
                        }
                        if (scelta_3.num_trovate == 0) {
                            scelta_3.ssd = materia.ssd
                            scelta_3.cfu = materia.cfu
                            scelta_3.anno = materia.anno
                            scelta_3.num_trovate++
                            scelta_3.materie.push(materia.nome)
                            return
                        }
                        if (materia.ssd !== scelta_3.ssd) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso ssd per blocco'
                            flag = true
                            return
                        }
                        if (materia.anno !== scelta_3.anno) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso anno per blocco'
                            flag = true
                            return
                        }
                        if (materia.cfu !== scelta_3.cfu) {
                            pallina.error = 'Le materie a scelta devono avere gli stessi CFU per blocco'
                            flag = true
                            return
                        }
                        if (scelta_3.materie.includes(materia.nome)) {
                            pallina.error = 'Le materie a scelta devono essere diverse dentro un blocco'
                            flag = true
                            return
                        }
                        scelta_3.num_trovate++
                        scelta_3.materie.push(materia.nome)
                    }
                })
                if (!flag) {
                    if ((scelta_1.num_trovate > 0 && scelta_1.num_trovate < 3) || 
                            (scelta_2.num_trovate > 0 && scelta_2.num_trovate < 3) || 
                            (scelta_3.num_trovate > 0 && scelta_3.num_trovate < 3))  {
                        pallina.error = 'Le materie a scelta devono essere 3 per blocco'
                        flag = true
                    }
                }
                if (flag) {
                    res.render('admin/modifica_cds', {
                        pallina : pallina,
                        materie_attive: materie_attive,
                        lista_cds : lista_cds,
                        utente: req.session.utente,
                        path: '/admin/modifica_cds',
                        depth: 2,
                        lista_materie_ssd: lista_materie_ssd
                    })
                    return
                }
                                // ultimo controllo è sulla totalità dei cfu
                // var tot_cfu = 0
                // var scelta_1 = false
                // var scelta_2 = false
                // var scelta_3 = false
                // materie.forEach(materia => {
                //     if (materia.scelta === 'No') {
                //         tot_cfu += parseInt(materia.cfu, 10)
                //         return
                //     }
                //     if (materia.scelta === 'Primo blocco' &&
                //             scelta_1 == false) {
                //         tot_cfu += parseInt(materia.cfu, 10)
                //         scelta_1 = true
                //     } else if (materia.scelta === 'Secondo blocco' &&
                //             scelta_2 == false) {
                //         tot_cfu += parseInt(materia.cfu, 10)
                //         scelta_2 = true
                //     } else if (materia.scelta === 'Terzo blocco' &&
                //             scelta_3 == false) {
                //         tot_cfu += parseInt(materia.cfu, 10)
                //         scelta_3 = true
                //     }
                // })
                // if (tot_cfu != needed_cfu) {
                //     pallina.error = "I cfu totali devono essere: " + needed_cfu + "\\nInvece sono stati inseriti: " + tot_cfu + " cfu"
                //     res.render('admin/crea_cds', {
                //         pallina : pallina,
                //         utente: req.session.utente,
                //         path: '/admin/crea_cds',
                //         depth: 2,
                //         lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                //     })
                //     return
                // }
                //sql to db

                // -----------------------------------------
                //      TODO: non si possono cancellare le materie esistenti
                // e crearle da capo perché si creerebbero nuovo id e se
                // altri cds avevano materie a scelta con vecchi id
                // ci sarebbero errori di referenza
                //------------------------------------------

                console.log(materie)

                // db.all(`select * from Programmi P, Insegnamenti I ` +
                //        `where P.id_insegnamento = I.id and ` +
                //        `P.id_corso = ${id_cds}`, (err, materie_attuali) => {
                //     if (err) {
                //         console.log(err)
                //         return
                //     }
                //     strings = materie_attuali.map(e => {return JSON.stringify(e)}).filter(solo_unici)
                //     materie_attuali = strings.map(e => {return JSON.parse(e)})
                //     var sql = ""
                //     materie.forEach(mat => {
                //         var trovato = false
                //         materie_attuali.forEach(mat_att => {
                //             if (mat.scelta === 'No') {
                //                 if (mat.nome === mat_att.nome &&
                //                         mat.ssd === mat_att.ssd &&
                //                         mat_att.scelta == false && 
                //                         mat.anno === mat_att.anno.toString() &&
                //                         mat.cfu === mat_att.cfu.toString()){
                //                     id = mat_att.id
                //                     trovato = true
                //                 }
                //             } else {
                //                 if (mat.nome === mat_att.nome &&
                //                         mat.ssd === mat_att.ssd &&
                //                         mat_att.scelta == true && 
                //                         mat.anno === mat_att.anno.toString() &&
                //                         mat.cfu === mat_att.cfu.toString()){
                //                     if (mat.scelta === 'Primo blocco' &&
                //                             mat_att.blocco == 1) {
                //                         id = mat_att.id
                //                         trovato = true
                //                     } else if (mat.scelta === 'Secondo blocco' &&
                //                             mat_att.blocco == 2) {
                //                         id = mat_att.id
                //                         trovato = true
                //                     } else if (mat.scelta === 'Terzo blocco' &&
                //                             mat_att.blocco == 3) {
                //                         id = mat_att.id
                //                         trovato = true
                //                     }
                //                 }
                //             }
                //         })
                //         var scelta = false
                //         var blocco = 0
                //         if (mat.scelta === 'Primo blocco') {
                //             scelta = true
                //             blocco = 1
                //         } else if (mat.scelta === 'Secondo blocco') {
                //             scelta = true
                //             blocco = 2
                //         } else if (mat.scelta === 'Terzo blocco') {
                //             scelta = true
                //             blocco = 3
                //         }
                //         if (!scelta) {
                //             sql += `INSERT INTO Insegnamenti (id,nome,cfu,ssd) VALUES (${id}, \"${mat.nome}\", ${mat.cfu}, \"${mat.ssd}\");\n`
                //             sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, blocco, anno) VALUES (${id_cds}, ${id}, false, 0, ${mat.anno});\n`
                //         } else {
                //             sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, blocco, anno) VALUES (${id_cds}, ${mat.nome}, true, ${blocco}, ${mat.anno});\n`
                //         }
                //     })
                //     db.exec(sql, (err,row) => {
                //         if (err) {
                //             console.log(err)
                //             return
                //         }
                //         res.redirect('/portale' + get_text_parm("Inserimento avvenuto con successo"))
                //     })
                // })
            }
        })

    })
})

server.post("/admin/prendi_cds", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    db.serialize(() => {
        db.all('select I.* from Programmi as P, Insegnamenti as I ' +
                'where P.id_insegnamento = I.id and P.scelta = false and ' +
                'I.nome <> "Tirocinio" and ' + 
                'I.nome <> "Prova finale" and ' + 
                'I.nome <> "Tesi"', (err, materie_attive) => {
            if (err) {
                console.log(err)
                return
            }
            db.all('select * from CDS', (err, lista_cds) => {
                if (err) {
                    console.log(err)
                    return
                }
                db.all(`select * from Programmi P,Insegnamenti I where ` +
                        `P.id_corso = ${req.body.id_cds} And ` +
                        `P.id_insegnamento = I.id`, (err, programma) => {
                    strings = programma.map(e => {return JSON.stringify(e)}).filter(solo_unici)
                    programma = strings.map(e => {return JSON.parse(e)})
                    var pallina = {}
                    var id_cds = req.body.id_cds.trimEnd().trimStart()
                    pallina['id_cds'] = id_cds
                    var nome_cds = req.body.nome_cds.trimEnd().trimStart()
                    pallina['nome_cds'] = nome_cds
                    var tipo_cds = lista_cds.filter(cds => cds.id.toString() === id_cds)[0].tipo
                    pallina['tipo_cds'] = tipo_cds
                    var tot_righe = programma.length
                    pallina['tot_righe'] = tot_righe
                    var materie = programma.map(materia => {
                        var id = materia.id
                        var nome = materia.nome
                        var ssd = materia.ssd
                        var cfu = materia.cfu.toString()
                        var anno = materia.anno.toString()
                        var scelta
                        if (materia.scelta == false) {
                            scelta = 'No'
                        } else {
                            nome = materia.id.toString()
                            if (materia.blocco == 1) {
                                scelta = 'Primo blocco'
                            } else if (materia.blocco == 2) {
                                scelta = 'Secondo blocco'
                            } else if (materia.blocco == 3) {
                                scelta = 'Terzo blocco'
                            }
                        }
                        return {
                            id,
                            nome,
                            ssd,
                            cfu,
                            anno,
                            scelta
                        }
                    })
                    pallina.materie = materie
                    //console.log(pallina, programma)
                    res.render('admin/modifica_cds', {
                        pallina : pallina,
                        materie_attive: materie_attive,
                        lista_cds : lista_cds,
                        utente: req.session.utente,
                        path: '/admin/modifica_cds',
                        depth: 2,
                        lista_materie_ssd: lista_materie_ssd
                    })
                })  
            })
        });
    })
})

server.post("/admin/crea_cds", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    var pallina = {}
    var id_cds = req.body.id_cds.trimEnd().trimStart()
    pallina['id_cds'] = id_cds
    var nome_cds = req.body.nome_cds.trimEnd().trimStart()
    pallina['nome_cds'] = nome_cds
    var tipo_cds = req.body.tipo_cds.trimEnd().trimStart()
    pallina['tipo_cds'] = tipo_cds
    var tot_righe = req.body.tot_righe.trimEnd().trimStart()
    pallina['tot_righe'] = tot_righe
    var needed_cfu
    var materie = []
    for (i = 0; i < parseInt(tot_righe, 10); i++) {
        var nome = req.body['nome_' + i]
        if (typeof nome === 'undefined') {
            continue
        }
        var ssd = req.body['ssd_' + i]
        var cfu = req.body['cfu_' + i]
        var anno = req.body['anno_' + i]
        var scelta = req.body['scelta_' + i]
        materie.push({
            nome: nome.trimEnd().trimStart(),
            ssd : (typeof ssd !== 'undefined' ? ssd.trimEnd().trimStart() : ""),
            cfu : (typeof cfu !== 'undefined' ? cfu.trimEnd().trimStart() : ""),
            anno : (typeof anno !== 'undefined' ? anno.trimEnd().trimStart() : ""),
            scelta : (typeof scelta !== 'undefined' ? scelta.trimEnd().trimStart() : "")
        })
    }
    pallina.materie = materie
    console.log(materie)
 /* ****************************************** */
 /* ************* pallina filled ****************** */
 /* ****************************************** */
    db.all('select I.* from Programmi as P, Insegnamenti as I ' +
            'where P.id_insegnamento = I.id and P.scelta = false and ' +
            'I.nome <> "Tirocinio" and ' + 
            'I.nome <> "Prova finale" and ' + 
            'I.nome <> "Tesi"', (err, materie_attive) => {
        if (err) {
            console.log(err)
            return
        }
        num = parseInt(id_cds, 10);
        if (isNaN(num)) {
            pallina['error'] = "Il codice del corso deve essere un numero"
            res.render('admin/crea_cds', {
                pallina : pallina,
                utente: req.session.utente,
                path: '/admin/crea_cds',
                depth: 2,
                lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
            })
            return
        }
        id_cds = num
        var max_anno = -1
        if (tipo_cds === 'Tipo di laurea') {
            pallina['error'] = "Selezionare il tipo di laurea"
            res.render('admin/crea_cds', {
                pallina : pallina,
                utente: req.session.utente,
                path: '/admin/crea_cds',
                depth: 2,
                lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
            })
            return
        } else if (tipo_cds === 'Triennale') {
            tipo_cds = 'LT'
            needed_cfu = 180
            max_anno = 3
        } else if (tipo_cds === 'Magistrale') {
            tipo_cds = 'LM'
            needed_cfu = 120
            max_anno = 2
        } else if (tipo_cds === 'Magistrale a ciclo unico') {
            tipo_cds = 'LMC'
            needed_cfu = 300
            max_anno = 5
        }
        db.serialize(() => {
            //console.log(`select COUNT(*) from CDS where id = ${id_cds} OR (nome = \"${nome_cds}\" AND tipo = \"${tipo_cds}\")`)
            db.get(`select COUNT(*) from CDS where id = ${id_cds} OR (nome = \"${nome_cds}\" AND tipo = \"${tipo_cds}\")`, async (err, row) => {
                //console.log("row: ", row)
                if (row['COUNT(*)'] > 0) {
                    pallina.error = "Esiste un corso con id: " + id_cds + "\\nOppure un esiste corso con questo nome e tipo di laurea."
                    res.render('admin/crea_cds', {
                        pallina : pallina,
                        utente: req.session.utente,
                        path: '/admin/crea_cds',
                        depth: 2,
                        lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                    })
                    return
                }
                // controllare che gli anni non superino max_anno 
                var flag = false
                materie.forEach((materia, index) => {
                    if (flag) return
                    if (parseInt(materia.anno, 10) > max_anno) {
                        pallina.error = "Per questo tipo di leaura l anno massimo è: " + max_anno
                        res.render('admin/crea_cds', {
                            pallina : pallina,
                            utente: req.session.utente,
                            path: '/admin/crea_cds',
                            depth: 2,
                            lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                        })
                        flag = true
                        return
                    }
                })
                if (flag) return
                // controllare che 
                // tirocinio/tesi/prova finale e materie a scelta
                // siano inseriti correttamente

                nome_materie = materie.map(element => {
                    return element.nome.toUpperCase()
                })
                if (!nome_materie.includes('TIROCINIO')) {
                    pallina.error = "Il corso di studi deve prevedere un Tirocinio"
                    res.render('admin/crea_cds', {
                        pallina : pallina,
                        utente: req.session.utente,
                        path: '/admin/crea_cds',
                        depth: 2,
                        lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                    })
                    return
                }
                flag = false
                materie.forEach(mat => {
                    if (flag) return
                    if (mat.nome.toUpperCase() === 'TIROCINIO') {
                        if (parseInt(mat.cfu,10) != 3 &&
                                parseInt(mat.cfu,10) != 6) {
                            flag = true
                            pallina.error = "Il Tirocinio deve essere di 3 o 6 CFU"
                            res.render('admin/crea_cds', {
                                pallina : pallina,
                                utente: req.session.utente,
                                path: '/admin/crea_cds',
                                depth: 2,
                                lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                            })
                            return
                        }
                    }
                })
                if (flag) return
                if (tipo_cds === 'LT') {
                    if (!nome_materie.includes('PROVA FINALE')) {
                        pallina.error = "La Triennale deve prevedere la Prova Finale"
                        res.render('admin/crea_cds', {
                            pallina : pallina,
                            utente: req.session.utente,
                            path: '/admin/crea_cds',
                            depth: 2,
                            lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                        })
                        return
                    } else {
                        flag = false
                        materie.forEach(mat => {
                            if (flag) return
                            if (mat.nome.toUpperCase() === 'PROVA FINALE') {
                                if (parseInt(mat.cfu,10) != 9 &&
                                        parseInt(mat.cfu,10) != 12) {
                                    flag = true
                                    pallina.error = "La prova finale deve essere di 9 o 12 CFU"
                                    res.render('admin/crea_cds', {
                                        pallina : pallina,
                                        utente: req.session.utente,
                                        path: '/admin/crea_cds',
                                        depth: 2,
                                        lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                                    })
                                    return
                                }
                            }
                        })
                        if (flag) return
                    }
                } else {
                    if (!nome_materie.includes('TESI')) {
                        pallina.error = "I corsi Magistrali prevedono la Tesi"
                        res.render('admin/crea_cds', {
                            pallina : pallina,
                            utente: req.session.utente,
                            path: '/admin/crea_cds',
                            depth: 2,
                            lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                        })
                        return
                    } else {
                        flag = false
                        materie.forEach(mat => {
                            if (flag) return
                            if (mat.nome.toUpperCase() === 'TESI') {
                                if (parseInt(mat.cfu,10) != 9 &&
                                        parseInt(mat.cfu,10) != 12) {
                                    flag = true
                                    pallina.error = "La Tesi deve essere di 9 o 12 CFU"
                                    res.render('admin/crea_cds', {
                                        pallina : pallina,
                                        utente: req.session.utente,
                                        path: '/admin/crea_cds',
                                        depth: 2,
                                        lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                                    })
                                    return
                                }
                            }
                        })
                        if (flag) return
                    }
                }

                // **************************************
                //     controllare la correttezza
                //     delle materie a scelta
                // **************************************
                var scelta_1 = {
                    num_trovate : 0,
                    anno : 0,             
                    ssd : "",
                    cfu : 0,
                    materie : []
                }
                var scelta_2 = {
                    num_trovate : 0,
                    anno : 0,
                    ssd : "",
                    cfu : 0,
                    materie : []
                }
                var scelta_3 = {
                    num_trovate : 0,
                    anno : 0,
                    ssd : "",
                    cfu : 0,
                    materie : []
                }
                var flag = false
                materie.forEach(materia => {
                    if (flag) return
                    if (materia.scelta !== 'No') {
                        // controlla che nel campo nome ci sia un numero
                        // e che appartenga ad un insegnamento attivo
                        id = parseInt(materia.nome, 10)
                        if (isNaN(id)) {
                            pallina.error = 'Inserire un codice di Insegnamento per le materie a scelta'
                            flag = true
                            return
                        }
                        // la materia deve esistere nell'ateneo
                        // ed avere ssd corretto
                        var trovato = false
                        var corretto = false
                        materie_attive.forEach(mat => {
                            if (trovato) return
                            if (mat.id == id) {
                                trovato = true
                                if (mat.ssd === materia.ssd) {
                                    corretto = true
                                }
                            }
                        })
                        if (!trovato) {
                            pallina.error = 'Il codice della materia a scelta deve fare riferimento ad un insegnamento attivo nell ateneo'
                            flag = true
                            return
                        }
                        if (!corretto) {
                            pallina.error = 'L SSD della materia a scelta deve essere coerente con il codice scelto'
                            flag = true
                            return
                        }
                        if (materia.anno === '1') {
                            pallina.error = 'Le materie a scelta devono essere erogate dal secondo anno in poi'
                            flag = true
                            return
                        }
                    }
                    if (materia.scelta === 'Primo blocco') {
                        if (scelta_1.num_trovate == 3) {
                            pallina.error = 'Le materie a scelta devono essere massimo 3 per blocco.'
                            flag = true
                            return
                        }
                        if (scelta_1.num_trovate == 0) {
                            scelta_1.ssd = materia.ssd
                            scelta_1.cfu = materia.cfu
                            scelta_1.anno = materia.anno
                            scelta_1.num_trovate++
                            scelta_1.materie.push(materia.nome)
                            return
                        }
                        if (materia.ssd !== scelta_1.ssd) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso ssd per blocco'
                            flag = true
                            return
                        }
                        if (materia.anno !== scelta_1.anno) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso anno per blocco'
                            flag = true
                            return
                        }
                        if (materia.cfu !== scelta_1.cfu) {
                            pallina.error = 'Le materie a scelta devono avere gli stessi CFU per blocco'
                            flag = true
                            return
                        }
                        if (scelta_1.materie.includes(materia.nome)) {
                            pallina.error = 'Le materie a scelta devono essere diverse dentro un blocco'
                            flag = true
                            return
                        }
                        scelta_1.num_trovate++
                        scelta_1.materie.push(materia.nome)
                    } else if (materia.scelta === 'Secondo blocco') {
                        if (scelta_2.num_trovate == 3) {
                            pallina.error = 'Le materie a scelta devono essere massimo 3 per blocco.'
                            flag = true
                            return
                        }
                        if (scelta_2.num_trovate == 0) {
                            scelta_2.ssd = materia.ssd
                            scelta_2.cfu = materia.cfu
                            scelta_2.anno = materia.anno
                            scelta_2.num_trovate++
                            scelta_2.materie.push(materia.nome)
                            return
                        }
                        if (materia.ssd !== scelta_2.ssd) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso ssd per blocco'
                            flag = true
                            return
                        }
                        if (materia.anno !== scelta_2.anno) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso anno per blocco'
                            flag = true
                            return
                        }
                        if (materia.cfu !== scelta_2.cfu) {
                            pallina.error = 'Le materie a scelta devono avere gli stessi CFU per blocco'
                            flag = true
                            return
                        }
                        if (scelta_2.materie.includes(materia.nome)) {
                            pallina.error = 'Le materie a scelta devono essere diverse dentro un blocco'
                            flag = true
                            return
                        }
                        scelta_2.num_trovate++
                        scelta_2.materie.push(materia.nome)
                    } else if (materia.scelta === 'Terzo blocco') {
                        if (scelta_3.num_trovate == 3) {
                            pallina.error = 'Le materie a scelta devono essere massimo 3 per blocco.'
                            flag = true
                            return
                        }
                        if (scelta_3.num_trovate == 0) {
                            scelta_3.ssd = materia.ssd
                            scelta_3.cfu = materia.cfu
                            scelta_3.anno = materia.anno
                            scelta_3.num_trovate++
                            scelta_3.materie.push(materia.nome)
                            return
                        }
                        if (materia.ssd !== scelta_3.ssd) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso ssd per blocco'
                            flag = true
                            return
                        }
                        if (materia.anno !== scelta_3.anno) {
                            pallina.error = 'Le materie a scelta devono avere lo stesso anno per blocco'
                            flag = true
                            return
                        }
                        if (materia.cfu !== scelta_3.cfu) {
                            pallina.error = 'Le materie a scelta devono avere gli stessi CFU per blocco'
                            flag = true
                            return
                        }
                        if (scelta_3.materie.includes(materia.nome)) {
                            pallina.error = 'Le materie a scelta devono essere diverse dentro un blocco'
                            flag = true
                            return
                        }
                        scelta_3.num_trovate++
                        scelta_3.materie.push(materia.nome)
                    }
                })
                if (!flag) {
                    if ((scelta_1.num_trovate > 0 && scelta_1.num_trovate < 3) || 
                            (scelta_2.num_trovate > 0 && scelta_2.num_trovate < 3) || 
                            (scelta_3.num_trovate > 0 && scelta_3.num_trovate < 3))  {
                        pallina.error = 'Le materie a scelta devono essere 3 per blocco'
                        flag = true
                    }
                }
                if (flag) {
                    res.render('admin/crea_cds', {
                        pallina : pallina,
                        utente: req.session.utente,
                        path: '/admin/crea_cds',
                        depth: 2,
                        lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                    })
                    return
                }
                // ultimo controllo è sulla totalità dei cfu
                // var tot_cfu = 0
                // var scelta_1 = false
                // var scelta_2 = false
                // var scelta_3 = false
                // materie.forEach(materia => {
                //     if (materia.scelta === 'No') {
                //         tot_cfu += parseInt(materia.cfu, 10)
                //         return
                //     }
                //     if (materia.scelta === 'Primo blocco' &&
                //             scelta_1 == false) {
                //         tot_cfu += parseInt(materia.cfu, 10)
                //         scelta_1 = true
                //     } else if (materia.scelta === 'Secondo blocco' &&
                //             scelta_2 == false) {
                //         tot_cfu += parseInt(materia.cfu, 10)
                //         scelta_2 = true
                //     } else if (materia.scelta === 'Terzo blocco' &&
                //             scelta_3 == false) {
                //         tot_cfu += parseInt(materia.cfu, 10)
                //         scelta_3 = true
                //     }
                // })
                // if (tot_cfu != needed_cfu) {
                //     pallina.error = "I cfu totali devono essere: " + needed_cfu + "\\nInvece sono stati inseriti: " + tot_cfu + " cfu"
                //     res.render('admin/crea_cds', {
                //         pallina : pallina,
                //         utente: req.session.utente,
                //         path: '/admin/crea_cds',
                //         depth: 2,
                //         lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                //     })
                //     return
                // }
                //sql to db
                db.get('select MAX(id) from Insegnamenti', (err, row) => {
                    if (err) {
                        console.log(err)
                        return
                    }
                    var id = row['MAX(id)']
                    var sql = `INSERT INTO CDS (id, nome, tipo) VALUES (${id_cds}, \"${nome_cds}\", \"${tipo_cds}\");\n`
                    materie.forEach(mat => {
                        id += 25;
                        var scelta = false
                        var blocco = 0
                        if (mat.scelta === 'Primo blocco') {
                            scelta = true
                            blocco = 1
                        } else if (mat.scelta === 'Secondo blocco') {
                            scelta = true
                            blocco = 2
                        } else if (mat.scelta === 'Terzo blocco') {
                            scelta = true
                            blocco = 3
                        }
                        if (!scelta) {
                            sql += `INSERT INTO Insegnamenti (id,nome,cfu,ssd) VALUES (${id}, \"${mat.nome}\", ${mat.cfu}, \"${mat.ssd}\");\n`
                            sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, blocco, anno) VALUES (${id_cds}, ${id}, false, 0, ${mat.anno});\n`
                        } else {
                            sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, blocco, anno) VALUES (${id_cds}, ${mat.nome}, true, ${blocco}, ${mat.anno});\n`
                        }
                    })
                    db.exec(sql, (err,row) => {
                        if (err) {
                            console.log(err)
                            return
                        }
                        res.redirect('/portale' + get_text_parm("Inserimento avvenuto con successo"))
                    })

                })
            })
        })
    })
})

server.get("/admin/modifica_cds", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    db.serialize(() => {
        db.all('select I.* from Programmi as P, Insegnamenti as I ' +
                'where P.id_insegnamento = I.id and P.scelta = false and ' +
                'I.nome <> "Tirocinio" and ' + 
                'I.nome <> "Prova finale" and ' + 
                'I.nome <> "Tesi"', (err, materie_attive) => {
            if (err) {
                console.log(err)
                return
            }
            db.all('select * from CDS', (err, lista_cds) => {
                if (err) {
                    console.log(err)
                    return
                }
                res.render('admin/modifica_cds', {
                    materie_attive: materie_attive,
                    lista_cds,
                    utente: req.session.utente,
                    path: '/admin/modifica_cds',
                    depth: 2,
                    lista_materie_ssd: lista_materie_ssd, 
                    materie_attive : materie_attive
                })
            })
        });
    })
})

server.get("/admin/crea_cds", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    db.serialize(() => {
        db.all('select I.* from Programmi as P, Insegnamenti as I ' +
                'where P.id_insegnamento = I.id and P.scelta = false and ' +
                'I.nome <> "Tirocinio" and ' + 
                'I.nome <> "Prova finale" and ' + 
                'I.nome <> "Tesi"', (err, materie_attive) => {
            if (err) {
                console.log(err)
                return
            }
            res.render('admin/crea_cds', {
                materie_attive: materie_attive,
                utente: req.session.utente,
                path: '/admin/crea_cds',
                depth: 2,
                lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
            })
        });
    })
})

server.get("/admin/admin_page", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    res.render('admin/admin_page', {
        rows: null,
        utente: req.session.utente,
        path: '/admin/admin_page',
        depth: 2
    })
})

server.post("/admin/crea_rim_docente", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    if (req.body.radio_crea === 'checked') {
        nome = req.body.nome_docente.trimEnd().trimStart().toUpperCase()
        cognome = req.body.cognome_docente.trimEnd().trimStart().toUpperCase()
        ssd = req.body.ssd_docente.trimEnd().trimStart()
        password = req.body.password_docente.trimEnd().trimStart()
        if (nome === '' || cognome === '' || ssd === '' || password === '') {
            res.redirect("/admin/crea_rim_docente" + get_error_parm("Riempire tutti i campi non disabilitati"))
            return
        }
        db.all(`select COUNT(*) from Docenti where nome = ${nome} and cognome = ${cognome}`, (err, rows) => {
            if (err) {
                console.log(err)
                return
            }
            if (rows['COUNT(*)'] > 0) {
                res.redirect("/admin/crea_rim_docente" + get_error_parm("Esiste gia' un docente con questo nome e cognome"))
                return
            }
            password = bcrypt.hashSync(cognome.toLowerCase() + '1234', 10)
        })
        
    } else if (req.body.radio_rimuovi === 'checked') {

    } else if (req.body.radio_materia === 'checked') {
        
    } else {
        res.redirect("/admin/crea_rim_docente" + get_error_parm("error:5001"))
    }
})

server.get("/admin/crea_rim_docente", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    db.all('Select * from CDS', (err, rows) => {
        if (err) {
            console.log(err)
            return
        }
        // docenti senza insegnamenti assegnati
        db.all('select * from docenti where id not in (select id_docente from Insegnamenti)', (err, docenti) => {
            if (err) {
                console.log(err)
                return
            }
            // insegnamenti senza docenti assegnati
            db.all('select * from Insegnamenti where id_docente is null', (err, materie) => {
                if (err) {
                    console.log(err)
                    return
                }
                res.render('admin/crea_rim_docente', {
                    cds : rows,
                    docenti : docenti,
                    materie: materie,
                    utente: req.session.utente,
                    path: '/admin/crea_rim_docente',
                    depth: 2,
                    lista_materie_ssd: lista_materie_ssd
                })
            })
        })
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
        db.all(`SELECT P.id_insegnamento, P.anno, P.blocco, ` +
                `P.scelta, I.nome AS nome_insegnamento, I.cfu, ` +
                `I.path_scheda_trasparenza, I.ssd, I.id_docente, ` +
                `C.tipo AS tipo_cds FROM CDS as C, Programmi as P, ` +
                `Insegnamenti as I WHERE P.id_corso = ${id_corso} AND ` +
                ` P.id_insegnamento = I.id AND ` +
                ` P.id_corso = C.id`, (err, rows) => {
            strings = rows.map(e => {return JSON.stringify(e)}).filter(solo_unici)
            rows = strings.map(e => {return JSON.parse(e)})
            if (err) {
                console.log(err)
                res.redirect('/' + get_error_parm("errore: 2345"))
                return
            }
            if (rows.length == 0) {
                res.redirect('/' + get_error_parm(`id corso: ${id_corso} inesistente`))
                return
            }
            db.all('select * from Docenti', (err, docenti) => {
                if (err) {
                    console.log(err)
                    return
                }
                res.render('manifesto', {
                    rows: rows,
                    docenti : docenti,
                    utente: req.session.utente,
                    path: '/manifesto/' + id_corso,
                    depth: 2
                })
            })
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