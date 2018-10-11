const express = require('express');
const bodyParser = require('body-parser')
const multer = require('multer');
const path = require('path');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const text = require('./text');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

module.exports = {
    upload,
    io
}

function upload(opts) {
    let {
        port,
        downloadPort,
        textPath,
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

        // 获取下载端口
        app.get('/download', function (req, res) {
            console.log(downloadPort);
            res.json({
                state: true,
                downloadPort
            });
        })

        // 添加文本记录
        app.post('/addText', function (req, res) {
            let content = req.body.content;
            if (!content) {
                res.json({
                    state: false,
                    error: '内容不得为空'
                })
            } else {
                text.writeText(content, textPath).then(() => {
                    res.json({
                        state: true
                    });
                });
            }
        })

        // 获取文本记录
        app.get('/getTexts', function (req, res) {
            text.readTexts(new Date(req.query.startDate), new Date(req.query.endDate), textPath).then((ret) => {
                let texts = ret.filter(x => x.res);
                res.json({
                    state: true,
                    texts
                })
            })
        })
        io.on('connection', function (socket) {
            // console.log('a user connected');
            // socket.on('new message', function (msg) {
            //     console.log('message: ' + msg);
            // });
            socket.on('disconnect', function () {
                // console.log('user disconnected');
            });
        });
        http.listen(port, () => resolve(port))
    })
}