function hint(msg, type, duration) {
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