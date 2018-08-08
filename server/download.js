const httpServer = require('http-server');

/* 启动服务 */
exports.download = function (opts) {
    let { port } = opts;
    return new Promise(function (resolve, reject) {
        let server = httpServer.createServer(opts);
        server.listen(port, function () {
            resolve(port);
        });
    })
}

