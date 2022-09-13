
//html.body.div[7].main.div.div.div.div[3].div[2].div[2].div.div[2].table.tbody.tr[2].td[4].ul.li[1]
//var path = 'html.body.div[7].main.div.div.div.div[3].div[2].div[2].div.div[2].table.tbody.tr[2].td[4].ul.li[1].span.em[1]';

// var array = [];
// //console.log($(path).text());
// $('.policorpo').text((i, str) => {
//     var firstLine = str.split('\n')[1];
//     array.push(firstLine);
//     //console.log(firstLine);
//     //return firstLine;
// });

// const nome_cds = 'Ingegneria Edile'
// const laurea = 'LT'
// const path_html = './Ingegneria Edile.htm'
// const id_corso  = 7800 // cds
// const start_id  = 6000 // for docenti e insegnamenti
//var xpath = '/html/body/div[7]/main/div/div/div/div[3]/div[2]/div[2]/div/div[2]/table/tbody/tr[2]';



// var array2 = [];
// var exlude = [];
// var sel  = '#collapse14287 > div:nth-child(1) > div > table > tbody > tr > td:nth-child(4)'
// var sel2 = '#collapse14287 > div:nth-child(1) > div > table > tbody > tr > td:nth-child(3)'
// var sel3 = '#collapse14287 > div:nth-child(1) > div > table > tbody > tr'

// var b = "";

// $(sel3).text((i, str) => {
//     if (str.includes('ING-IND/31 (7)')) b = str;
//     str = str.trimEnd().trimStart();
//     if (str === '\n' ||
//         str === '') return;
//     console.log("_" + str + "^");
// });
// console.log("_" + b + "^");
// return;
// var a = 0;
// $(sel).text((i, str) => {
//     // var firstLine = str.split('\n')[1];
//     // array.push(firstLine);
//     //if (str.includes('\n')) return;
//     str = str.trimEnd().trimStart();
//     if (str.includes('Crediti liberi') ||
//             str === '' ||
//             str.includes('Tirocinio') ||
//             str.includes('Prova finale') ||
//             str.includes('Insegnamento a scelta da Tabella') ||
//             str.includes('\n')) {
//         exlude.push(i);
//         return;
//     }
//     array2.push({
//         nome : str
//     })
//     //return firstLine;
//     a++;
// });
// console.log("tot: " + a);
// var a = 0;
// $(sel2).text((i, str) => {
//     // var firstLine = str.split('\n')[1];
//     // array.push(firstLine);
//     //if (str.includes('\n')) return;
//     if (exlude.includes(i)) return;
//     str = str.trimEnd().trimStart();
//     if (str === '') return;
//     console.log(str.split(';'));
//     //array2[i].cfu = str;
//     //return firstLine;
//     a += str.split(';').length;
// });
// console.log("tot: " + a);
//console.log(array2);
// array contains the list of subjects with cfu and ssd 
// array = array.filter(onlyUnique);
// //console.log(array2);

// // ------------------------------------------------
// //          HERE array and array2 must be
// //                 joined in list
// // ------------------------------------------------


// // list is the array formatted as a obj
// var list = [];

// array.forEach(element => {
//     s = element.split(' ');
//     str = s.slice(2, s.length - 3).join(' ')
//     list.push({
//         nome: str,
//         //crediti: s[s.length - 2].charAt(1),
//         ssd : s[s.length - 3]
//     });
// });

//console.log(list);
//fs.writeFileSync("list.json", JSON.stringify(list, null, 4));

// `INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
// 	${},
// 	${},
// 	${},
// 	${}
// )`;




// var html_parsed
// var xpath = [] 
// function get_xpath(file_name, obj, index) {
//     if (file_name) {
//         html = fs.readFileSync(file_name, { encoding: 'utf8', flag: 'r' });
//         html_parsed = parse5.parse(html);
//         get_xpath(null, html_parsed.childNodes[1], 0)
//     } else {
//         if (obj.tagName === 'span') {
//             str = obj.childNodes[0].value.trimStart().trimEnd();
//             if (lista_ssd.includes(str)) {
//                 return true
//             }
//         } else {
//             if (!obj.childNodes) return false
//             for (i = 0; i < obj.childNodes.length; i++) {
//                 e = obj.childNodes[i];
//                 if (get_xpath(null, e, index+1)) {
//                     xpath.unshift(e.tagName)
//                     return true
//                 }
//             }
//         }
//         return false
//     }
// }



// prende per ogni cds 3 materie a scelta da attivare, con ste
// sso ssd
// lista_info_cds.forEach((element, index) => {
//     //flag_ssd = false
//     i_ssd = -1;
//     num_materie_prese = 0;
//     do {
//         if (num_materie_prese == 3) break
//         i_ssd++;
//         if (i_ssd == element.possibili_materie.length - 1) {
//             console.log("errore 3452")
//             process.exit()
//         }
//         materia = element.possibili_materie[element.possibili_materie.length - 1 - i_ssd]
//         if (element.materie_attive.includes(materia) ||
//                 element.materie_scelta.includes(materia) ||
//                 element.materie_scelta_da_attivare.includes(materia)) {
//              continue
//         }
//         // se materia non è attiva in nessun corso
//         // ritorna temp = false altrimenti temp = true
//         temp = lista_info_cds.every((e, i) => {
//             if (e.materie_attive.includes(materia) &&
//                     i != index) {
//                 return false
//             }
//             return true
//         })
//         // verificare che sia attiva in un altro corso
//         if (temp) {
//             // è un insegnamento non attivo in un altro cds
//             lista_info_cds[index].materie_scelta_da_attivare.push(materia)
//             num_materie_prese++;
//         } else {
//             // è un insegnamento attivo in un altro cds
//             lista_info_cds[index].materie_scelta_attivate.push(materia)
//             num_materie_prese++;
//         }
//     } while(true)
//     // console.log(element)
// })

var array = [];
var code = start_id;
var tot_cfu = 0;
list.forEach((cds, index) => {
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