const fs = require("fs");
var csv = require("fast-csv");

function addCollections(content, remark, collectionPath) {
    return new Promise((resolve, reject) => {
        getCollections(collectionPath).then(res => {
            let index = res.findIndex(x => x[1] === content);
            index >= 0 && res.splice(index, 1);
            let date = new Date();
            res.push([date.valueOf(), content, remark]);
            let options = {
                headers: true,
                includeEndRowDelimiter: true
            };
            var stream = fs.createWriteStream(collectionPath, {
                encoding: "utf8",
                flags: "w+"
            });
            csv.write(res, options).pipe(stream);
            stream.on("finish", () => {
                resolve({ state: true });
            });
        });
    });
}

function getCollections(collectionPath) {
    let collections = [];
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(collectionPath)) {
            resolve([]);
        } else {
            csv.fromPath(collectionPath)
                .on("data", function(data) {
                    collections.push(data);
                })
                .on("end", function() {
                    resolve(collections);
                })
                .on("error", function(e) {
                    resolve([]);
                });
        }
    });
}

function delCollections(content, collectionPath) {
    return new Promise((resolve, reject) => {
        getCollections(collectionPath)
            .then(res => {
                let index = res.findIndex(x => !x[1] || x[1] === content);
                index >= 0 && res.splice(index, 1);
                if (!res.length) {
                    fs.unlink(collectionPath, err => {
                        if (err) throw err;
                        resolve({ state: true });
                    });
                    return;
                }
                let options = {
                    headers: true,
                    includeEndRowDelimiter: true
                };
                var stream = fs.createWriteStream(collectionPath, {
                    encoding: "utf8",
                    flags: "w+"
                });
                csv.write(res, options).pipe(stream);
                stream.on("finish", () => {
                    resolve({ state: true });
                });
            });
    });
}

module.exports = {
    getCollections,
    addCollections,
    delCollections
};
