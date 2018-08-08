// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { ipcRenderer } = require('electron');

let container = document.getElementById('container');
let close = document.getElementById('close');
let links = document.getElementById('links');
let open = document.getElementById('open');
let dir = document.getElementById('dir');

/* 二维码初始化 */
let qrcode = new QRCode(document.getElementById('qrcode'), null);


function hint(msg, duration, type) {
    duration = isNaN(duration) ? 1500 : duration;
    var m = document.createElement('div');
    m.innerHTML = msg;
    var backgroundColor;
    if (type == 'suc') {
        backgroundColor = "#3c763d";
        color = "#ffffff";
    } else if (type == 'fail') {
        backgroundColor = "#8a6d3b";
        color = "#ffffff";
    } else {
        backgroundColor = "#1296db";
        color = "#ffffff";
    }
    m.style.cssText = "width: 60%;min-width: 150px;opacity: 0.9;padding: 10px 0;color: " + color + ";line-height: 30px;text-align: center;border-radius: 5px;position: fixed;top: 60px;left: 50%;transform:translateX(-50%);z-index: 999999;background: " + backgroundColor + ";font-size: 12px;";
    document.body.appendChild(m);
    setTimeout(function () {
        var d = 0.5;
        m.style.webkitTransition = '-webkit-transform ' + d + 's ease-in, opacity ' + d + 's ease-in';
        m.style.opacity = '0';
        setTimeout(function () { document.body.removeChild(m) }, d * 1000);
    }, duration);
}


/* 开启服务器 */
window.onload = () => {
    ipcRenderer.send('start');
}

/* 退出程序 */
close.onclick = () => {
    ipcRenderer.send('quit');
}

/* 打开目录 */
open.onclick = () => {
    ipcRenderer.send('open');
}

/* 链接单击切换二维码 */
links.onclick = function (event) {
    let element = event.target;
    if (element.tagName.toLowerCase() === 'p') {
        links.childNodes.forEach((link) => {
            link.className = '';
        })
        element.className = 'current';
        qrcode.makeCode(element.getAttribute('link'));
    }
}

/* 链接右键在浏览器中打开 */
links.oncontextmenu = function (event) {
    let element = event.target;
    if (element.tagName.toLowerCase() === 'p') {
        ipcRenderer.send('link', element.getAttribute('link'));
    }
}

ipcRenderer.on('start-reply', (event, values) => {
    let downloadUrls = [];
    let uploadUrls = [];
    let [{ ips, wirelessIps }, downloadPort, uploadPort] = values;
    wirelessIps.forEach((ip) => {
        downloadUrls.push('http://' + ip + ':' + downloadPort);
        uploadUrls.push('http://' + ip + ':' + uploadPort);
    });
    if (downloadUrls.length) {
        let title = document.createElement('h3');
        title.innerText = '【下载】(电脑→其他设备)'
        links.appendChild(title);
        downloadUrls.forEach((url) => {
            let e = document.createElement('p');
            e.innerText = url;
            e.setAttribute('link', url);
            links.appendChild(e);
            e.click();
        });
    }
    if (uploadUrls.length) {
        let title = document.createElement('h3');
        title.innerText = '【上传】(其他设备→电脑)'
        links.appendChild(title);
        uploadUrls.forEach((url) => {
            let e = document.createElement('p');
            e.innerText = url;
            e.setAttribute('link', url);
            links.appendChild(e);
            // e.click();
        });
    }
})

ipcRenderer.on('copy-reply', (event, rets) => {
    let sucHint = '【成功】\n';
    let failHint = '【失败】\n';
    let suc = [];
    let fail = [];
    rets.forEach((ret) => {
        if (ret.state) {
            suc.push(ret.file.path);
        } else {
            fail.push(ret.file.path + ': ' + ret.err);
        }
    })
    fail.length ? alert(sucHint + suc.join('\n') + '\n' + failHint + fail.join('\n')) : hint('复制成功!!!');
})

ipcRenderer.on('files-path', (event, filesPath) => {
    dir.innerText = '[' + filesPath + ']';
})

container.ondragstart = (event) => {
    event.preventDefault();
}

container.ondragover = () => {
    return false;
}

container.ondragleave = container.ondragend = () => {
    return false;
}

container.ondrop = (event) => {
    event.preventDefault();
    console.log(event.dataTransfer.files)
    let files = [];
    for (let f of event.dataTransfer.files) {
        files.push({ path: f.path, name: f.name })
    }
    ipcRenderer.send('copy', files)
    return false;
}