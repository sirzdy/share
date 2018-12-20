// Modules to control application life and create native browser window
const {
    app,
    BrowserWindow,
    globalShortcut,
    clipboard,
    Tray,
    Menu,
    nativeImage,
    ipcMain,
    dialog,
    shell
} = require("electron");
const settings = require("electron-settings");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
var c = require("child_process");

const { download } = require("./server/download");
const { upload, io } = require("./server/upload");
const { getPort } = require("./server/port");
const { getIp } =
    process.platform === "darwin"
        ? require("./server/ip-mac")
        : require("./server/ip-windows");
const { copy } = require("./server/file");
const { writeText } = require("./server/text");
const {
    addCollections,
    getCollections,
    delCollections
} = require("./server/collect");

const gotTheLock = app.requestSingleInstanceLock();

/* 起始端口号 */
const basePort = 1225;
/* 主页 */
const index = "./client/index.html";
/* 二维码 */
const qrcodePage = "./client/qrcode.html";
/* 默认路径, 实际路径 */
const defaultPath = path.join(os.homedir(), "Documents", "files");
/* 默认类型，仅显示无线网 */
let type = null;
const defaultType = 1;
const isDev = false;
const localVersion = "3.2.0";

let filesPath = defaultPath;
let uploadPath;
let downloadPath;
let textPath;
let collectionPath;

let mainWindow = null;
let tray = null;
let icon = nativeImage.createFromPath(path.join(__dirname, "icon.png"));

function startApp() {
    let settingPath = null;
    let settingType = null;
    try {
        settingPath = settings.get("path");
        settingType = settings.get("type");
    } catch (err) {
        console.log(err);
        // throw err;
    }
    /* 目录 */
    filesPath = settingPath || defaultPath;
    downloadPath = path.join(filesPath, "download");
    uploadPath = path.join(filesPath, "upload");
    textPath = path.join(filesPath, "text");
    collectionPath = path.join(textPath, "collections.csv");
    [filesPath, downloadPath, uploadPath, textPath].forEach(mkdir);
    /* 类型 */
    type = settingType || defaultType;

    // 修复无法复制粘贴等问题
    let template = [
        {
            label: "Application",
            submenu: [
                { label: "关于", selector: "orderFrontStandardAboutPanel:" },
                { type: "separator" },
                {
                    label: "退出",
                    accelerator: "Command+Q",
                    click: function() {
                        quit();
                    }
                }
            ]
        },
        {
            label: "编辑",
            submenu: [
                {
                    label: "撤销",
                    accelerator: "CmdOrCtrl+Z",
                    selector: "undo:"
                },
                {
                    label: "恢复",
                    accelerator: "Shift+CmdOrCtrl+Z",
                    selector: "redo:"
                },
                { type: "separator" },
                { label: "剪切", accelerator: "CmdOrCtrl+X", selector: "cut:" },
                {
                    label: "复制",
                    accelerator: "CmdOrCtrl+C",
                    selector: "copy:"
                },
                {
                    label: "粘贴",
                    accelerator: "CmdOrCtrl+V",
                    selector: "paste:"
                },
                {
                    label: "全选",
                    accelerator: "CmdOrCtrl+A",
                    selector: "selectAll:"
                }
            ]
        },
        {
            label: "功能",
            submenu: [
                {
                    label: "发送剪贴板",
                    accelerator: "CmdOrCtrl+Alt+C",
                    click: function() {
                        sendClipboard();
                    }
                },
                { label: "重启", accelerator: "CmdOrCtrl+R", click: restart }
            ]
        }
    ];
    // 菜单
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    // 托盘
    if (process.platform !== "darwin") {
        tray = new Tray(icon);
    } else {
        tray = new Tray(
            nativeImage.createFromPath(path.join(__dirname, "tray.png"))
        );
    }
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "打开窗口",
            click() {
                open();
            }
        },
        {
            type: "separator"
        },
        {
            label: "发送剪贴板",
            click() {
                sendClipboard();
            }
        },
        {
            type: "separator"
        },
        {
            label: "设置目录",
            click() {
                setFilesPath();
            }
        },
        {
            label: "设置网络",
            type: "submenu",
            submenu: [
                {
                    label: "全部",
                    type: "radio",
                    checked: false,
                    click() {
                        setShowType(0);
                    }
                },
                {
                    label: "无线网",
                    type: "radio",
                    checked: true,
                    click() {
                        setShowType(1);
                    }
                },
                {
                    label: "有线网",
                    type: "radio",
                    checked: false,
                    click() {
                        setShowType(2);
                    }
                }
            ]
        },
        {
            type: "separator"
        },
        {
            label: "检查更新",
            click() {
                checkUpdate();
            }
        },
        {
            label: "查看帮助",
            click() {
                help();
            }
        },
        {
            label: "意见反馈",
            click() {
                feedback();
            }
        },
        {
            type: "separator"
        },
        {
            label: "重新启动",
            click() {
                restart();
            }
        },
        {
            label: "退出程序",
            click() {
                quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip("文件传输工具");
    tray.on("click", () => {
        open();
    });

    /* 事件处理 */
    ipcMain.on("quit", (event, arg) => {
        minimize();
    });

    /* 放大 */
    ipcMain.on("zoom", (event, content, title) => {
        var win = new BrowserWindow({
            width: 800,
            height: 800,
            minWidth: 100,
            minHeight: 100,
            title: title,
            resizable: true,
            parent: mainWindow,
            movable: false,
            alwaysOnTop: true,
            frame: false,
            backgroundColor: "#fff"
        });
        win.loadFile(qrcodePage);
        win.webContents.executeJavaScript(`
            init('${content}')
        `);
    });

    /* 上传文件 */
    ipcMain.on("top", event => {
        setAlwaysOnTop().then(flag => {
            event.sender.send("top-reply", flag);
        });
    });

    /* 打开目录 */
    ipcMain.on("open", (event, arg) => {
        shell.openItem(filesPath);
    });

    /* 打开链接 */
    ipcMain.on("link", (event, link) => {
        shell.openExternal(link);
    });

    /* 收藏 */
    ipcMain.on("collect", (event, content, remark) => {
        addCollections(content, remark, collectionPath)
            .then(() => {
                event.sender.send("collect-reply", true);
            })
            .catch(err => {
                console.log(err);
                event.sender.send("collect-reply", false);
            });
    });

    /* 收藏 */
    ipcMain.on("delete-collection", (event, content, remark) => {
        delCollections(content, collectionPath)
            .then(() => {
                event.sender.send("delete-collection-reply", true);
            })
            .catch(err => {
                console.log(err);
                event.sender.send("delete-collection-reply", false);
            });
    });

    /* 拷贝 */
    ipcMain.on("copy-clipboard", (event, content) => {
        clipboard.writeText(content);
        event.sender.send("copy-clipboard-reply", true);
    });

    /* 拷贝二维码 */
    ipcMain.on("copy-img", (event, dataURL) => {
        // let image = nativeImage.createFromPath(path.join(__dirname, "tray.png"));
        let image = nativeImage.createFromDataURL(dataURL);
        clipboard.writeImage(image);
        event.sender.send("copy-img-reply", true);
    });

    /* 下载二维码 */
    ipcMain.on("download-img", (event, dataURL) => {
        dialog.showSaveDialog(
            mainWindow,
            {
                title: "请选择要保存的位置",
                defaultPath: path.join(os.homedir(), "Desktop", "qrcode.png")
            },
            filename => {
                if (!filename) return;
                fs.writeFile(
                    filename,
                    nativeImage.createFromDataURL(dataURL).toPNG(),
                    err => {
                        if (err) {
                            event.sender.send("download-img-reply", true);
                            throw err;
                        }
                        event.sender.send("download-img-reply", true);
                    }
                );
            }
        );
    });

    /* 查询收藏 */
    ipcMain.on("get-collections", (event, content, remark) => {
        getCollections(collectionPath)
            .then(data => {
                event.sender.send("get-collect-reply", data);
            })
            .catch(err => {
                console.log(err);
                event.sender.send("get-collect-reply", false);
            });
    });

    /* 更新 */
    ipcMain.on("go-update", (event, content, remark) => {
        goUpdate();
    });

    /* 传输文本 */
    ipcMain.on("send", (event, content) => {
        // shell.openExternal(link);
        io.emit("new message", content);
        writeText(content, textPath)
            .then(() => {
                event.sender.send("send-reply", true);
            })
            .catch(err => {
                console.log(err);
                event.sender.send("send-reply", false);
            });
    });

    /* 上传文件 */
    ipcMain.on("copy", (event, files) => {
        Promise.all(files.map(file => copy(file, downloadPath)))
            .then(ret => {
                io.emit("new files", ret);
                event.sender.send("copy-reply", ret);
            })
            .catch(err => {
                console.log(err);
            });
    });

    /* 开启服务器 */
    ipcMain.on("start", (event, arg) => {
        event.sender.send("files-path", filesPath);
        if (app.values) {
            event.sender.send("start-reply", [...app.values, type]);
            return;
        }
        getPort(basePort, 2)
            .then(ports => {
                let [uploadPort, downloadPort] = ports;
                let downloadOpts = {
                    port: downloadPort,
                    root: downloadPath
                };
                let uploadOpts = {
                    port: uploadPort,
                    downloadPort,
                    collectionPath,
                    textPath,
                    root: uploadPath
                };
                Promise.all([
                    getIp(),
                    download(downloadOpts),
                    upload(uploadOpts)
                ]).then(values => {
                    app.values = values;
                    event.sender.send("start-reply", [...values, type]);
                    let [
                        { ips, wirelessIps },
                        downloadRetPort,
                        uploadRetPort
                    ] = values;
                    let wiredIps = [];
                    ips.forEach(ip => {
                        if (wirelessIps.indexOf(ip) < 0) {
                            wiredIps.push(ip);
                        }
                    });
                    console.log("Download:");
                    wirelessIps.length &&
                        wirelessIps.forEach(x => {
                            console.log(
                                "[wireless]",
                                "http://" + x + ":" + downloadRetPort
                            );
                        });
                    wiredIps.length &&
                        wiredIps.forEach(x => {
                            console.log(
                                "[wired]",
                                "http://" + x + ":" + downloadRetPort
                            );
                        });
                    console.log("Upload:");
                    wirelessIps.length &&
                        wirelessIps.forEach(x => {
                            console.log(
                                "[wireless]",
                                "http://" + x + ":" + uploadRetPort
                            );
                        });
                    wiredIps.length &&
                        wiredIps.forEach(x => {
                            console.log(
                                "[wired]",
                                "http://" + x + ":" + uploadRetPort
                            );
                        });
                });
            })
            .catch(err => {
                throw err;
            });
        update().then(info => {
            event.sender.send("auto-update-reply", info);
        });
    });

    /* 注册剪贴板事件 */
    globalShortcut.register("CommandOrControl+Alt+C", function() {
        sendClipboard();
    });
}

function createWindow() {
    let width = isDev ? 900 : 300;
    mainWindow = new BrowserWindow({
        width,
        height: 650,
        minWidth: width,
        minHeight: 650,
        show: false,
        // resizable: false,
        enableLargerThanScreen: false,
        alwaysOnTop: false,
        frame: true,
        // titleBarStyle: 'customButtonsOnHover',
        transparent: false,
        autoHideMenuBar: true,
        skipTaskbar: true,
        // closable: false,
        darkTheme: true
    });

    mainWindow.loadFile(index);
    // 图标
    if (process.platform !== "darwin") {
        mainWindow.setIcon(icon);
    }
    // Open the DevTools.
    isDev && mainWindow.webContents.openDevTools();

    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
    });

    mainWindow.on("minimize", function(event) {
        event.preventDefault();
        minimize();
    });

    mainWindow.on("close", function(event) {
        if (process.platform !== "darwin") {
            if (!app.isQuiting) {
                event.preventDefault();
                minimize();
            }
        }
    });

    mainWindow.on("closed", function() {
        mainWindow = null;
    });
}

function goUpdate() {
    const githubReleases = "https://github.com/sirzdy/share/releases";
    shell.openExternal(githubReleases);
}

function update() {
    // let localRawInfo = fs.readFileSync("package.json", "utf8");
    // let localInfo = JSON.parse(localRawInfo);
    // let localVersion = localInfo.version;
    let url =
        "https://raw.githubusercontent.com/sirzdy/share/master/package.json";
    return new Promise((resolve, reject) => {
        https.get(url, function(res) {
            var statusCode = res.statusCode;
            if (statusCode !== 200) {
                // 出错回调
                // error();
                // 消耗响应数据以释放内存
                res.resume();
                return;
            }
            res.setEncoding("utf8");
            var rawData = "";
            res.on("data", function(chunk) {
                rawData += chunk;
            });

            // 请求结束
            res.on("end", function() {
                // 成功回调
                // console.log(JSON.parse(JSON.stringify(rawData)));
                let remoteInfo = JSON.parse(rawData);
                let remoteVersion = remoteInfo.version;
                if (localVersion === remoteVersion) {
                    // console.log("已经是最新版本了");
                    resolve({ hasNewVersion: false, msg: "已经是最新版本了" });
                }
                if (localVersion < remoteVersion) {
                    // console.log("有新版本");
                    resolve({
                        hasNewVersion: true,
                        msg: `当前版本: ${localVersion}, 可升级到: ${remoteVersion}`
                    });
                }
                // success(rawData);
            }).on("error", function(e) {
                // 出错回调
                // error();
                // console.log('error');
            });
        });
    });
}

/* 创建目录 */
function mkdir(path) {
    !fs.existsSync(path) && fs.mkdirSync(path);
}

/* 设置网络类型 0 全部 1 仅无限网 2 仅有线网 */
function setShowType(type) {
    mainWindow.webContents.send("show-type", type);
    settings.set("type", type);
}

/* 设置目录 */
function setFilesPath() {
    let path = dialog.showOpenDialog({
        title: "请选择共享目录",
        defaultPath: filesPath,
        properties: ["openFile", "openDirectory"]
    });
    if (!path) return;
    if (path[0] === filesPath) return;
    settings.set("path", path[0]);
    restart();
}

/* 打开主窗口 */
function open() {
    if (!mainWindow) createWindow();
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
}

/* 发送剪贴板内容 */
function sendClipboard() {
    let content = clipboard.readText();
    if (!content) {
        dialog.showMessageBox({
            type: "info",
            message: "发送失败",
            detail: "剪贴板不含文本或剪贴板为空",
            buttons: ["OK"]
        });
        return;
    }
    io.emit("new message", content);
    writeText(content, textPath)
        .then(() => {
            dialog.showMessageBox({
                type: "info",
                message: "剪贴板内容发送成功!",
                detail: content,
                buttons: ["OK"]
            });
        })
        .catch(err => {
            dialog.showMessageBox({
                type: "info",
                message: "剪贴板内容发送失败!",
                detail: content,
                buttons: ["OK"]
            });
        });
}

/* 设置置顶 */
function setAlwaysOnTop() {
    return new Promise((resolve, reject) => {
        let flag = !mainWindow.isAlwaysOnTop();
        mainWindow.setAlwaysOnTop(flag);
        resolve(flag);
    });
}

/* 重启 */
function restart() {
    app.relaunch();
    app.exit();
}

/* 退出 */
function quit() {
    if (process.platform !== "darwin") {
        app.isQuiting = true;
    }
    // mainWindow.destroy();
    app.quit();
}

/* 最小化 */
function minimize() {
    if (process.platform !== "darwin") {
        mainWindow.hide();
    } else {
        mainWindow.minimize();
    }
}

/* 检查更新 */
function checkUpdate() {
    update().then(info => {
        if (info.hasNewVersion) {
            dialog.showMessageBox(
                {
                    type: "info",
                    message: "发现新版本",
                    detail: info.msg,
                    buttons: ["立即升级", "取消"]
                },
                response => {
                    if (response === 0) {
                        goUpdate();
                    }
                }
            );
        } else {
            dialog.showMessageBox({
                type: "info",
                message: "暂无更新",
                detail: info.msg,
                buttons: ["确定"]
            });
        }
    });
}

/* 查看帮助 */
function help() {
    const github = "https://github.com/sirzdy/share";
    shell.openExternal(github);
}

/* 意见反馈 */
function feedback() {
    const githubIssues = "https://github.com/sirzdy/share/issues";
    shell.openExternal(githubIssues);
}

/* 意见反馈 */
function feedback() {
    const githubIssues = "https://github.com/sirzdy/share/releases";
    shell.openExternal(githubIssues);
}

/* 只允许一个实例 */
if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });

    // Create mainWindow, load the rest of the app, etc...
    app.on("ready", () => {
        startApp();
        createWindow();
    });
}

app.on("window-all-closed", function() {
    if (process.platform !== "darwin") {
        quit();
    }
});

app.on("will-quit", function() {
    globalShortcut.unregisterAll();
    mainWindow = null;
});

app.on("activate", function() {
    if (mainWindow === null) {
        createWindow();
    }
});
