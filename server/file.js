const fs = require('fs');
const path = require("path");

function isFile(path) {
    return fs.existsSync(path) && fs.statSync(path).isFile();
}

exports.copy = function (file, filesPath) {
    return new Promise(function (resolve, reject) {
        let sourceFile = path.join(file.path);
        if (!isFile(sourceFile)) {
            resolve({ file, state: false, err: '不是文件' });
            return;
        }
        let destPath = path.join(filesPath, file.name);
        let readStream = fs.createReadStream(sourceFile);
        let writeStream = fs.createWriteStream(destPath);
        readStream.pipe(writeStream);
        readStream.on('error', function (err) {
            // console.log(err.stack);
            resolve({ file, state: false, err: err.stack });
        });
        readStream.on('end', function () {
            // console.log('read end');
        });
        writeStream.on('error', function (err) {
            // console.log(err.stack);
            resolve({ file, state: false, err: err.stack });
        });
        writeStream.on('finish', function () {
            // console.log("write end");
            resolve({ file, state: true });
        });
    })
}