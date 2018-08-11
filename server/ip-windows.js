const os = require('os');
const wmic = require('wmic');
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
        /* 设备管理器 */
        wmic.get_list('nic', function (err, nics) {
            if (err) return reject(err);
            nics.forEach(function (nic) {
                /* 筛选网卡 */
                if (nic.Name && nic.NetConnectionID != '' && nic.MACAddress != '') {
                    /* 筛选无线网卡 */
                    if (nic.Name.match(/wi-?fi|wireless/i)) {
                        nets.forEach((net) => {
                            if (net.mac.toLowerCase() === nic.MACAddress.toLowerCase()) {
                                wirelessIps.push(net.address);
                            }
                        })
                    }
                }
            })
            resolve({ ips, wirelessIps });
        })
    })
}