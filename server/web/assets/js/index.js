let Input = document.querySelector("#input");
let File = document.querySelector("#file");
let Ul = document.querySelector("#ul");
let Loading = document.querySelector(".loading");
let bot = document.querySelector("#bot");
File.onclick = () => Input.click();
window.onload = () => {
    Loading.style.display = 'none';
}
Input.onchange = function upload() {
    var files = !!this.files ? this.files : [];
    if (!files.length || !window.FileReader) {
        alert("浏览器不支持HTML5");
        return false;
    };
    Loading.style.display = 'flex';
    // 创建一个FormData对象,用来组装一组用 XMLHttpRequest发送请求的键/值对
    var fd = new FormData();
    // 把 input 标签获取的文件加入 FromData 中
    for (var i = 0; i < files.length; i++) {
        fd.append('files', files[i]);
    }
    // Ajax
    var request = new XMLHttpRequest();
    request.open("POST", "upload");
    request.send(fd);
    request.onreadystatechange = function () {
        if (request.readyState === 4 & request.status === 200) {
            Loading.style.display = 'none';
            var response = JSON.parse(request.responseText);
            response.rets.forEach((info) => {
                let li = document.createElement('li');
                let file = document.createElement('h3');
                let path = document.createElement('p');
                let size = document.createElement('p');
                let time = document.createElement('p');
                file.innerText = `【${info.originalname}】`;
                path.innerText = `[path] ${info.path}`;
                size.innerText = `[size] ${info.size}bytes`;
                time.innerText = `[time] ${new Date().toTimeString()}`;
                li.appendChild(file);
                li.appendChild(path);
                li.appendChild(size);
                li.appendChild(time);
                Ul.insertBefore(li, bot);
            })
            bot.scrollIntoView();
        }
    }
}