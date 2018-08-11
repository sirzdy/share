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

/* 主页 */
const index = './client/index.html';
/* 默认路径, 实际路径 */
const defaultPath = path.join(os.homedir(), 'Documents', 'files');
let filesPath = settings.get('path') || defaultPath;
const basePort = 1225;

let mainWindow = null;
let tray = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 300, height: 650,
        show: false,
        resizable: false,
        alwaysOnTop: true,
        frame: false,
    })

    mainWindow.loadFile(index);
    // 图标
    let icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    if (process.platform !== 'darwin') {
        mainWindow.setIcon(icon);
    }

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // 菜单
    Menu.setApplicationMenu(null)

    // 托盘
    let tray = nativeImage.createFromPath(path.join(__dirname, 'tray.png'));
    tray = new Tray(tray);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '打开窗口',
            click() { open() }
        },
        {
            label: '设置目录',
            click() { setFilesPath() }
        },
        // {
        //     label: '重新启动',
        //     click() { restart() }
        // },
        {
            label: '退出程序',
            role: 'quit'
        }
    ])
    tray.setContextMenu(contextMenu);
    tray.setToolTip('文件传输工具');
    tray.on('click', () => {
        open();
    })

    /* 事件处理 */
    ipcMain.on('quit', (event, arg) => {
        if (process.platform !== 'darwin') {
            mainWindow.hide();
        } else {
            mainWindow.minimize();
        }
    })
    /* 打开目录 */
    ipcMain.on('open', (event, arg) => {
        shell.openItem(filesPath);
    })
    /* 打开链接 */
    ipcMain.on('link', (event, link) => {
        shell.openExternal(link);
    })
    /* 上传文件 */
    ipcMain.on('copy', (event, files) => {
        Promise.all(files.map((file) =>
            copy(file, filesPath)
        )).then((ret) => {
            event.sender.send('copy-reply', ret);
        }).catch((err) => {
            console.log(err)
        });
    })
    /* 开启服务器 */
    ipcMain.on('start', (event, arg) => {
        let [downloadPath, uploadPath] = [filesPath, path.join(filesPath, 'upload')];
        !fs.existsSync(downloadPath) && fs.mkdirSync(downloadPath);
        !fs.existsSync(uploadPath) && fs.mkdirSync(uploadPath);
        event.sender.send('files-path', filesPath);
        getPort(basePort, 2).then((ports) => {
            let [downloadPort, uploadPort] = ports;
            let downloadOpts = {
                port: downloadPort,
                root: downloadPath
            }
            let uploadOpts = {
                port: uploadPort,
                root: uploadPath
            }
            Promise.all([getIp(), download(downloadOpts), upload(uploadOpts)]).then((values) => {
                event.sender.send('start-reply', values);
                let [{ ips, wirelessIps }, downloadRetPort, uploadRetPort] = values;
                console.log('Download:');
                wirelessIps.forEach((x) => {
                    console.log('http://' + x + ':' + downloadRetPort);
                })
                console.log('Upload:');
                wirelessIps.forEach((x) => {
                    console.log('http://' + x + ':' + uploadRetPort);
                })
            })
        }).catch((err) => {
            throw err;
        });
    })

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    })

    mainWindow.on('closed', function () {
        mainWindow = null;
    })
}

/* 设置目录 */
function setFilesPath() {
    let path = dialog.showOpenDialog({ properties: ['openFile', 'openDirectory'] });
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
    tray.destroy();
    app.quit();
}

/* 退出 */
function quit() {
    tray.destroy();
    app.quit();
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