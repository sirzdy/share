const net = require('net');
function portIsOccupied(port) {
    return new Promise((resolve, reject) => {
        let server = net.createServer().listen(port);
        server.on('listening', () => {
            server.close();
            resolve(false);
        })
        server.on('error', (err) => {
            resolve(true);
        })
    });
}
exports.getPort = async function (baseport = 1225, count = 1) {
    let ports = [];
    let port = baseport;
    while (count--) {
        while (await portIsOccupied(port)) {
            port++;
        }
        ports.push(port++);
    }
    return ports;
}
