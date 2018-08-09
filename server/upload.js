const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
exports.upload = function (opts) {
    let {
        port,
        root
    } = opts;
    return new Promise((resolve, reject) => {
        let storage = multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, root);
            },
            filename: function (req, file, cb) {
                cb(null, file.originalname);
            }
        });

        let upload = multer({
            storage
        });
        app.use(express.static(path.join(__dirname, 'web')));
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'web/index.html'));
        })
        let up = upload.array('files');
        app.post('/upload', function (req, res) {
            up(req, res, function (err) {
                if (err) {
                    res.status(500).json({
                        error: err
                    })
                    return
                }
                let files = req.files;
                let rets = [];
                for (let i = 0; i < files.length; i++) {
                    let file = files[i];
                    rets.push(file);
                }
                res.json({
                    rets
                });
            })
        })
        // app.post('/upload', upload.array('files'), function (req, res, next) {
        //     let files = req.files;
        //     let rets = [];
        //     for (let i = 0; i < files.length; i++) {
        //         let file = files[i];
        //         rets.push(file);
        //     }
        //     res.json({
        //         rets
        //     });
        // });

        app.listen(port, () => resolve(port))
    })
}