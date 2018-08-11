const os = require('os');
const exec = require('child_process').exec;
var ifaces = os.networkInterfaces();

exports.getIp = function () {
    const nets = [];
    const wirelessIps = [];
    const ips = [];
    return new Promise(function (resolve, reject) {
        /* 所有的网络连接，包括有线网络连接，无线网络连接，虚拟网络连接等 */
        Object.keys(ifaces).forEach(function (dev) {
            ifaces[dev].forEach(function (details) {
                if (details.family === 'IPv4') {
                    nets.push(details);
                    ips.push(details.address);
                }
            });
        });
        exec('networksetup -listallhardwareports', function (err, out) {
            if (err) console.log(err);
            var blocks = out.toString().split(/Hardware/).slice(1);
            blocks.forEach(function (block) {
                var parts = block.match(/Port: (.+)/),
                    mac = block.match(/Address: ([A-Fa-f0-9:-]+)/);
                if (parts && mac) {
                    /* 筛选无线网卡 */
                    if (parts[1].match(/Wi-?Fi|AirPort/i)) {
                        let MACAddress = mac[1];
                        nets.forEach((net) => {
                            if (net.mac.toLowerCase() === MACAddress.toLowerCase()) {
                                wirelessIps.push(net.address);
                            }
                        })
                    }
                }
            })
            resolve({ ips, wirelessIps });
        });
    })
}
