const parse5 = require('parse5');
const fs     = require('fs');

const html = fs.readFileSync('ssd.htm', { encoding: 'utf8', flag: 'r' });

const document = parse5.parse(html);

function text_from_xml_path(path) {
    let array = path.split('/');
    array = array.slice(1);
    var last_obj = document;
    array.forEach((ele, ind) => {
        var num = 0;
        var j = 0;
        var temp;
        if (ele.includes('[')) {
            temp = ele.indexOf('[');
            num = parseInt(ele.substring(temp + 1,
                        ele.length - 1
                    )
                );
            ele = ele.substring(0, temp);
        }
        j = 0;
        temp = 0;
        last_obj.childNodes.forEach((ele2, ind2) => {
            if (ele2.tagName === ele) {
                j++;
                if (j >= num && temp == 0) {
                    temp = ele2;
                }
            }
        });
        last_obj = temp;
    });
    array = [];
    last_obj.childNodes.forEach(ele => {
        if (ele.nodeName === '#text') {
            array.push(ele.value.trimStart().trimEnd());
        }
    });
    return array;
}

var array = [];
for (i = 0; i < 14; i++) {
    let xml_path = `/html/body/p[${i*2 + 3}]`;
    let temp = text_from_xml_path(xml_path)
    temp.forEach(e => {
        app = e.split(' ')
        if (app.length > 1) {
            array.push({
                code: app[0],
                name: app.slice(1).join(' ').replace(/\s+/g, " ").replace('�', 'À')
            });
        }
    });
}

mat = ''
array.forEach(e => {
    mat += `INSERT INTO SSD (code, name) VALUES (\"${e.code}\", \"${e.nome}\");\n`
})

fs.writeFileSync("ssd.sql", mat);
fs.writeFileSync("ssd.json", JSON.stringify(array, null, 4));