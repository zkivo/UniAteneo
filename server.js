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

if (process.argv.includes("reset") || !fs.existsSync(path_db)) {
    fs.copyFileSync("./data/_backup/db.sqlite", "./data/db.sqlite")
}

const db = new sqlite3.Database(path_db, initiate_db);
const lista_materie_ssd = JSON.parse(fs.readFileSync("./data/materie_ssd.json"))
lista_materie_ssd.sort((a,b) => {
    if (a.ssd > b.ssd) return 1
    else if (a.ssd < b.ssd) return -1
    else return 0
})
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

function assert_you_are_docente(req, res) {
    if (typeof req.session.utente === 'undefined') {
        res.redirect('/' + get_error_parm("Effettua prima il login"))
        return false
    }
    if (req.session.utente.tipo !== 'docente') {
        res.redirect('/' + get_error_parm("Pagina riservata al docente"))
        return false
    }
    return true
}

function assert_you_are_studente(req, res) {
    if (typeof req.session.utente === 'undefined') {
        res.redirect('/' + get_error_parm("Effettua prima il login"))
        return false
    }
    if (req.session.utente.tipo !== 'studente') {
        res.redirect('/' + get_error_parm("Pagina riservata a studenti"))
        return false
    }
    return true
}

function solo_unici(value, index, self) {
    return self.indexOf(value) === index;
}

function get_lista_unica(lista) {
    if (typeof lista === 'undefined') return lista
    strings = lista.map(e => {return JSON.stringify(e)}).filter(solo_unici)
    return strings.map(e => {return JSON.parse(e)})
}


//const lista_ssd = get_lista_unica(lista_materie_ssd.map(e => e.ssd))
const lista_ssd = JSON.parse(fs.readFileSync("./data/ssd.json")).map(e => e.code)

server.use(express.static('public'))
server.set('view engine', 'ejs');

server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: true }))

server.use(session({
    resave: false,            
    saveUninitialized: false,
    secret: 'iV60!95Jg@qt'
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
        //insert_ssd();
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

// -----------------------------------
//        GET INDEX
// -----------------------------------

server.get('/', (req, res) => {
    db.serialize(() => {
        db.all("SELECT * FROM CDS", (err, rows) => {
            if (err)
                console.log(err);
            else {
                //console.log(req.session.utente)
                res.render('index', {
                    rows: rows,
                    utente: req.session.utente,
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

function portale_docente(req, res) {
    var id_docente = req.session.utente.id;
    // console.log(id_docente);
    db.serialize(() => {
        db.all(`SELECT DISTINCT P.id_insegnamento, I.nome AS nome_insegnamento, I.cfu, I.scheda_trasparenza, I.ssd, I.id_docente, D.nome AS nome_docente, D.cognome AS cognome_docente, D.inizio_ricevimento, D.fine_ricevimento FROM CDS as C, Programmi as P, Insegnamenti as I, ` +
                `Docenti as D WHERE ` +
                `P.id_insegnamento = I.id AND ` +
                `I.id_docente = D.id AND ` +
                `P.id_corso = C.id AND D.id = ${id_docente}`, (err, rows) => {
            if (err) {
                console.log(err)
                res.redirect('/' + get_error_parm("errore: 7567"))
            } else {
                if (rows.length == 0) {
                    res.redirect('/' + get_error_parm(`Non esistono insegnamenti`))
                    return
                }
                db.all(`SELECT * FROM Ricevimenti WHERE id_docente = ${id_docente} ORDER BY id DESC`, (err, rice) => {
                    if (err) {
                        console.log(err)
                        res.redirect('/' + get_error_parm("errore: 7567"))
                    } else {
                        if (rows.length == 0) {
                            res.redirect('/' + get_error_parm(`Non esistono insegnamenti`))
                            return
                        }
                        db.all(`SELECT E.matricola, E.id_insegnamento, S.nome, S.cognome `+
                                `FROM Esami as E, Studente as S WHERE E.matricola = S.matricola AND E.sostenuto = false`, (err, esami) => {
                            if (err) {
                                console.log(err)
                                res.redirect('/' + get_error_parm("errore: 7567"))
                            } else {
                                res.render('docente', {
                                    rows: rows,
                                    rice: rice,
                                    esami: esami,
                                    utente: req.session.utente,
                                    path: '/portale',
                                    depth : 1
                                })
                            }
                        })
                    }
                })
            }
        })
    })
}

function portale_studente(req, res) {
    var id = req.session.utente.id;
    res.render('studente/studente_page', {
        utente: req.session.utente,
        path: '/studente/studente_page',
        depth : 2
    })
}

server.get('/portale', (req, res) => {
    if (typeof req.session.utente === 'undefined') {
        res.redirect('/' + get_error_parm("Effettua prima il login"))
        return
    }
    if (req.session.utente) {
        switch (req.session.utente.tipo) {
            case 'docente':
                portale_docente(req, res)
                break
            case 'studente':
                portale_studente(req,res)
                break;
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

// -----------------------------------
//        GET ELIMINA CDS
// -----------------------------------

server.get("/admin/elimina_cds", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    db.all('select * from CDS', (err, lista_cds) => {
        if (err) {
            console.log(err)
            return
        }
        res.render('admin/elimina_cds', {
            lista_cds,
            utente: req.session.utente,
            path: '/admin/elimina_cds',
            depth: 2
        });
    })
})

// -----------------------------------
//        POST ELIMINA CDS
// ----------------------------------

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
        db.all(`select * from Programmi as P, Insegnamenti as I ` +
                `where P.id_insegnamento = I.id and ` +
                `P.id_corso = ${id_cds}`, (err, materie_attuali) => {
            if (err) {
                console.log(err)
                return
            }
            strings = materie_attuali.map(e => {return JSON.stringify(e)}).filter(solo_unici)
            materie_attuali = strings.map(e => {return JSON.parse(e)})
            db.get(`delete from Programmi as P where P.id_corso = ${id_cds}`, (err) => {
                if (err) {
                    console.log(err)
                    return
                }
                del_sql = ""
                materie_attuali.forEach(materia_attuale => {
                    del_sql += `delete from Insegnamenti as I where I.id = ${materia_attuale.id};\n`
                })
                db.exec(del_sql, (err) => {
                    if (err) {
                        console.log(err)
                        return
                    }
                    db.get(`DELETE FROM CDS WHERE id = ${id_cds};`, (err, row) => {
                        if (err) {
                            console.log(err)
                        }
                        res.redirect("/admin/admin_page" + get_text_parm("Corso eliminato con successo"))
                    })
                })
            })
        })
    }
})

// -----------------------------------
//        POST MODIFICA CDS
// -----------------------------------

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
    //console.log(pallina)
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
                    pallina.error = "Per questo tipo di leaura l anno massimo ??: " + max_anno
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
                materie.forEach((mat, index) => {
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
                        } else {
                            materie[index].nome = 'Tirocinio'
                        }
                    }
                })
                if (flag) return
                if (tipo_cds === 'LT') {
                    if (nome_materie.includes('TESI')) {
                        pallina.error = "La Triennale non prevede la Tesi."
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
                        materie.forEach((mat,index) => {
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
                                } else {
                                    materie[index].nome = 'Prova finale'
                                }
                            }
                        })
                        if (flag) return
                    }
                } else {
                    if (nome_materie.includes('PROVA FINALE')) {
                        pallina.error = "Le lauree magistrali non prevedono la prova finale."
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
                        materie.forEach((mat, index) => {
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
                                } else {
                                    materie[index].nome = 'Tesi'
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
                // ultimo controllo ?? sulla totalit?? dei cfu
                var tot_cfu = 0
                var scelta_1 = false
                var scelta_2 = false
                var scelta_3 = false
                materie.forEach(materia => {
                    if (materia.scelta === 'No') {
                        tot_cfu += parseInt(materia.cfu, 10)
                        return
                    }
                    if (materia.scelta === 'Primo blocco' &&
                            scelta_1 == false) {
                        tot_cfu += parseInt(materia.cfu, 10)
                        scelta_1 = true
                    } else if (materia.scelta === 'Secondo blocco' &&
                            scelta_2 == false) {
                        tot_cfu += parseInt(materia.cfu, 10)
                        scelta_2 = true
                    } else if (materia.scelta === 'Terzo blocco' &&
                            scelta_3 == false) {
                        tot_cfu += parseInt(materia.cfu, 10)
                        scelta_3 = true
                    }
                })
                if (tot_cfu != needed_cfu) {
                    pallina.error = "I cfu totali devono essere: " + needed_cfu + "\\nInvece sono stati inseriti: " + tot_cfu + " cfu"
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
                //sql to db

                // -----------------------------------------
                //      TODO: non si possono cancellare le materie esistenti
                // e crearle da capo perch?? si creerebbero nuovo id e se
                // altri cds avevano materie a scelta con vecchi id
                // ci sarebbero errori di referenza
                //------------------------------------------

                //console.log(materie)
                db.all(`select * from Programmi as P, Insegnamenti as I ` +
                        `where P.id_insegnamento = I.id and ` +
                        `P.id_corso = ${id_cds} and ` +
                        `P.scelta = false`, (err, materie_attuali_not_scelta) => {
                    if (err) {
                        console.log(err)
                        return
                    }
                    strings = materie_attuali_not_scelta.map(e => {return JSON.stringify(e)}).filter(solo_unici)
                    materie_attuali_not_scelta = strings.map(e => {return JSON.parse(e)})
                    db.get(`delete from Programmi as P where P.id_corso = ${id_cds}`, (err) => {
                        if (err) {
                            console.log(err)
                            return
                        }
                        del_sql = ""
                        materie_attuali_not_scelta.forEach(materia_attuale => {
                            del_sql += `delete from Insegnamenti as I where I.id = ${materia_attuale.id};\n`
                        })
                        db.exec(del_sql, (err) => {
                            if (err) {
                                console.log(err)
                                return
                            }
                            db.get('select MAX(id) from Insegnamenti', (err, row) => {
                                if (err) {
                                    console.log(err)
                                    return
                                }
                                var id = row['MAX(id)']
                                var sql = ""
                                materie.forEach(materia => {
                                    id += 25;
                                    var scelta = false
                                    var blocco = 0
                                    if (materia.scelta === 'Primo blocco') {
                                        scelta = true
                                        blocco = 1
                                    } else if (materia.scelta === 'Secondo blocco') {
                                        scelta = true
                                        blocco = 2
                                    } else if (materia.scelta === 'Terzo blocco') {
                                        scelta = true
                                        blocco = 3
                                    }
                                    if (!scelta) {
                                        sql += `INSERT INTO Insegnamenti (id,nome,cfu,ssd) VALUES (${id}, \"${materia.nome}\", ${materia.cfu}, \"${materia.ssd}\");\n`
                                        sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, blocco, anno) VALUES (${id_cds}, ${id}, false, 0, ${materia.anno});\n`
                                    } else {
                                        sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, blocco, anno) VALUES (${id_cds}, ${materia.nome}, true, ${blocco}, ${materia.anno});\n`
                                    }
                                })
                                db.exec(sql, (err,row) => {
                                    if (err) {
                                        console.log(err)
                                        return
                                    }
                                    //console.log(sql)
                                    res.redirect('/admin/admin_page' + get_text_parm("Modifica avvenuta con successo"))
                                })
                            })
                        })
                    })
                })
            })

        })
    })
})

// -----------------------------------
//        POST PRENDI CDS
// -----------------------------------

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

// -----------------------------------
//        POST CREA CDS
// -----------------------------------

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
    //console.log(materie)
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
                        pallina.error = "Per questo tipo di leaura l anno massimo ??: " + max_anno
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
                materie.forEach((mat, index) => {
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
                        } else {
                            materie[index].nome = 'Tirocinio'
                        }
                    }
                })
                if (flag) return
                if (tipo_cds === 'LT') {
                    if (nome_materie.includes('TESI')) {
                        pallina.error = "La Triennale non prevede la Tesi."
                        res.render('admin/crea_cds', {
                            pallina : pallina,
                            utente: req.session.utente,
                            path: '/admin/crea_cds',
                            depth: 2,
                            lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                        })
                        return
                    }
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
                        materie.forEach((mat, index) => {
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
                                } else {
                                    materie[index].nome = 'Prova finale'
                                }
                            }
                        })
                        if (flag) return
                    }
                } else {
                    if (nome_materie.includes('PROVA FINALE')) {
                        pallina.error = "Le lauree magistrali non prevedono la prova finale."
                        res.render('admin/crea_cds', {
                            pallina : pallina,
                            utente: req.session.utente,
                            path: '/admin/crea_cds',
                            depth: 2,
                            lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                        })
                        return
                    }
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
                        materie.forEach((mat, index) => {
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
                                } else {
                                    materie[index].nome = 'Tesi'
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
                // ultimo controllo ?? sulla totalit?? dei cfu
                var tot_cfu = 0
                var scelta_1 = false
                var scelta_2 = false
                var scelta_3 = false
                materie.forEach(materia => {
                    if (materia.scelta === 'No') {
                        tot_cfu += parseInt(materia.cfu, 10)
                        return
                    }
                    if (materia.scelta === 'Primo blocco' &&
                            scelta_1 == false) {
                        tot_cfu += parseInt(materia.cfu, 10)
                        scelta_1 = true
                    } else if (materia.scelta === 'Secondo blocco' &&
                            scelta_2 == false) {
                        tot_cfu += parseInt(materia.cfu, 10)
                        scelta_2 = true
                    } else if (materia.scelta === 'Terzo blocco' &&
                            scelta_3 == false) {
                        tot_cfu += parseInt(materia.cfu, 10)
                        scelta_3 = true
                    }
                })
                if (tot_cfu != needed_cfu) {
                    pallina.error = "I cfu totali devono essere: " + needed_cfu + "\\nInvece sono stati inseriti: " + tot_cfu + " cfu"
                    res.render('admin/crea_cds', {
                        pallina : pallina,
                        utente: req.session.utente,
                        path: '/admin/crea_cds',
                        depth: 2,
                        lista_materie_ssd: lista_materie_ssd, materie_attive : materie_attive
                    })
                    return
                }
                //sql to db
                db.get('select MAX(id) from Insegnamenti', (err, row) => {
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
                            if (!mat_attive.map(e => {return e.id}).includes(id)) {
                                pallina.error = 'Inserire un codice di insegnamento attivo nell ateneo per le materie a scelta'
                                flag = true
                                return
                            }
                            if (!mat_attive.map(e => {return e.ssd}).includes(materia.sdd)) {
                                pallina.error = 'Per le materie a scelta l SSD deve combaciare con quello presente nell ateneo'
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
                        if (!scelta) {
                            sql += `INSERT INTO Insegnamenti (id,nome,cfu,ssd) VALUES (${id}, \"${mat.nome}\", ${mat.cfu}, \"${mat.ssd}\");\n`
                            sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, blocco, anno) VALUES (${id_cds}, ${id}, false, 0, ${mat.anno});\n`
                        } else {
                            sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, blocco, anno) VALUES (${id_cds}, ${mat.nome}, true, ${blocco}, ${mat.anno});\n`
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
                    // ultimo controllo ?? sulla totalit?? dei cfu
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
                        res.redirect('/admin/admin_page' + get_text_parm("Inserimento avvenuto con successo"))
                    })
                })
            })
        })
    })
})

// -----------------------------------
//        GET MODIFICA CDS
// -----------------------------------

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
                    lista_materie_ssd: lista_materie_ssd
                })
            })
        });
    })
})

// -----------------------------------
//        POST CREA DOCENTE
// -----------------------------------

server.post("/admin/crea_docente", (req, res) => {
    if (!assert_you_are_admin(req, res)) return

    db.all("select * from Docenti", (err, docenti) => {
        if (err) {
            console.log(err)
            return
        }
        docenti = get_lista_unica(docenti)
        nome = req.body.nome.trimEnd().trimStart().toUpperCase()
        cognome = req.body.cognome.trimEnd().trimStart().toUpperCase()
        nomi_e_cognomi = docenti.map(docente => {
            return docente.nome.toUpperCase() + " " + 
                docente.cognome.toUpperCase()
        })
        if (nomi_e_cognomi.includes(nome + " " + cognome)) {
            res.redirect("/admin/crea_docente" + get_error_parm("Esiste gia' docente con questo nome e cognome"))
            return
        }
        ssd = req.body.ssd.trimEnd().trimStart()
        password_1 = req.body.password_1.trimEnd().trimStart()
        password_2 = req.body.password_2.trimEnd().trimStart()
        if (password_1 !== password_2) {
            res.redirect("/admin/crea_docente" + get_error_parm("Le password inserite sono diverse"))
            return
        }
        password = bcrypt.hashSync(password_1, 10)
        // controllo sulle materie inserite e ssd
        var materia_0 = null
        var materia_1 = null
        var materia_2 = null
        var materia_3 = null
        var tot_cfu = 0
        if (req.body.materia_0 !== 'Campo vuoto') {
            materia_0 = req.body.materia_0.split("_")
            cfu_0 = parseInt(req.body.materia_0.split(":")[req.body.materia_0.split(":").length - 1].trimStart().trimEnd())
            tot_cfu += cfu_0
            if (ssd !== materia_0[1].trimEnd().trimStart()) {
                res.redirect("/admin/crea_docente" + get_error_parm("Gli SSD degli insegnamenti devono essere uguali a quelli scelti per il docente."))
                return
            }
        }
        if (req.body.materia_1 !== 'Campo vuoto') {
            materia_1 = req.body.materia_1.split("_")
            cfu_1 = parseInt(req.body.materia_1.split(":")[req.body.materia_1.split(":").length - 1].trimStart().trimEnd())
            tot_cfu += cfu_1
            if (ssd !== materia_1[1].trimEnd().trimStart()) {
                res.redirect("/admin/crea_docente" + get_error_parm("Gli SSD degli insegnamenti devono essere uguali a quelli scelti per il docente."))
                return
            }
            if (materia_0) {
                if (materia_1[0].trimEnd().trimStart() === materia_0[0].trimEnd().trimStart()) {
                    res.redirect("/admin/crea_docente" + get_error_parm("Bisogna inserire insegnamenti diversi"))
                    return
                }
            }
        }
        if (req.body.materia_2 !== 'Campo vuoto') {
            materia_2 = req.body.materia_2.split("_")
            cfu_2 = parseInt(req.body.materia_2.split(":")[req.body.materia_2.split(":").length - 1].trimStart().trimEnd())
            tot_cfu += cfu_2
            if (ssd !== materia_2[1].trimEnd().trimStart()) {
                res.redirect("/admin/crea_docente" + get_error_parm("Gli SSD degli insegnamenti devono essere uguali a quelli scelti per il docente."))
                return
            }
            if (materia_0) {
                if (materia_2[0].trimEnd().trimStart() === materia_0[0].trimEnd().trimStart()) {
                    res.redirect("/admin/crea_docente" + get_error_parm("Bisogna inserire insegnamenti diversi"))
                    return
                }
            }
            if (materia_1) {
                if (materia_2[0].trimEnd().trimStart() === materia_1[0].trimEnd().trimStart()) {
                    res.redirect("/admin/crea_docente" + get_error_parm("Bisogna inserire insegnamenti diversi"))
                    return
                }
            }
        }
        if (req.body.materia_3 !== 'Campo vuoto') {
            materia_3 = req.body.materia_3.split("_")
            cfu_3 = parseInt(req.body.materia_3.split(":")[req.body.materia_3.split(":").length - 1].trimStart().trimEnd())
            tot_cfu += cfu_3
            if (ssd !== materia_3[1].trimEnd().trimStart()) {
                res.redirect("/admin/crea_docente" + get_error_parm("Gli SSD degli insegnamenti devono essere uguali a quelli scelti per il docente."))
                return
            }
            if (materia_0) {
                if (materia_3[0].trimEnd().trimStart() === materia_0[0].trimEnd().trimStart()) {
                    res.redirect("/admin/crea_docente" + get_error_parm("Bisogna inserire insegnamenti diversi"))
                    return
                }
            }
            if (materia_1) {
                if (materia_3[0].trimEnd().trimStart() === materia_1[0].trimEnd().trimStart()) {
                    res.redirect("/admin/crea_docente" + get_error_parm("Bisogna inserire insegnamenti diversi"))
                    return
                }
            }
            if (materia_2) {
                if (materia_3[0].trimEnd().trimStart() === materia_2[0].trimEnd().trimStart()) {
                    res.redirect("/admin/crea_docente" + get_error_parm("Bisogna inserire insegnamenti diversi"))
                    return
                }
            }
        }
        if (tot_cfu == 0) {
            res.redirect("/admin/crea_docente" + get_error_parm("Selezionare qualche insegnamento"))
            return
        }
        if (tot_cfu < 12 || tot_cfu > 21) {
            res.redirect("/admin/crea_docente" + get_error_parm("Il totale dei cfu deve essere compreso tra 12 e 21"))
            return
        }
        db.get('select MAX(id) from Docenti', (err, row) => {
            if (err) {
                console.log(err)
                return
            }
            var id = 8000 
            if (row['MAX(id)'] !== null) {
                id = row['MAX(id)']
                id += 25
            }
            db.run("INSERT INTO Docenti (id, nome, cognome, ssd, password)" +
                   ` VALUES (${id}, \"${nome}\", \"${cognome}\", \"${ssd}\", \"${password}\")`, (err) => {
                var sql = ""
                if (materia_0) {
                    sql += `update Insegnamenti set id_docente = ${id} where id = ${materia_0[0].trimEnd().trimStart()}\n;`
                }
                if (materia_1) {
                    sql += `update Insegnamenti set id_docente = ${id} where id = ${materia_1[0].trimEnd().trimStart()}\n;`
                }
                if (materia_2) {
                    sql += `update Insegnamenti set id_docente = ${id} where id = ${materia_2[0].trimEnd().trimStart()}\n;`
                }
                if (materia_3) {
                    sql += `update Insegnamenti set id_docente = ${id} where id = ${materia_3[0].trimEnd().trimStart()}\n;`
                }
                db.exec(sql, err => {
                    if (err) {
                        console.log(err)
                        return
                    }
                    res.redirect("/admin/admin_page" + get_text_parm("Docente creato correttamente"))
                })
            })
        })

    })
})

// -----------------------------------
//        POST ELIMINA DOCENTE
// -----------------------------------

server.post("/admin/elimina_docente", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    docente = req.body.docente
    nome = docente.split(" ")[0].trimEnd().trimStart()
    cognome = docente.split(" ")[1].trimEnd().trimStart()
    db.run(`delete from Docenti where nome = \"${nome}\" and ` + 
            `cognome = \"${cognome}\"`,(err)=> {
        if (err) {
            console.log(err)
            return
        }
        res.redirect("/admin/admin_page" + get_text_parm("Docente rimosso con successo."))
    })
})

// -----------------------------------
//        POST ASSOCIA INSEGNAMENTO
// -----------------------------------

server.post("/admin/associa_insegnamento", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    docente = req.body.docente
    materia = req.body.materia

    id_materia = materia.split("_")[0].trimEnd().trimStart()
    ssd_materia = materia.split("_")[1].trimEnd().trimStart()
    cfu_materia = materia.split(":")[materia.split(":").length - 1].trimEnd().trimStart()
    nome = docente.split(" ")[0].trimEnd().trimStart()
    cognome = docente.split(" ")[1].trimEnd().trimStart()
    db.get(`select * from Docenti where nome = \"${nome}\" and ` + 
            `cognome = \"${cognome}\"`,(err, docente)=> {
        if (err) {
            console.log(err)
            return
        }
        // TODO: CONTROLLA CHE L'SSD COMBACI e che i cfu del docente
        db.get(`select sum(cfu) from Insegnamenti where ` +
                `id_docente = ${docente.id}`, (err, ritorno)=> {
            if (ritorno['sum(cfu)'] === null) ritorno['sum(cfu)'] = 0
            if (ritorno['sum(cfu)'] >= 21) {
                res.redirect("/admin/associa_insegnamento" +
                    get_error_parm(`Impossibile associare l insegnamento al docente ${nome} ${cognome}\n` + 
                    "Questo docente ha " + ritorno['sum(cfu)'] + "CFU assegnati"))
                return
            }
            
            somma = ritorno['sum(cfu)'] + parseInt(cfu_materia, 10)
            if (somma > 21) {
                res.redirect("/admin/associa_insegnamento" +
                    get_error_parm(`Impossibile associare l insegnamento al docente ${nome} ${cognome}\n` + 
                    `La somma dei CFU assegnati sarebbe ${somma}`))
                return
            }
            if (ssd_materia !== docente.ssd) {
                res.redirect("/admin/associa_insegnamento" +
                    get_error_parm("SSD del insegnamento e del docente devono combaciare"))
                return
            }
            db.run(`update Insegnamenti set id_docente = ${docente.id} where id = ${id_materia}`, err => {
                if (err) {
                    console.log(err)
                    return
                }
                res.redirect("/admin/admin_page" + get_text_parm("Insegnamento associato con successo"))
            })
        })
    })
})

// -----------------------------------
//        GET ASSOCIA INSEGNAMENTO
// -----------------------------------

server.get("/admin/associa_insegnamento", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    db.all("select * from Docenti order by nome", (err, docenti)=> {
        if (err) {
            console.log(err)
            return
        }
        db.all("select * from Insegnamenti where id_docente is null and " +
                "nome <> \"Tesi\" and nome <> \"Tirocinio\" and " +
                "nome <> \"Prova finale\" order by ssd", (err, materie)=> {
            if (err) {
                console.log(err)
                return
            }
            docenti = docenti.filter(docente => docente.nome !== "" && docente.nome !== "Da assegnare")
            res.render('admin/associa_insegnamento', {
                docenti,
                materie,
                utente: req.session.utente,
                path: '/admin/associa_insegnamento',
                depth: 2
            })
        })
    })
})

// -----------------------------------
//        GET ELIMINA DOCENTE
// -----------------------------------

server.get("/admin/elimina_docente", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    db.all("select * from Docenti order by nome", (err, docenti)=> {
        if (err) {
            console.log(err)
            return
        }
        docenti = docenti.filter(docente => docente.nome !== "" && docente.nome !== "Da assegnare")
        res.render('admin/elimina_docente', {
            docenti,
            utente: req.session.utente,
            path: '/admin/elimina_docente',
            depth: 2
        })
    })
})

// -----------------------------------
//        GET CREA DOCENTE
// -----------------------------------

server.get("/admin/crea_docente", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    db.all("select * from Insegnamenti where id_docente is null and " +
            "nome <> \"Tesi\" and nome <> \"Tirocinio\" and " +
            "nome <> \"Prova finale\" order by ssd", (err, materie)=> {
        if (err) {
            console.log(err)
            return
        }
        res.render('admin/crea_docente', {
            materie,
            utente: req.session.utente,
            path: '/admin/crea_docente',
            depth: 2,
            lista_ssd
        })
    })
})

// -----------------------------------
//        GET CREA CDS
// -----------------------------------

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
                materie_attive,
                utente: req.session.utente,
                path: '/admin/crea_cds',
                depth: 2,
                lista_materie_ssd: lista_materie_ssd
            })
        });
    })
})

// -----------------------------------
//        GET ADMIN PAGE
// -----------------------------------

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
    //console.log("input:", nome, cognome, password)
    db.serialize(() => {
        db.get(`SELECT * FROM Docenti WHERE nome = \"${nome}\" AND ` +
                `cognome = \"${cognome}\"`, (err, row) => {
            if (err)
                console.log(err);
            else {
                if (typeof row === 'undefined') {
                    console.log("Non esiste docente con tale nome e cognome");
                    db.get(`select * from Studente where nome = "${nome}" and cognome = "${cognome}"`, (err, studente) => {
                        if (typeof studente === 'undefined') {
                            console.log("Non esiste Studente con tale nome e cognome");
                            res.redirect("/" + get_error_parm("Username o password non corretta."))
                            return
                        }
                        if (studente.nome === nome &&
                                studente.cognome === cognome &&
                                bcrypt.compareSync(password, studente.password)) {
                            console.log("Accesso studente verificato")
                            req.session.utente = {
                                tipo : 'studente',
                                id : studente.matricola,
                                corso: studente.id_corso,
                                nome : nome,
                                cognome : cognome,
                                anno : (studente.anno === null? undefined : studente.anno),
                                seconda_tassa : (studente.rate_pagate == 2 ? true : false)
                            }
                            res.redirect('/')
                            return
                        } else {
                            console.log("Incorrect password for studente");
                            res.redirect("/" + get_error_parm("Username o password non corretta."))
                            return  
                        }
                    })
                } else {
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
                        res.redirect('/')
                        return
                    } else {
                        console.log("Incorrect password for docente");
                        res.redirect("/" + get_error_parm("Username o password non corretta."))
                        return     
                    }
                }
            }
            // if (req.query.callback) {
            //     res.redirect(req.query.callback)
            // } else {
            //     res.redirect('/' + get_error_parm("no callback param"))
            // }
        });
    });
})

server.get('/manifesto/:id_cds', (req, res) => {
    var id_corso = req.params.id_cds
    db.serialize(() => {
        db.all(`SELECT P.id_insegnamento, P.anno, P.blocco, ` +
                `P.scelta, I.nome AS nome_insegnamento, I.cfu, ` +
                `I.scheda_trasparenza, I.ssd, I.id_docente, ` +
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
                    id_corso,
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

const storage = multer.diskStorage({                                                            //crea una nuova istanza del "disco virtuale"
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/');                                                            // imposta il percorso dei file caricati
    },

    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + req.body.codice + path.extname(file.originalname));     //imposta il nome e l'estensione che il file salvato deve avere
    }
});

server.post('/upload', (req, res) => {
    if(!assert_you_are_docente(req,res)) return;
    let upload = multer({ storage: storage, fileFilter: helpers.pdfFilter }).single('scheda_trasparenza');

    upload(req, res, function(err) {
        // req.file contains information of uploaded file
        // req.body contains information of text fields, if there were any

        if (req.fileValidationError) {
            //return res.send(req.fileValidationError);
            return res.redirect('/portale' + get_text_parm("Solo PDF accettati!"));
        }
        else if (!req.file) {
            //return res.send('Seleziona un PDF da caricare.');
            return res.redirect('/portale' + get_text_parm("Seleziona un PDF da caricare"));
        }
        else if (err instanceof multer.MulterError) {
            return res.send(err);
        }
        else if (err) {
            return res.send(err);
        }

        var codice = req.body.codice;
        var docente = req.session.utente.id;

        var sql = `UPDATE Insegnamenti SET scheda_trasparenza = TRUE WHERE id = ${codice} AND id_docente = ${docente};`
        db.exec(sql, (err,row) => {
            if (err) {
                console.log(err)
                return
            }
            console.log(`PDF CARICATO`);
            return res.redirect('/portale' + get_text_parm("Scheda di trasparenza caricata!"));
        })
        
    });
});

server.post('/download', (req,res) => {
    var file = `${__dirname}/public/uploads/scheda_trasparenza-${req.body.download}.pdf`;
    res.download(file);
});


// -----------------------------------
//        GET ORARI RICEVIMENTI
// -----------------------------------

server.get("/admin/orari_ricevimenti", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    db.serialize(() => {
        db.all(`SELECT id, nome, cognome, inizio_ricevimento, fine_ricevimento FROM Docenti WHERE id != 0 AND id != -1 AND (inizio_ricevimento is null AND fine_ricevimento is null) ORDER BY nome`, (err, rows) => {
            if (err) {
                console.log(err)
                res.redirect('/' + get_error_parm("errore: 5432"))
            } else {
                if (rows.length == 0) {
                    res.redirect('/admin/admin_page' + get_error_parm(`Non esistono docenti senza orario di ricevimento assegnato`))
                    return
                }
                //console.log(rows);
                res.render('admin/orari_ricevimenti', {
                    rows: rows,
                    utente: req.session.utente,
                    path: '/admin/orari_ricevimenti',
                    depth : 2
                })
            }
        })
    })
})

server.post("/admin/orari_ricevimenti", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    var docente = req.body.docente.trimStart().trimEnd().split(' - ');
    var id = docente[0];
    var cognomenome = docente[1].trimStart().trimEnd().split(' ');
    var cognome = cognomenome[1];
    var nome = cognomenome[0];
    var inizio = req.body.inizio;
    var fine = req.body.fine;

    // console.log(req.body);
    // console.log(typeof req.body.inizio);

    var sql = `UPDATE Docenti SET inizio_ricevimento = \"${inizio}\", fine_ricevimento = \"${fine}\" WHERE id = ${id};`
    db.exec(sql, (err,row) => {
        if (err) {
            console.log(err)
            return
        }
        res.redirect('/admin/admin_page' + get_text_parm("Inserimento avvenuto con successo"))
    })
});

// -----------------------------------
//        GET CREA STUDENTE
// -----------------------------------

server.get("/admin/crea_studente", (req, res) => {
    if (!assert_you_are_admin(req, res)) return
    db.serialize(() => {
        db.all(`SELECT MAX(matricola) FROM Studente`, (err, rows) => {
            if (err) {
                console.log(err)
                res.redirect('/' + get_error_parm("errore: 8667"))
                return
            }
            // if (rows[0]['MAX(matricola)'] === null) {
            //     console.log('Non esistono studenti');
            // }
            db.all(`SELECT * FROM CDS`, (err, cds) => {
                if (err) {
                    console.log(err)
                    res.redirect('/' + get_error_parm("errore: 5432"))
                    return
                }
                //console.log(rows);
                res.render('admin/crea_studente', {
                    cds: cds,
                    rows: rows,
                    utente: req.session.utente,
                    path: '/admin/crea_studente',
                    depth : 2
                })
            })
        })
    })
});

// -----------------------------------
//        POST CREA STUDENTE
// -----------------------------------

server.post("/admin/crea_studente", (req, res) => {
    if (!assert_you_are_admin(req, res)) return 
    var matricola = req.body.matricola;
    var nome = req.body.nome.trimStart().trimEnd().toUpperCase();
    var cognome = req.body.cognome.trimStart().trimEnd().toUpperCase();
    db.get(`select count(*) from Studente where nome = \"${nome}\" and cognome = \"${cognome}\"`, (err,ret) => {
        if (err) {
            console.log(err)
            return
        }
        //console.log(ret)
        if (ret['count(*)'] > 0) {
            res.redirect("/admin/crea_studente" + get_error_parm("Esiste gia' uno studende con questo nome e cognome"))
            return
        }
        var password1 = req.body.password1;
        var password2 = req.body.password2;
        if (password1 !== password2) {
            res.redirect('/admin/crea_studente' + get_error_parm("Le password devono coincidere"))
            return
        }
        var password = bcrypt.hashSync(password1, 10)
        var corso = req.body.corso.trimStart().trimEnd().split(' ');
        var id = corso[1].trimStart().trimEnd()//.split(' - ');
        //var id = corso2[0];
    
        var sql = `INSERT INTO Studente (matricola, nome, cognome, password, id_corso) VALUES (${matricola},  \"${nome}\", \"${cognome}\", \"${password}\", ${id});`
        db.exec(sql, (err,row) => {
            if (err) {
                console.log(err)
                return
            }
            //req.session.utente.id_cds = corso
            res.redirect('/admin/crea_studente' + get_text_parm("Inserimento avvenuto con successo"))
        })
    })
})

// -----------------------------------
//        POST PAGA SECONDA TASSA
// -----------------------------------

server.post("/studente/paga_seconda_tassa", (req, res) => {
    if (!assert_you_are_studente(req, res)) return
    db.run(`update Studente set rate_pagate = 2 where ` + 
            `nome = \"${nome}\" and cognome = \"${cognome}\"`, err => {
        req.session.utente.seconda_tassa = true
        res.redirect("/portale")
    })
})

// -----------------------------------
//        GET PAGA SECONDA TASSA
// -----------------------------------

server.get("/studente/paga_seconda_tassa", (req, res) => {
    if (!assert_you_are_studente(req, res)) return
    nome = req.session.utente.nome.toUpperCase()
    cognome = req.session.utente.cognome.toUpperCase()
    db.get(`select * from Studente where nome = \"${nome}\" and cognome = \"${cognome}\"`, (err, studente) => {
        if (err) {
            console.log(err)
            return
        }
        res.render('studente/paga_seconda_tassa', {
            studente,
            utente: req.session.utente,
            path: '/studente/paga_seconda_tassa',
            depth : 2
        })
    })
})

// -----------------------------------
//        GET SELEZIONA INSEGNAMENTI A SCELTA
// -----------------------------------

server.get("/studente/seleziona_insegnamenti_scelta/:insegnamento/:blocco", (req, res) => {
    if (!assert_you_are_studente(req, res)) return
    nome = req.session.utente.nome.toUpperCase()
    cognome = req.session.utente.cognome.toUpperCase()
    matricola = req.session.utente.id
    id_cds = req.session.utente.corso
    blocco = req.params.blocco
    insegnamento = req.params.insegnamento
    db.run(`INSERT into InsegnamentiScelti (matricola, id_insegnamento, ` + 
            `blocco) values (${matricola}, ${insegnamento}, ${blocco})`, err => {
        if (err) {
            console.log(err)
            return
        }        
        res.redirect("/studente/seleziona_insegnamenti_scelta" + get_text_parm("Insegnamento selezionato con successo"))
    })
})

// -----------------------------------
//        GET SELEZIONA INSEGNAMENTI A SCELTA
// -----------------------------------

server.get("/studente/seleziona_insegnamenti_scelta", (req, res) => {
    if (!assert_you_are_studente(req, res)) return
    nome = req.session.utente.nome.toUpperCase()
    cognome = req.session.utente.cognome.toUpperCase()
    matricola = req.session.utente.id
    id_cds = req.session.utente.corso
    db.all(`select DISTINCT * from Insegnamenti as I, Programmi as P ` +
            `where P.id_corso = ${id_cds} and I.id = P.id_insegnamento and ` +
            `P.scelta = true`, (err, materie_scelta) => {
        db.all(`select distinct * from InsegnamentiScelti ` +
                `where matricola = ${matricola}`, (err, materie_scelte) => {
            if (err) {
                console.log(err)
                return
            }
            if (materie_scelta.length == 0) {
                res.redirect("/portale" + get_text_parm("Non ci sono materie a scelta nel corso di studi."))
                return
            }
            res.render('studente/seleziona_materia_scelta', {
                materie_scelta,
                materie_scelte,
                utente: req.session.utente,
                path: '/studente/seleziona_materia_scelta',
                depth : 2
            })
        })
    })
})

// -----------------------------------
//        GET CERTIFICATO CARRIERA
// -----------------------------------

server.get("/studente/certificato_carriera", (req, res) => {
    if (!assert_you_are_studente(req, res)) return
    nome = req.session.utente.nome.toUpperCase()
    cognome = req.session.utente.cognome.toUpperCase()
    id_cds = req.session.utente.corso
    matricola = req.session.utente.id
    db.all(`select DISTINCT * from Studente as S, Insegnamenti as I, ` + 
            `Esami as E where S.nome = \"${nome}\" and ` +
            `S.cognome = \"${cognome}\" and E.matricola = ` +
            `S.matricola and I.id = E.id_insegnamento ` +
            `and E.firma = true` , (err, materie_firmate) => {
        db.all(`select DISTINCT * from Insegnamenti as I, Programmi as P ` +
                `where P.id_corso = ${id_cds} and ` +
                `I.id = P.id_insegnamento and ` +
                `P.scelta = false order by P.anno`, (err, materie_cds_non_scelta) => {
            db.all(`select DISTINCT P.anno, I.nome, I.id, I.cfu from Insegnamenti as I, Programmi as P, CDS as C, Studente as S ` +
                    `where P.id_corso = C.id and S.id_corso = C.id and ` +
                    `S.matricola = ${matricola} and ` +
                    `I.id = P.id_insegnamento and ` +
                    `P.scelta = false order by P.anno`, (err, materie_cds_scelta) => {
                db.all(`select DISTINCT * from InsegnamentiScelti as scelta, Insegnamenti as I, ` +
                        `Programmi as P where P.id_corso = ${id_cds} and P.id_insegnamento = I.id and ` +
                        `scelta.matricola = ${matricola} and ` +
                        `I.id = scelta.id_insegnamento`, (err, materie_scelte) => {
                    if (err) {
                        console.log(err)
                        return
                    }
                    materie = materie_cds_non_scelta.concat(materie_scelte)
                    materie.sort((a,b) => {
                        if (a.anno > b.anno) return 1
                        else if (a.anno < b.anno) return -1
                        else 0
                    })
                    // materie_sostenute = get_lista_unica(materie_sostenute)
                    // lista_materie = get_lista_unica(lista_materie)
                    // console.log(lista_materie)
                    //console.log(materie_sostenute)
                    res.render('studente/certificato_carriera', {
                        materie_firmate,
                        materie,
                        materie_scelte,
                        materie_cds_non_scelta,
                        materie_cds_scelta,
                        utente: req.session.utente,
                        path: '/studente/certificato_carriera',
                        depth : 2
                    })
                })
            })
        })
    })
})

server.post("/crea_ricevimento", (req, res) => {
    if(!assert_you_are_docente(req,res)) return;    

    var codice = req.body.codice1;
    var data = req.body.data.trimStart().trimEnd();
    var inizio = req.body.inizio.trimStart().trimEnd();
    var durata = req.body.durata;
    var num = req.body.studenti;
    
    var sql = `INSERT INTO Ricevimenti (id_docente, id_materia, giorno, ora, durata, numstudenti) VALUES (${req.session.utente.id},  ${codice}, \"${data}\", \"${inizio}\", ${durata}, ${num});`
    db.exec(sql, (err,row) => {
        if (err) {
            console.log(err)
            return
        }
        res.redirect('/portale' + get_text_parm("Inserimento avvenuto con successo"))
    })

})


server.get("/studente/iscrizione_anno", (req,res) => {
    if(!assert_you_are_studente(req,res)) return; 
    utente = req.session.utente.id;

    db.serialize(() => {
        db.get(`SELECT * FROM Studente WHERE matricola = ${req.session.utente.id}`, (err, rows) => {
            if (err) {
                console.log(err)
                res.redirect('/' + get_error_parm("errore: 8667"))
                return
            }

            res.render('studente/iscrizione_anno', {
                rows: rows,
                utente: req.session.utente,
                path: '/studente/iscrizione_anno',
                depth : 2
            })
        })
    })
})

server.post("/studente/iscrizione_anno", (req,res) => {
    if(!assert_you_are_studente(req,res)) return; 
    utente = req.session.utente.id;
    //console.log(utente);
    var reddito = req.body.reddito;
    var anno = req.body.anno;
    // console.log(reddito);
    // console.log(anno);
    // console.log(req.body.tasse);
    
    var sql = `UPDATE Studente SET reddito = ${reddito}, anno = ${anno}, rate_pagate = 1 WHERE matricola = ${utente};`
    db.exec(sql, (err,row) => {
        if (err) {
            console.log(err)
            return
        }
        req.session.utente.anno = anno
        req.session.utente.seconda_tassa = false
        res.redirect('/studente/iscrizione_anno' + get_text_parm("Iscrizione effettuata con successo"))
    })
})

// -----------------------------------
//      POST ISCRIZIONE RICEVIMENTO
// -----------------------------------

server.get("/studente/iscrizione_ricevimento/:id_ricevimento", (req,res) => {
    if(!assert_you_are_studente(req,res)) return;
    id_ricevimento = req.params.id_ricevimento;
    matricola = req.session.utente.id
    db.run(`INSERT INTO IscrizioneRicevimenti values (` + 
            `${id_ricevimento}, ${matricola})`, err => {
        if (err) {
            console.log(err)
            return
        }
        res.redirect("/studente/iscrizione_ricevimento" + get_text_parm("Iscrizione avvenuta con successo!"))
    })
});

// -----------------------------------
//      GET ISCRIZIONE RICEVIMENTO
// -----------------------------------

server.get("/studente/iscrizione_ricevimento", (req,res) => {
    if(!assert_you_are_studente(req,res)) return;
    id_cds = req.session.utente.corso
    matricola = req.session.utente.id
    db.all(`select distinct R.id as id_ricevimento, I.id as id_insegnamento, I.nome as denominazione, ` +
            `D.nome, D.cognome, R.giorno, R.ora, R.durata, R.numstudenti as max_studenti ` +
            `from Ricevimenti as R , Insegnamenti as I, Docenti as D where ` + 
            `R.id_materia in (select I.id from Insegnamenti as I, Programmi as P where ` +
            `P.id_corso = ${id_cds} and I.id = P.id_insegnamento) ` +
            `and I.id = R.id_materia and R.id_docente = D.id`, (err,ricevimenti) => {
        db.all(`select id_ricevimento as id from IscrizioneRicevimenti where ` +
                `matricola = ${matricola}`, (err, ric_iscritti) => {
            db.all("select id_ricevimento, count(*) as num from IscrizioneRicevimenti " +
                    "group by id_ricevimento", (err, count_iscritti) => {
                if (err) {
                    console.log(err)
                    return
                }
                //console.log(ricevimenti)
                res.render('studente/iscrizione_ricevimento', {
                    count_iscritti,
                    ric_iscritti,
                    ricevimenti,
                    utente: req.session.utente,
                    path: '/studente/iscrizione_ricevimento',
                    depth : 2
                })  
            })
        })
    })
})

server.get("/studente/iscrizione_esami", (req,res) => {
    if(!assert_you_are_studente(req,res)) return; 
    matricola = req.session.utente.id;
    id_cds = req.session.utente.corso;
    db.serialize(() => {
        db.all(`SELECT DISTINCT P.anno, I.id as id, I.nome as nome, I.cfu as cfu, I.ssd as ssd FROM Insegnamenti as I, Programmi as P ` +
                `WHERE P.id_insegnamento = I.id AND P.id_corso = ${id_cds} and ` +
                `I.id NOT IN ( SELECT id_insegnamento FROM Esami WHERE matricola = ${matricola}) and ` +
                `P.scelta = false order by P.anno`, (err, rows) => {
            db.all(`select DISTINCT * from InsegnamentiScelti as scelta, Insegnamenti as I, ` +
                    `Programmi as P where P.id_corso = ${id_cds} and P.id_insegnamento = I.id and ` +
                    `scelta.matricola = ${matricola} and ` +
                    `I.id = scelta.id_insegnamento and ` +
                    `I.id NOT IN ( SELECT id_insegnamento FROM Esami WHERE matricola = ${matricola})`, (err, materie_scelte) => {
                db.get(`SELECT rate_pagate from Studente WHERE matricola = ${matricola} `, (err, rate) => {
                    if (err) {
                        console.log(err)
                        return
                    }
                    rows = rows.concat(materie_scelte)
                    res.render('studente/iscrizione_esami', {
                        rows: rows,
                        rate,
                        utente: req.session.utente,
                        path: '/studente/iscrizione_esami',
                        depth : 2
                    })
                })
            })
        })
    })
})

server.post("/studente/iscrizione_esami", (req,res) => {
    if(!assert_you_are_studente(req,res)) return; 
    utente = req.session.utente;
    var codice = req.body.codice;
    // console.log(utente);
    // console.log(codice);
    
    var sql = `INSERT INTO Esami (matricola, id_insegnamento) VALUES (${utente.id}, ${codice});`
    db.exec(sql, (err,row) => {
        if (err) {
            console.log(err)
            return
        }
        res.redirect('/studente/iscrizione_esami' + get_text_parm("Iscrizione effettuata con successo"))
    })
})

server.get("/studente/accetta_esiti", (req,res) => {
    if(!assert_you_are_studente(req,res)) return; 
    matricola = req.session.utente.id;
    db.serialize(() => {
        db.all(`SELECT DISTINCT I.id as id, I.nome as nome, I.cfu as cfu, I.ssd as ssd, E.voto as voto, E.lode FROM Insegnamenti as I, Programmi as P, Esami as E `
                + `WHERE P.id_insegnamento = I.id AND P.id_corso = ${req.session.utente.corso} AND I.id = E.id_insegnamento AND E.matricola = ${matricola} `
                + `AND I.id IN ( SELECT id_insegnamento FROM Esami WHERE matricola = ${matricola} AND sostenuto = true AND firma = false)`
                , (err, rows) => {
            if (err) {
                console.log(err)
                res.redirect('/' + get_error_parm("errore: 8667"))
                return
            }
            res.render('studente/accetta_esiti', {
                rows: rows,
                utente: req.session.utente,
                path: '/studente/accetta_esiti',
                depth : 2
            })
        })
    })
})

server.get("/studente/verbalizza/:materia", (req,res) => {
    if(!assert_you_are_studente(req,res)) return; 
    materia = req.params.materia;
    res.render('studente/verbalizza', {
                utente: req.session.utente,
                path: '/studente/verbalizza/' + materia,
                depth : 3
            })
})


server.post("/studente/verbalizza/:materia", (req,res) => {
    if(!assert_you_are_studente(req,res)) return; 
    id = req.session.utente.id;
    nome = req.session.utente.nome;
    cognome = req.session.utente.cognome;
    materia = req.params.materia;

    try {
        username = req.body.username.trimStart().trimEnd().split('.');
        nome2 = username[0].toUpperCase();
        cognome2 = username[1].toUpperCase();
        password = req.body.password.trimStart().trimEnd();

    } catch {
        console.log("Incorrect username");
        res.redirect("/studente/verbalizza/" + materia + get_error_parm("Username o password non corretta."))
        return;
    }

    db.serialize(() => {
        db.get(`SELECT password FROM Studente WHERE matricola = ${id}`, (err, pswStudente) => {
            if (err) {
                console.log(err)
                res.redirect('/studente/verbalizza/:materia' + get_error_parm("errore: 8667"))
                return
            }
            if (nome === nome2 && cognome === cognome2 && bcrypt.compareSync(password, pswStudente.password)) {
                db.all(`SELECT * FROM Esami WHERE matricola = ${id} AND id_insegnamento = ${materia} AND sostenuto = true`, (err, esame) => {
                    if (err) {
                        console.log(err)
                        res.redirect('/studente/accetta_esiti' + get_error_parm("errore: 8667"))
                        return
                    }
                    if (esame.length == 0) {
                        res.redirect('/studente/accetta_esiti' + get_error_parm(`Non hai sostenuto questo esame`))
                        return
                    } else {
                        var sql = `UPDATE Esami SET firma = true WHERE matricola = ${id} AND id_insegnamento = ${materia};`
                        db.exec(sql, (err,row) => {
                            if (err) {
                                console.log(err)
                                return
                            }
                            res.redirect('/studente/accetta_esiti' + get_text_parm("Esame firmato con successo"))
                        })
                    }
                })
            } else {
                res.redirect('/studente/verbalizza/' + materia + get_text_parm("Username o password errati."))
                return
            }

        })
    })
})

server.get("/convalida/:materia/:matricola", (req,res) => {
    if(!assert_you_are_docente(req,res)) return; 
    utente = req.session.utente.id;
    materia = req.params.materia;
    matricola = req.params.matricola;

    db.serialize(() => {
        db.get(`SELECT * FROM Esami WHERE matricola = ${matricola} AND id_insegnamento = ${materia} AND sostenuto = false`, (err, rows) => {
            if (err) {
                console.log(err)
                res.redirect('/portale' + get_error_parm("errore: Id insegnamento o matricola errati."))
                return
            }

            res.render('convalida', {
                rows: rows,
                utente: req.session.utente,
                path: '/convalida/' + materia + '/' + matricola,
                depth : 3
            })
        })
    })
})

server.post("/convalida/:materia/:matricola", (req,res) => {
    if(!assert_you_are_docente(req,res)) return; 
    utente = req.session.utente.id;
    materia = req.params.materia;
    matricola = req.params.matricola;
    domande = req.body.domande;
    voto = req.body.voto;
    // lode = req.body.lode;
    // console.log(lode);
    // console.log(typeof lode);

    if(voto == 31) {
        var sql = `UPDATE Esami SET domande = \"${domande}\", voto = 30, lode = true, sostenuto = true WHERE matricola = ${matricola} AND id_insegnamento = ${materia};`
    } else {
        var sql = `UPDATE Esami SET domande = \"${domande}\", voto = ${voto}, lode = false, sostenuto = true WHERE matricola = ${matricola} AND id_insegnamento = ${materia};`
    }
    
    db.exec(sql, (err,row) => {
        if (err) {
            console.log(err)
            return
        }
        res.redirect('/portale' + get_text_parm("Esame convalidato!"))
    })
})

server.get("/admin/convalida_tirocini", (req,res) => {
    if(!assert_you_are_admin(req,res)) return; 
    utente = req.session.utente.id;

    db.serialize(() => {
        db.all(`SELECT DISTINCT I.id as id_tirocinio, C.id as id_corso, C.nome as nome_corso, E.voto as voto, S.matricola as matricola, S.nome as nome_studente, S.cognome as cognome_studente `
                + `FROM Insegnamenti as I, Programmi as P, Esami as E, Studente as S, CDS as C `
                + `WHERE P.id_insegnamento = I.id AND P.id_corso = C.id AND S.id_corso = C.id AND E.matricola = S.matricola AND E.id_insegnamento = I.id AND I.nome = \"Tirocinio\" AND E.sostenuto = FALSE`, (err, rows) => {
                //+ `AND I.id IN ( SELECT E.id_insegnamento FROM Esami,  WHERE matricola = ${matricola} AND sostenuto = true AND firma = false)`, (err, rows) => {
            if (err) {
                console.log(err)
                res.redirect('/portale' + get_error_parm("errore: 23626"))
                return
            }

            res.render('admin/convalida_tirocini', {
                rows: rows,
                utente: req.session.utente,
                path: '/admin/convalida_tirocini',
                depth : 2
            })
        })
    })
})

server.post("/admin/convalida_tirocini", (req,res) => {
    if(!assert_you_are_admin(req,res)) return; 
    matricola = req.body.matricola;
    id_tirocinio = req.body.id_tirocinio;

    var sql = `UPDATE Esami SET sostenuto = true, firma = true WHERE matricola = ${matricola} AND id_insegnamento = ${id_tirocinio};`    
    db.exec(sql, (err,row) => {
        if (err) {
            console.log(err)
            return
        }
        res.redirect('/admin/convalida_tirocini' + get_text_parm("Tirocinio convalidato!"))
    })
})

server.get("/admin/convalida_prove_finali", (req,res) => {
    if(!assert_you_are_admin(req,res)) return; 
    utente = req.session.utente.id;

    db.serialize(() => {
        db.all(`SELECT DISTINCT I.id as id_prova, I.nome, C.id as id_corso, C.nome as nome_corso, E.voto as voto, S.matricola as matricola, S.nome as nome_studente, S.cognome as cognome_studente `
                + `FROM Insegnamenti as I, Programmi as P, Esami as E, Studente as S, CDS as C `
                + `WHERE P.id_insegnamento = I.id AND P.id_corso = C.id AND S.id_corso = C.id AND E.matricola = S.matricola AND E.id_insegnamento = I.id AND (I.nome = \"Prova finale\" OR I.nome = \"Tesi\") AND E.sostenuto = FALSE`, (err, rows) => {
                //+ `AND I.id IN ( SELECT E.id_insegnamento FROM Esami,  WHERE matricola = ${matricola} AND sostenuto = true AND firma = false)`, (err, rows) => {
            if (err) {
                console.log(err)
                res.redirect('/portale' + get_error_parm("errore: 23626"))
                return
            }

            res.render('admin/convalida_prove_finali', {
                rows: rows,
                utente: req.session.utente,
                path: '/admin/convalida_prove_finali',
                depth : 2
            })
        })
    })
})

server.post("/admin/convalida_prove_finali", (req,res) => {
    if(!assert_you_are_admin(req,res)) return; 
    matricola = req.body.matricola;
    id_prova = req.body.id_prova;
    voto = req.body.voto;

    var sql = `UPDATE Esami SET sostenuto = true, firma = true, voto = ${voto} WHERE matricola = ${matricola} AND id_insegnamento = ${id_prova};`    
    db.exec(sql, (err,row) => {
        if (err) {
            console.log(err)
            return
        }
        res.redirect('/admin/convalida_tirocini' + get_text_parm("Prova finale/Tesi convalidata!"))
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

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('', str => {
    print_query(str)
    readline.close();
});