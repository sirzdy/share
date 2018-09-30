const fs = require('fs');
const path = require("path");
var csv = require("fast-csv");

function getDate(date) {
    return `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

function getDates(startDate, endDate) {
    let result = [];
    for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
        result.push(getDate(date));
    }
    return result;
}

function getTexts(date, textPath) {
    let texts = [];
    let fileName = path.join(textPath, date + '.csv');
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(fileName)) {
            resolve({ date, res: null });
        } else {
            csv
                .fromPath(fileName)
                .on("data", function (data) {
                    texts.push(data);
                })
                .on("end", function () {
                    resolve({ date, res: texts });
                })
                .on("error", function (e) {
                    resolve({ date, res: [] });
                });
        }
    })
}

function writeText(content, textPath) {
    let date = new Date();
    let arr = [[date.valueOf(), content]];
    let options = {
        headers: true,
        includeEndRowDelimiter: true
    };
    return new Promise((resolve, reject) => {
        var stream = fs.createWriteStream(path.join(textPath, getDate(date) + '.csv'), { encoding: "utf8", flags: 'a+' });
        csv.write(arr, options).pipe(stream);
        stream.on('finish', () => {
            resolve({ state: true })
        });
    })
}

function readTexts(startDate, endDate, textPath) {
    return Promise.all(getDates(startDate, endDate).map(async x => {
        return await getTexts(x, textPath);
    }));
}

// writeText('123').then(()=>{
//     console.log('finish');
// });

// readTexts(new Date(2018, 08, 01), new Date(2018, 09, 01)).then((ret) => {
//     console.log(ret.filter(x => x.res));
// })

module.exports = {
    writeText,
    readTexts
}

