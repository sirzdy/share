let download = document.querySelector("#download");
download.onclick = () => {
    // let protocol = window.location.protocol;
    // let hostname = window.location.hostname;
    // let ajax = new XMLHttpRequest();
    // ajax.open('get', 'download');
    // ajax.send();
    // ajax.onreadystatechange = function () {
    //     if (ajax.readyState == 4 && ajax.status == 200) {
    //         let ret = JSON.parse(ajax.responseText);
    //         if (ret.state) {
    //             window.location.port = ret.downloadPort;
    //         }
    //     }
    // }
    axios.get('/download', {}).then(function (response) {
        window.location.port = response.data.downloadPort;
    }).catch(function (error) {
        console.log(error);
    });
};
