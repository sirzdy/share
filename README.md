# 局域网共享工具

**局域网内设备通过wifi实现文件传输(电脑<->移动设备)**
**局域网内设备通过wifi实现文本传输(电脑<->移动设备)**

## 快照

【应用快照】

![应用快照](snapshot/new.png)

【下载快照】

![下载快照](snapshot/download.png)

【上传快照】

![上传快照](snapshot/upload.png)

【文本传输快照】

![文本传输快照](snapshot/text.png)

## 功能

- 移动设备访问电脑磁盘文件或下载
- 移动设备上传文件到电脑
- 实现电脑设备快速共享文本到移动设备

## 使用

- 打开应用(请保证电脑与移动设备处于同一局域网，可以通过win10自带移动热点或猎豹wifi等共享热点)
- 应用将启动服务，生成链接，并生成当前所选链接的二维码
- 左键点击链接可以生成对应的二维码，右键点击链接在默认浏览器中打开当前链接
- 点击打开目录预览共享目录，可以通过资源管理器向共享目录拷贝文件目录等，亦可以将文件拖拽带应用窗口实现文件上传(不支持文件夹)
- 移动设备浏览器中打开对应链接。扫描二维码(iphone自带相机即可扫描二维码)/手动输入地址
- 默认共享目录是 `~/Documents/files/`，托盘菜单选择设置目录可以修改目录
- 使用 `Cmd/Ctrl+Alt+C` 可以快速发送剪贴板文字，也可以使用面本的文本框输入并发送(输入框支持Cmd/Ctrl+Enter发送，ESC清空)


## 运行

```bash
# Clone this repository
git clone https://github.com/sirzdy/file-transfer.git
# Go into the repository
cd file-transfer
# Install dependencies
npm install electron-builder -g
npm install
# Run the app
npm start
# Pack 
npm run dist
```

## 技术点

- 使用 [electron](https://github.com/electron/electron) 构建应用
- 使用 [electron-settings](https://github.com/nathanbuchar/electron-settings) 存储用户配置
- 使用 [http-server](https://github.com/indexzero/http-server) 实现下载服务
- 使用 [express](https://github.com/expressjs/express) [multer](https://github.com/expressjs/multer) 实现上传服务
- 使用 [QRCode.js](https://github.com/davidshimjs/qrcodejs) 实现二维码生成
- 使用 [socket.io](https://socket.io/) 实现文本传输
- 使用 [fast-csv](https://github.com/C2FO/fast-csv) 实现文本存储到csv文件

## License

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.
