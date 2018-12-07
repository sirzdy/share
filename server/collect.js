const fs = require('fs');
var csv = require("fast-csv");

function addCollections(content, remark, collectionPath) {
    let date = new Date();
    let arr = [[date.valueOf(), content, remark]];
    let options = {
        headers: true,
        includeEndRowDelimiter: true
    };
    return new Promise((resolve, reject) => {
        var stream = fs.createWriteStream(collectionPath, { encoding: "utf8", flags: 'a+' });
        csv.write(arr, options).pipe(stream);
        stream.on('finish', () => {
            resolve({ state: true })
        });
    })
}


function getCollections(collectionPath) {
    let collections = [];
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(collectionPath)) {
            resolve({ date, res: null });
        } else {
            csv
                .fromPath(collectionPath)
                .on("data", function (data) {
                    collections.push(data);
                })
                .on("end", function () {
                    resolve(collections);
                })
                .on("error", function (e) {
                    resolve([]);
                });
        }
    })
}

module.exports = {
    getCollections,
    addCollections
}
