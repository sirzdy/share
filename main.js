// Modules to control application life and create native browser window
const {
    app,
    BrowserWindow,
    globalShortcut,
    Tray,
    Menu,
    nativeImage,
    ipcMain,
    dialog,
    shell
} = require('electron');
const settings = require('electron-settings');
const path = require("path");
const fs = require('fs');
const os = require('os');
var c = require('child_process');

const { download } = require('./server/download');
const { upload } = require('./server/upload');
const { getPort } = require('./server/port');
const { getIp } = process.platform === 'darwin' ? require('./server/ip-mac') : require('./server/ip-windows');
const { copy } = require('./server/file');
const { writeText } = require('./server/text');

/* 起始端口号 */
const basePort = 1225;
/* 主页 */
const index = './client/index.html';
/* 默认路径, 实际路径 */
const defaultPath = path.join(os.homedir(), 'Documents', 'files');
/* 默认类型，仅显示无线网 */
let type = null;
const defaultType = 1;

let filesPath = defaultPath;
let uploadPath;
let downloadPath;
let textPath;



let mainWindow = null;
let tray = null;

function createWindow() {
    let settingPath = null;
    let settingType = null;
    try {
        settingPath = settings.get('path');
        settingType = settings.get('type');
    } catch (err) {
        console.log(err);
        // throw err;
    }
    /* 目录 */
    filesPath = settingPath || defaultPath;
    downloadPath = path.join(filesPath, 'download');
    uploadPath = path.join(filesPath, 'upload');
    textPath = path.join(filesPath, 'text');
    [filesPath, downloadPath, uploadPath, textPath].forEach(mkdir);
    /* 类型 */
    type = settingType || defaultType;

    mainWindow = new BrowserWindow({
        width: 300,
        height: 650,
        show: false,
        resizable: false,
        alwaysOnTop: true,
        frame: false,
        transparent: true
    })

    mainWindow.loadFile(index);
    // 图标
    let icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    if (process.platform !== 'darwin') {
        mainWindow.setIcon(icon);
    }

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    // 菜单
    Menu.setApplicationMenu(null)

    // 托盘
    if (process.platform !== 'darwin') {
        tray = new Tray(icon);
    } else {
        tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'tray.png')));
    }
    let contextMenu = Menu.buildFromTemplate([
        {
            label: '打开窗口',
            click() { open() }
        }, {
            type: 'separator'
        }, {
            label: '设置目录',
            click() { setFilesPath() }
        }, {
            label: '设置网络',
            type: 'submenu',
            submenu: [
                {
                    label: '全部',
                    type: 'radio',
                    checked: false,
                    click() { setShowType(0) }
                },
                {
                    label: '无线网',
                    type: 'radio',
                    checked: true,
                    click() { setShowType(1) }
                },
                {
                    label: '有线网',
                    type: 'radio',
                    checked: false,
                    click() { setShowType(2) }
                },
            ]
        }, {
            type: 'separator'
        }, {
            label: '查看帮助',
            click() { help() }
        }, {
            label: '意见反馈',
            click() { feedback() }
        }, {
            type: 'separator'
        }, {
            label: '重新启动',
            click() { restart() }
        }, {
            label: '退出程序',
            role: 'quit'
        }
    ])
    tray.setContextMenu(contextMenu);
    tray.setToolTip('文件传输工具');
    tray.on('click', () => {
        open();
    });

    /* 事件处理 */
    ipcMain.on('quit', (event, arg) => {
        if (process.platform !== 'darwin') {
            mainWindow.hide();
        } else {
            mainWindow.minimize();
        }
    });

    /* 打开目录 */
    ipcMain.on('open', (event, arg) => {
        shell.openItem(filesPath);
    });

    /* 打开链接 */
    ipcMain.on('link', (event, link) => {
        shell.openExternal(link);
    });

    /* 传输文本 */
    ipcMain.on('send', (event, content) => {
        // shell.openExternal(link);
        writeText(content, textPath).then(() => {
            event.sender.send('send-reply', true);
        }).catch((err) => {
            console.log(err)
            event.sender.send('send-reply', false);
        });
    });

    /* 上传文件 */
    ipcMain.on('copy', (event, files) => {
        Promise.all(files.map((file) =>
            copy(file, downloadPath)
        )).then((ret) => {
            event.sender.send('copy-reply', ret);
        }).catch((err) => {
            console.log(err);
        });
    });

    /* 开启服务器 */
    ipcMain.on('start', (event, arg) => {
        event.sender.send('files-path', filesPath);
        getPort(basePort, 2).then((ports) => {
            let [uploadPort, downloadPort] = ports;
            let downloadOpts = {
                port: downloadPort,
                root: downloadPath
            }
            let uploadOpts = {
                port: uploadPort,
                downloadPort,
                textPath,
                root: uploadPath
            }
            Promise.all([getIp(), download(downloadOpts), upload(uploadOpts)]).then((values) => {
                event.sender.send('start-reply', [...values, type]);
                let [{ ips, wirelessIps }, downloadRetPort, uploadRetPort] = values;
                let wiredIps = [];
                ips.forEach((ip) => {
                    if (wirelessIps.indexOf(ip) < 0) {
                        wiredIps.push(ip);
                    }
                })
                console.log('Download:');
                wirelessIps.length && wirelessIps.forEach((x) => {
                    console.log('[wireless]', 'http://' + x + ':' + downloadRetPort);
                })
                wiredIps.length && wiredIps.forEach((x) => {
                    console.log('[wired]', 'http://' + x + ':' + downloadRetPort);
                })
                console.log('Upload:');
                wirelessIps.length && wirelessIps.forEach((x) => {
                    console.log('[wireless]', 'http://' + x + ':' + uploadRetPort);
                })
                wiredIps.length && wiredIps.forEach((x) => {
                    console.log('[wired]', 'http://' + x + ':' + uploadRetPort);
                })
            })
        }).catch((err) => {
            throw err;
        });
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

/* 创建目录 */
function mkdir(path) {
    !fs.existsSync(path) && fs.mkdirSync(path);
}

/* 设置网络类型 0 全部 1 仅无限网 2 仅有线网 */
function setShowType(type) {
    mainWindow.webContents.send('show-type', type);
    settings.set('type', type);
}

/* 设置目录 */
function setFilesPath() {
    let path = dialog.showOpenDialog({ title: '请选择共享目录', defaultPath: filesPath, properties: ['openFile', 'openDirectory'] });
    if (!path) return;
    if (path[0] === filesPath) return;
    settings.set('path', path[0]);
    restart();
}

/* 打开主窗口 */
function open() {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
}

/* 重启 */
function restart() {
    app.relaunch();
    app.exit();
}

/* 退出 */
function quit() {
    app.quit();
}

/* 查看帮助 */
function help() {
    const github = 'https://github.com/sirzdy/file-transfer';
    shell.openExternal(github);
}

/* 意见反馈 */
function feedback() {
    const githubIssues = 'https://github.com/sirzdy/file-transfer/issues';
    shell.openExternal(githubIssues);
}

/* 只允许一个实例 */
const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
    }
})

if (isSecondInstance) {
    app.quit()
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        quit();
    }
})

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
})