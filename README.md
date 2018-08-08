# 局域网文件传输工具(FileTransfer)

**局域网内设备通过wifi实现文件传输(电脑<->移动设备), 目前仅适配windows**

## 快照(Snapshot)

![快照](snapshot/window.png)

## 使用(To Use)

```bash
# Clone this repository
git clone https://github.com/sirzdy/file-transfer.git
# Go into the repository
cd file-transfer
# Install dependencies
npm install
# Run the app
npm start
# Pack 
npm install electron-builder -g
npm run dist
```

## 功能(Function)

- 移动设备访问电脑磁盘文件或下载
- 移动设备上传文件到电脑

## 使用(Usage)

- 打开应用(请保证电脑与移动设备处于同一局域网，可以通过win10自带移动热点或猎豹wifi等共享热点)
- 应用将启动服务，生成下载的链接与上传的链接，并生成当前所选链接的二维码
- 左键点击链接可以生成对应的二维码，右键点击链接在默认浏览器中打开当前链接
- 点击打开目录预览共享目录，可以通过资源管理器向共享目录拷贝文件目录等，亦可以将文件拖拽带应用窗口实现文件上传(不支持文件夹)
- 移动设备浏览器中打开对应链接。扫描二维码(iphone自带相机即可扫描二维码)/手动输入地址
- 默认共享目录是 `~/Documents/files/`，右键托盘选择设置目录可以修改目录

## 技术点

- 使用 [electron](https://github.com/electron/electron) 构建应用
- 使用 [electron-settings](https://github.com/nathanbuchar/electron-settings) 存储用户配置
- 使用 [http-server](https://github.com/indexzero/http-server) 实现下载服务
- 使用 [express](https://github.com/expressjs/express) [multer](https://github.com/expressjs/multer) 实现上传服务
- 使用 [QRCode.js](https://github.com/davidshimjs/qrcodejs) 实现二维码生成
- 关于本机无线网络连接ip的获取，使用 `wmic.get_list` 获取设备管理器设备列表(可以获取无线网卡)，使用 `os.networkInterfaces()` 获取所有的网络连接，二者结合进行筛选

## License

[CC BY-NC-ND 2.5](https://creativecommons.org/licenses/by-nc-nd/2.5/)

