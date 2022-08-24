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

server.post("/admin/crea_modifica_cds", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
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
    if (!assert_you_are_admin(req, res)) return
    db.serialize(() => {
        db.all('Select * from CDS', (err, rows) => {
                if (err) {
                    console.log(err)
                    res.redirect('/admin/crea_modifica_cds' + get_error_parm("errore: 5342"))
                } else {
                    db.all(`SELECT P.id_insegnamento, P.anno, P.scelta, I.nome AS nome_insegnamento, I.cfu, I.path_scheda_trasparenza, I.ssd, I.id_docente, D.nome AS nome_docente, D.cognome AS cognome_docente, C.tipo AS tipo_cds, C.id AS id_cds FROM CDS as C, Programmi as P, Insegnamenti as I, ` +
                            `Docenti as D WHERE ` +
                            `P.id_insegnamento = I.id AND ` +
                            `I.id_docente = D.id AND ` +
                            `P.id_corso = C.id`, (err, rows2) => {
                        if (err) {
                            console.log(err)
                            res.redirect('/admin/crea_modifica_cds' + get_error_parm("errore: 3345"))
                        } else {
                            res.render('admin/crea_modifica_cds', {
                                lista_cds: rows,
                                lista_materie: rows2,
                                utente: req.session.utente,
                                path: '/admin/crea_modifica_cds',
                                depth: 2,
                                lista_materie_ssd: lista_materie_ssd
                            })
                        }
                    })
            }
        })
    })

})

// function send_html_with_data(ejs_file, obj, req, res) {
//     var chiavi = Object.keys(obj)
//     str = '?'
//     chiavi.forEach(chiave => {
//         str += chiave + "=" + obj[chiave].toString().split(' ').join('+') + "&"
//     })
//     if (str !== '?') str = str.substring(0, str.length - 1)
//     conn_path = '/' + ejs_file
//     res.render(ejs_file + str, {
//         utente: req.session.utente,
//         path: conn_path,
//         depth: conn_path.split('/').length,
//         lista_materie_ssd: lista_materie_ssd
//     })
// }

server.post("/admin/crea_cds", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    var pallina = {}
    var id_cds = req.body.id_cds
    pallina['id_cds'] = id_cds
    var nome_cds = req.body.nome_cds.trimEnd().trimStart()
    pallina['nome_cds'] = nome_cds
    var tipo_cds = req.body.tipo_cds
    pallina['tipo_cds'] = tipo_cds
    var tot_righe = req.body.tot_righe
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
            nome: nome,
            ssd : ssd,
            cfu : cfu,
            anno : anno,
            scelta : scelta
        })
    }
    pallina.materie = materie
 /* ****************************************** */
 /* ************* pallina filled ****************** */
 /* ****************************************** */
    num = parseInt(id_cds, 10);
    if (isNaN(num)) {
        pallina['error'] = "Il codice del corso deve essere un numero"
        res.render('admin/crea_cds', {
            pallina : pallina,
            utente: req.session.utente,
            path: '/admin/crea_cds',
            depth: 2,
            lista_materie_ssd: lista_materie_ssd
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
            lista_materie_ssd: lista_materie_ssd
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
                    lista_materie_ssd: lista_materie_ssd
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
                        lista_materie_ssd: lista_materie_ssd
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
                        res.render('admin/crea_cds', {
                            pallina : pallina,
                            utente: req.session.utente,
                            path: '/admin/crea_cds',
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
                    res.render('admin/crea_cds', {
                        pallina : pallina,
                        utente: req.session.utente,
                        path: '/admin/crea_cds',
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
                                pallina.error = "La prova finale deve essere di 9 o 12 CFU"
                                res.render('admin/crea_cds', {
                                    pallina : pallina,
                                    utente: req.session.utente,
                                    path: '/admin/crea_cds',
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
                    res.render('admin/crea_cds', {
                        pallina : pallina,
                        utente: req.session.utente,
                        path: '/admin/crea_cds',
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
                                pallina.error = "La Tesi deve essere di 9 o 12 CFU"
                                res.render('admin/crea_cds', {
                                    pallina : pallina,
                                    utente: req.session.utente,
                                    path: '/admin/crea_cds',
                                    depth: 2,
                                    lista_materie_ssd: lista_materie_ssd
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
            db.all('select I.* from Programmi as P, Insegnamenti as I ' +
                    'where P.id_insegnamento = I.id and P.scelta = false', (err, mat_attive) => {
                if (err) {
                    console.log(err)
                    return
                }
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
                    console.log(materia, flag)
                    if (flag) {
                        return
                    }
                    if (materia.scelta !== 'No') {
                        // controlla che nel campo nome ci sia un numero
                        // e che appartenga ad un insegnamento attivo
                        id = parseInt(materia.nome, 10)
                        if (isNaN(id)) {
                            pallina.error = 'Inserire un codice di Insegnamento per le materie a scelta'
                            flag = true
                            return
                        }
                        if (!mat_attive.map(e => {return e.id}).includes(id)) {
                            pallina.error = 'Inserire un codice di insegnamento attivo nell ateneo per le materie a scelta'
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
                        // --------------------------------
                        //          TODO NON ENTRA QUA
                        // --------------------------------
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
                console.log(scelta_1, scelta_2, scelta_3)
                if ((scelta_1.num_trovate > 0 && scelta_1.num_trovate < 3) || 
                        (scelta_2.num_trovate > 0 && scelta_2.num_trovate < 3) || 
                        (scelta_3.num_trovate > 0 && scelta_3.num_trovate < 3))  {
                    pallina.error = 'Le materie a scelta devono essere 3 per blocco'
                    flag = true
                }
                if (flag) {
                    res.render('admin/crea_cds', {
                        pallina : pallina,
                        utente: req.session.utente,
                        path: '/admin/crea_cds',
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
                //         lista_materie_ssd: lista_materie_ssd
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
                        sql += `INSERT INTO Insegnamenti (id,nome,cfu,ssd,id_docente) VALUES (${id}, \"${mat.nome}\", ${mat.cfu}, \"${mat.ssd}\", -1);\n`
                        sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, blocco, anno) VALUES (${id_cds}, ${id}, ${scelta}, ${blocco}, ${mat.anno});\n`
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

server.get("/admin/crea_cds", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    db.serialize(() => {
        db.all("SELECT I.id as id_materia, I.nome as nome_materia, "+
                "I.ssd as ssd_materia From Insegnamenti as I, " +
                "Programmi as P where P.id_insegnamento = I.id and " +
                "P.scelta = false;", (err, rows) => {
            if (err) {
                console.log(err)
                return
            }
            res.render('admin/crea_cds', {
                rows: rows,
                utente: req.session.utente,
                path: '/admin/crea_cds',
                depth: 2,
                lista_materie_ssd: lista_materie_ssd
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
        db.all(`SELECT P.id_insegnamento, P.anno, P.scelta, I.nome AS nome_insegnamento, I.cfu, I.path_scheda_trasparenza, I.ssd, I.id_docente, C.tipo AS tipo_cds FROM CDS as C, Programmi as P, Insegnamenti as I ` +
                ` WHERE P.id_corso = ${id_corso} AND ` +
                ` P.id_insegnamento = I.id AND ` +
                ` P.id_corso = C.id`, (err, rows) => {
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