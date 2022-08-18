// const { strict } = require('assert');
// const cheerio = require('cheerio');
const bcrypt  = require('bcrypt');
const parse5 = require('parse5');
const fs = require('fs');
const { list } = require('tar');

const names = fs.readFileSync('random_names_fossbytes.csv', { encoding: 'utf8', flag: 'r' }).split('\n');
const xpath_json = JSON.parse(fs.readFileSync('xpaths.json', { encoding: 'utf8', flag: 'r' }))
var file_names = fs.readdirSync(process.cwd())

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
function get_rand_name_cogn() {
    n = Math.floor(Math.random() * names.length);
    s = names[n].trimStart().trimEnd().split(' ');
    nome = s[s.length - 2];
    cogn = s.slice(s.length - 1).toString()//.join(' ');
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
    return list
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
                    id_corso : get_new_id_corso(),
                    //xpath : xpath_json[e],
                    //parsed_html : parsed_html,
                    possibili_materie : [...new Set(e.possibili_materie.concat(e2.possibili_materie))],
                    materie_attive : []
                })
            }
        }
    }
    return ret
}

file_names = file_names.filter(e => {
    if (e.includes('.htm')) return true
    else return false
})

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
        id_corso : get_new_id_corso(),
        xpath : xpath_json[e],
        parsed_html : parsed_html,
        possibili_materie : get_lista_materie(xpath_json[e], parsed_html),
        materie_attive : []
    })
})

lista_info_cds = lista_info_cds.concat(get_lista_cds_lmc(lista_info_cds))
console.log(lista_info_cds)

lista_info_cds.forEach((element, index) => {
    flag_ssd = false
    i_ssd = -1;
    do {
        i_ssd++;
        if (i_ssd == element.possibili_materie.length - 1) {
            console.log("errore 3452")
            process.exit()
        }
        materia = element.possibili_materie[possibili_materie.length - 1 - i_ssd]
        if (element.materie_attive.includes(materia)) continue
        // se la materia presa non è attiva al corso corrente
        // verificare che sia attiva in un altro corso
        
    } while(!flag_ssd)
})

return

var array = [];
var code = start_id;
var tot_cfu = 0;
list.forEach((element, index) => {
    if (tot_cfu >= needed_cfu) {
        return;
    }
    r = rand(4);
    cfu = 0;
    if      (r == 0) cfu = 3;
    else if (r == 1) cfu = 6;
    else if (r == 2) cfu = 9;
    else if (r == 3) cfu = 12;
    // list[index].code  = code;
    // list[index].cfu = cfu;
    array.push({
        nome: element.nome,
        ssd : element.ssd,
        id : code,
        cfu : cfu
    });
    tot_cfu += cfu;
    code += 15;
});

console.log("tot_cfu: " + tot_cfu);

if (tot_cfu < needed_cfu) {
   array[rand(array.length)].cfu += (needed_cfu - tot_cfu); 
} else if (tot_cfu > needed_cfu) {
    do {
        r = rand(array.length)
        if (array[r].cfu > 3) {
            array[r].cfu -= 3;
            tot_cfu -= 3;
            if (tot_cfu == needed_cfu) {
                break;
            }
        }
    } while (true);
}

console.log("tot_cfu2: " + tot_cfu);

tot_cfu = 0;
array.forEach(e => {
    tot_cfu += e.cfu;
});
console.log(array, tot_cfu, array.length);

// inserisci materie a scelta
// inserisci tesi/provafinalle



fs.writeFileSync(nome_cds + ".json", JSON.stringify(array, null, 4));

return
/* 
var docenti = [];
var anni = 0;
if (laurea == 'LT') anni = 3 
else if (laurea == 'LM') anni = 2
else  anni = 5
var sql = '\n-- ' + nome_cds + ' --\n\n';
var i = 0;
var mat_per_anno = Math.floor(array.length / anni)
var anno = 0;

// create sql
array.forEach((element, index) => {
    //aggiungi docente
    nome = get_rand_name_cogn();
    docente = {
        nome : nome[0],//.toUpperCase(),
        cognome : nome[1].split('-')[0],//.toUpperCase(),
        ssd : element.ssd,
        password : bcrypt.hashSync(cognome + '1234', 10)
    }
    docente.id = start_id + (docenti.length * 15) + rand(1000),
    docenti.push(docente)
    sql += `INSERT INTO Docenti (id, nome, cognome, ssd, password) VALUES (${docente.id}, \"${docente.nome}\", \"${docente.cognome}\", \"${docente.ssd}\", \"${docente.password}\");\n`
    // aggiuingi insegnamento
    element.nome = element.nome.replace('�', 'à');
    array[index].nome.replace('�', 'à');
    sql +=  `INSERT INTO Insegnamenti (id, nome, cfu, ssd, id_docente) VALUES (${element.id}, \"${element.nome}\", ${element.cfu}, \"${element.ssd}\", ${docente.id});\n`;
    
    // aggiungi in programma
    if (i % mat_per_anno == 0) {
        if (anno < anni) anno++
    }
    sql += `INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (${id_corso}, ${element.id}, FALSE, ${anno});\n`;

    i++;
});
//fs.writeFileSync("insert.sql", sql, { flag: 'a' }); */