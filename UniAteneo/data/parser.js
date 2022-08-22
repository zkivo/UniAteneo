const bcrypt  = require('bcrypt');
const parse5 = require('parse5');
const fs = require('fs');
const { list } = require('tar');
const { last } = require('prelude-ls');

const names = fs.readFileSync('random_names_fossbytes.csv', { encoding: 'utf8', flag: 'r' }).split('\n');
const xpath_json = JSON.parse(fs.readFileSync('xpaths.json', { encoding: 'utf8', flag: 'r' }))
const CFU_MATERIE_SCELTA = 3
var file_names = fs.readdirSync(process.cwd())
var docenti = []

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
function get_rand_name_cogn() {
    n = Math.floor(Math.random() * names.length);
    s = names[n].trimStart().trimEnd().split(' ');
    nome = s[s.length - 2].toUpperCase();
    cogn = s[s.length - 1].split('-')[0].toUpperCase();
    return [nome, cogn]
}
function rand(n) {
    return Math.floor(Math.random() * n)
}
var start_id_corsi = 4600
function get_new_id_corso() {
    return start_id_corsi += 600
}
var start_id_docenti = 6030
function get_new_id_docenti() {
    return start_id_docenti += 30
}
var start_id_insegnamenti = 2020
function get_new_id_insegnamenti() {
    return start_id_insegnamenti += 25
}

function get_lista_unica(lista) {
    app = []
    lista.forEach(e => {
        app.push(JSON.stringify(e))
    })
    app = [...new Set(app)]
    listas = []
    app.forEach(e => {
        listas.push(JSON.parse(e))
    })
    return listas
}

function get_lista_materie(xpath, parsed_html) {
    ret = []
    xpath = xpath.split('/').slice(1);
    function naviga_xpath(obj, index) {
        var xpath_str = xpath[index];
        if (xpath_str.includes('[')) {
            xpath_str = xpath_str.split('[')[0]
        }
        if (obj.tagName === xpath_str) {
            if (index == xpath.length - 1) {
                ret.push(obj);
            } else {
                obj.childNodes.forEach((e, i) => {
                    naviga_xpath(e, index + 1);
                })
            }
        }
    }
    naviga_xpath(parsed_html.childNodes[1], 0)

    var list = []
    var index = 0;
    ret.forEach(e => {
        var i = 0;
        var tipo = 0;
        e.childNodes.forEach(e2 => {
            if (e2.tagName === 'td') {
                i++;
                if (i == 3) {
                    e2.childNodes.forEach(e3 => {
                        if (e3.tagName === 'span') {
                            str = e3.childNodes[0].value.trimStart().trimEnd();
                            if (str === '') {
                                tipo = 1;
                                return;
                            }
                            list.push({
                                id : get_new_id_insegnamenti(),
                                ssd: str.split(' ')[0].trimEnd().trimStart()
                            })
                            index++;
                        }
                    })
                } else if (i == 4) {
                    if (tipo == 0) {
                        //search <a>
                        e2.childNodes.forEach(e3 => {
                            if (e3.tagName === 'a') {
                                list[index-1].nome = e3.childNodes[0].value
                            }
                        })
                    }
                }
            }
        })
    })
    return get_lista_unica(list)
}

function concat_with_new_id(lista1, lista2) {
    temp = lista1.concat(lista2)
    temp = get_lista_unica(temp)
    temp.forEach(e => {
        e.id = get_new_id_insegnamenti()
    })
    return temp
}

function get_lista_cds_lmc(lista) {
    ret = []
    for (i = 0; i < lista.length; i++) {
        e = lista[i]
        for (j = i + 1; j < lista.length; j++) {
            e2 = lista[j]
            if (e.nome === e2.nome &&
                    e.needed_cfu != e2.needed_cfu) {
                ret.push({
                    nome : e.nome,
                    //file_name : e,
                    needed_cfu : 300,
                    id : get_new_id_corso(),
                    //xpath : xpath_json[e],
                    //parsed_html : parsed_html,
                    possibili_materie : concat_with_new_id(e.possibili_materie,e2.possibili_materie),
                    materie_attive : [],
                    materie_scelta_da_attivare : [],
                    materie_scelta : []
                })
            }
        }
    }
    return ret
}

function crea_docente_con_lista(lista, ssd) {
    nomi = get_rand_name_cogn()
    docente = {
        id : get_new_id_docenti(),
        nome : nomi[0],
        cognome : nomi[1],
        ssd : ssd,
        password : bcrypt.hashSync(nomi[1].toLowerCase() + '1234', 10)
    }
    // console.log(".............")
    // console.log(docente,lista,ssd)
    lista_info_cds.forEach(cds => {
        cds.materie_attive.forEach((mat,i) => {
            lista.forEach(mat2 => {
                if (mat.id == mat2.id) {
                    cds.materie_attive[i].docente = docente
                }
            })
        })
    })
}

function is_materia_a_scelta(materia) {
    flag = false
    lista_info_cds.forEach((cds, index) => {
        cds.materie_scelta.forEach(mat => {
            if (mat.id == materia.id) flag = true
        })
    })
    return flag
}

function if_array_includes_materia(array, materia) {
    var flag = false
    array.forEach(e => {
        if (JSON.stringify(e) === JSON.stringify(materia)) 
            flag = true
    })
    return flag
}

file_names = file_names.filter(e => {
    if (e.includes('.htm')) return true
    else return false
})

// CREA LISTA INFO CDS
array = []
lista_info_cds = []
file_names.forEach(e => {
    var needed_cfu
    var nome_cds = e.split('.')[0].split('-')[0].trimEnd()
    temp = e.split('.')[0].split('-')[1].trimStart()
    switch (temp.toUpperCase()) {
        case 'LT':
            needed_cfu = 180
            break
        case 'LM':
            needed_cfu = 120
            break
        default:
            process.exit(1)
    }
    parsed_html = parse5.parse(fs.readFileSync(e, { encoding: 'utf8', flag: 'r' }))
    lista_info_cds.push({
        nome : nome_cds,
        file_name : e,
        needed_cfu : needed_cfu,
        id : get_new_id_corso(),
        xpath : xpath_json[e],
        parsed_html : parsed_html,
        possibili_materie : get_lista_materie(xpath_json[e], parsed_html),
        materie_attive : [],
        materie_scelta_da_attivare : [],
        materie_scelta : []
    })
    array = array.concat(lista_info_cds[lista_info_cds.length - 1].possibili_materie.map(e => {
        return { 
            ssd : e.ssd,
            nome : e.nome
        }
    }))
})
array = get_lista_unica(array)
array.forEach(e => {
    e.nome = e.nome.replace('�', 'à');
})
fs.writeFileSync("per_zanchi.json", JSON.stringify(array, null, 4), {flag:'w'})
return 

// CREA LAUREE MAGISTRALI A CICLO UNICO
lista_info_cds = lista_info_cds.concat(get_lista_cds_lmc(lista_info_cds))

// metti casualmente materie possibili in
// materie a scelta da attivare
lista_info_cds.forEach((element, index) => {
    while (true) {
        r = rand(element.possibili_materie.length)
        var j = []
        for (i = element.possibili_materie.length - 1;
                i >= 0; i--) {
            if (j.length == 2) break;
            if (i != r &&
                    element.possibili_materie[i].ssd ==
                    element.possibili_materie[r].ssd) {
                j.push(i)
            }
        }
        if (j.length == 2) break;
    }
    if (j.length != 2) {
        console.log("errore 2222")
        process.exit(1)
    } else {
        j.forEach(e => {
            temp = element.possibili_materie[e]
            temp.cfu = CFU_MATERIE_SCELTA
            element.materie_scelta_da_attivare.push(
                temp
            )
        })
        temp = element.possibili_materie[r]
        temp.cfu = CFU_MATERIE_SCELTA
        element.materie_scelta_da_attivare.push(
            temp
        )
    }
})

// lista_info_cds.forEach((element, index) => {
//     console.log(element.materie_scelta_da_attivare)
// })


// casualmente picka un cds e i suoi insegnamenti da
// attivare li fa attivare in altri corsi presi random
// che non hanno quei insegnamenti da attivare
// finisce quando tutto è pieno
// ATTIVA LE MATERIE  DA ATTIVARE
var i = 0;
while (true) {
    if (i == lista_info_cds.length) break;
    r = rand(lista_info_cds.length)
    if (lista_info_cds[r].materie_scelta_da_attivare == null) 
        continue;
    while (true) {
        r2 = rand(lista_info_cds.length)
        if (r2 == r) continue;
        num_da_attivare = rand(3) + 1 // numero delle materie di r che saranno da attivare in r2
        //console.log(lista_info_cds[r].materie_scelta_da_attivare, num_da_attivare, lista_info_cds[r].materie_scelta_da_attivare.length)
        for (j = 0; j < num_da_attivare && 
                    j < lista_info_cds[r].materie_scelta_da_attivare.length;
                    j++) {
            if (if_array_includes_materia(
                    lista_info_cds[r2].materie_attive,
                    lista_info_cds[r].materie_scelta_da_attivare[j] )) {
                // console.log(lista_info_cds[r2].materie_attive,
                //     lista_info_cds[r].materie_scelta_da_attivare[j])
                continue
            }
            lista_info_cds[r2].materie_attive.push(
                lista_info_cds[r].materie_scelta_da_attivare[j]
            )
            lista_info_cds[r].materie_scelta.push(
                lista_info_cds[r].materie_scelta_da_attivare[j]
            )
            lista_info_cds[r].materie_scelta_da_attivare.splice(j, 1) // rimuove elemento j
            // if (j < 2) {
            //     lista_info_cds[r].materie_scelta_da_attivare =
            //     lista_info_cds[r].materie_scelta_da_attivare.slice(0,j).concat(
            //         lista_info_cds[r].materie_scelta_da_attivare.slice(j+1)
            //     )
            // } else {
            //     lista_info_cds[r].materie_scelta_da_attivare =
            //     lista_info_cds[r].materie_scelta_da_attivare.slice(0,j)
            // }
        }
        //console.log("attivate", lista_info_cds[r2].materie_attive)
        if (lista_info_cds[r].materie_scelta_da_attivare.length == 0) {
            lista_info_cds[r].materie_scelta_da_attivare = null
            i++
            break
        }
    }
}

//fai diventare unici gli insegnamenti attivi
lista_info_cds.forEach((element, index) => {
    lista_info_cds[index].materie_attive = 
        get_lista_unica(lista_info_cds[index].materie_attive)
})

// var sum = 0
// lista_info_cds.forEach((element, index) => {
//     sum+=element.materie_attive.length
//     console.log(element.materie_attive)
// })
// console.log("sum: " + sum)

//inserire materie attive fino al riempimento dei cfu
lista_info_cds.forEach((cds, index, arr) => {
    var tot_cfu = 0
    cds.materie_attive.forEach(mat => {
        tot_cfu += mat.cfu
    })
    tot_cfu += CFU_MATERIE_SCELTA
    //inserire tirocinio
    temp = (rand(2) + 1) * 3
    cds.materie_attive.push({
        id : get_new_id_insegnamenti(),
        nome : "Tirocinio",

        cfu  : temp
    })
    tot_cfu += temp
    // inserire Prova finale o tesi
    temp = 9 + rand(2) * 3
    if (cds.needed_cfu == 180) {
        cds.materie_attive.push({
            id : get_new_id_insegnamenti(),
            nome : "Prova finale",
            cfu  : temp
        })
    } else {
        cds.materie_attive.push({
            id : get_new_id_insegnamenti(),
            nome : "Tesi",
            cfu  : temp
        })
    }
    tot_cfu += temp
    array = []
    cds.possibili_materie.forEach(e => {
        if (tot_cfu >= cds.needed_cfu) return
        if (if_array_includes_materia(cds.materie_attive.map(e2 => {
            return {
                id   : e2.id,
                ssd  : e2.ssd,
                nome : e2.nome
            }
        }), e)) return
        if (if_array_includes_materia(array.map(e2 => {
            return {
                id   : e2.id,
                ssd  : e2.ssd,
                nome : e2.nome
            }
        }), e)) return
        if (is_materia_a_scelta(e)) return
        e.cfu = rand(4) * 3 + 3
        array.push(e)
        tot_cfu += e.cfu
    })
    cds.materie_attive = array.concat(cds.materie_attive)
})

lista_info_cds.forEach((cds, index) => {
    sum = 6
    cds.materie_attive.forEach(e => {
        sum += e.cfu
    })
    // console.log(sum)
    if (sum > cds.needed_cfu) {
        do {
            r = rand(cds.materie_attive.length)
            if (cds.materie_attive[r].cfu > 3 &&
                    cds.materie_attive[r].nome !== 'Tesi' &&
                    cds.materie_attive[r].nome !== 'Prova finale' &&
                    cds.materie_attive[r].nome !== 'Tirocinio') {
                cds.materie_attive[r].cfu -= 3;
                sum -= 3;
                if (sum == cds.needed_cfu) {
                    break;
                }
            }
        } while (true);
    }
    fs.writeFileSync("cartella/" + cds.nome + cds.needed_cfu + ".json", JSON.stringify(cds.materie_attive, null, 4), { flag: 'w' })
})

// raggruppa materie attive per ssd
mat_attive_per_ssd = {}
lista_info_cds.forEach((cds, index) => {
    cds.materie_attive.forEach(mat => {
        if (typeof mat.ssd === 'undefined') return
        if (!mat_attive_per_ssd[mat.ssd]) {
            mat_attive_per_ssd[mat.ssd] = []
        }
        mat_attive_per_ssd[mat.ssd].push(mat)
    })
})

// lista_info_cds.forEach(cds => {
//     console.log("----------------", cds.nome, cds.needed_cfu)
//     cds.materie_scelta.forEach((mat2,index) => {
//         // if (mat2.id == mat.id) {
//             console.log(mat2.id)
//             // cds.materie_scelta[index] = mat
        
//     })
// })

// CREA DOCENTI
var chiavi = Object.keys(mat_attive_per_ssd)
chiavi.forEach((chiave,index) => {
    // console.log("****************", chiave, " - cds che hanno tale ssd")
    // lista_info_cds.forEach(cds => {
    //     console.log("----------------")
    //     cds.materie_attive.forEach((mat2,index) => {
    //         if (mat2.ssd === chiave) {
    //             console.log(mat2.id)            
    //         }
    //     })
    // })
    if (mat_attive_per_ssd[chiave].nome === 'Tirocinio' ||
            mat_attive_per_ssd[chiave].nome === 'Prova finale' ||
            mat_attive_per_ssd[chiave].nome === 'Tesi') {
            return
    }
    var sum = 0
    var lista = []
    //console.log(mat_attive_per_ssd[chiave])
    mat_attive_per_ssd[chiave].forEach(mat => {
        sum += mat.cfu
        lista.push(mat)
        // console.log("-", lista.map(e => {
        //     return e.id
        // }))
        if (sum >= 12 &&
                sum <= 21) {
            crea_docente_con_lista(lista, chiave)
            sum = 0
            lista = []
        }
    })
    if (sum < 12 && sum > 0) {
        diff = 12 - sum
        // controlla che la materia che si sta per modificare non sia a scelta
        // in qualche cds
        var temp
        var flag = false
        //var a_scelta = []
        for (i = 0; i < lista.length; i++) {
            temp = lista[i]
            if (!is_materia_a_scelta(temp)) {
                flag = true
                break
            } // else {
            //     //console.log(lista)
            //     a_scelta.push(lista[i])
            // }
        }
        //console.log(temp, flag)
        if (!flag) {
            // putroppo tutte le materie di questo ssd sono a scelta
            // quindi bisogna modificargli i crediti
            console.log("error 5000, riprovare", index, chiavi.length)
            lista.forEach(mat => {
                // ma è a scelta e bisogna modificare il blocco in cui fa parte
                if (diff == 0) return
                lista_info_cds.forEach(cds => {
                    if (diff == 0) return
                    var flag = false
                    cds.materie_scelta.forEach(mat2 => {
                        if (mat2.id == mat.id) {
                            flag = true
                        }
                    })
                    if (flag) {
                        cds.materie_scelta.forEach(m2 => {
                            m2.cfu += diff
                        })
                        cds.materie_attive.forEach(m2 => {
                            if (!is_materia_a_scelta(m2) && diff > 0) {
                                m2.cfu -= 3
                                diff -= 3
                            }
                        })
                    }
                })
            })
        }
        //ultimo.cfu += diff
        // cerca la materia in cds per cambiagli i cfu
        lista_info_cds.forEach(cds => {
            cds.materie_attive.forEach(mat => {
                if (mat.id == temp.id) {
                    mat.cfu += diff
                }
            })
        })
        // console.log(lista.concat(scartati).map(e => {
        //     return e.id
        // }))
        crea_docente_con_lista(lista, chiave)
    }
})



// lista_info_cds.forEach(cds => {
//     console.log("----------------")
//     cds.materie_scelta.forEach((mat2,index) => {
//         if (mat2.id == mat.id) {
//             console.log(mat2)
//             cds.materie_scelta[index] = mat
//         }
//     })
// })

lista_info_cds.forEach(cds => {
    cds.materie_scelta.forEach((mat,index) => {
        var flag = false
        lista_info_cds.forEach(cds2 => {
            cds2.materie_attive.forEach((mat2) => {
                if (mat.id == mat2.id) {
                    cds.materie_scelta[index].docente = mat2.docente
                    if (typeof mat2.docente === 'undefined') {
                        console.log("what?", mat2.id)
                        process.exit(1)
                    }
                    flag = true;
                }
            })
        })
        if (!flag) console.log("FALSE", mat)
    })
})

//WRITE SQL
var sql = "INSERT INTO Docenti (id, nome, cognome, ssd, password) VALUES (-1, '', '', '','');\n"
lista_info_cds.forEach(cds => {
    var tipo = ""
    if (cds.needed_cfu == 180) {
        tipo = 'LT'
    } else if (cds.needed_cfu == 120) {
        tipo = 'LM'
    } else {
        tipo = 'LMC'
    }
    sql += `INSERT INTO CDS (id, nome, tipo) VALUES (${cds.id}, \"${cds.nome}\", \"${tipo}\");`
    anni = 0;
    if (cds.needed_cfu == 180) anni = 3 
    else if (cds.needed_cfu == 120) anni = 2
    else  anni = 5
    i_anni = 0;
    anno = 0;
    mat_per_anno = Math.floor(cds.materie_attive.length / anni)
    sql += '\n\n-- ' + cds.nome + " - " + tipo + ' --\n\n';
    cds.materie_attive.forEach(mat => {
        if (i_anni % mat_per_anno == 0) {
            if (anno < anni) anno++
        }
        mat.nome = mat.nome.replace('�', 'à');
        if (typeof mat.docente !== 'undefined') {
            sql +=  `INSERT INTO Docenti (id, nome, cognome, ssd, ` + 
                    `password) VALUES (${mat.docente.id}, \"${mat.docente.nome}\",` +
                    ` \"${mat.docente.cognome}\", \"${mat.docente.ssd}\", \"${mat.docente.password}\");\n`
            sql +=  `INSERT INTO Insegnamenti (id, nome, cfu, ssd, id_docente) VALUES (${mat.id},` +
                    ` \"${mat.nome}\", ${mat.cfu}, \"${mat.ssd}\", ${mat.docente.id});\n`;
        } else {
            sql +=  `INSERT INTO Insegnamenti (id, nome, cfu, id_docente) VALUES (${mat.id}, \"${mat.nome}\", ${mat.cfu}, -1);\n`;
        }
        sql +=  `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES ` +
                `(${cds.id}, ${mat.id}, FALSE, ${anno});\n`;
        i_anni++
    })
    cds.materie_scelta.forEach(mat => {
        mat.nome = mat.nome.replace('�', 'à');
        sql +=  `INSERT INTO Docenti (id, nome, cognome, ssd, ` + 
                `password) VALUES (${mat.docente.id}, \"${mat.docente.nome}\",` +
                ` \"${mat.docente.cognome}\", \"${mat.docente.ssd}\", \"${mat.docente.password}\");\n`
        sql +=  `INSERT INTO Insegnamenti (id, nome, cfu, ssd, id_docente) VALUES (${mat.id},` +
                ` \"${mat.nome}\", ${mat.cfu}, \"${mat.ssd}\", ${mat.docente.id});\n`;
        sql +=  `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES ` +
                `(${cds.id}, ${mat.id}, TRUE, ${anno});\n`;
    })
})

fs.writeFileSync("insert_all.sql", sql, { flag: 'w' })