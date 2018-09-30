var app = new Vue({
    el: '#app',
    data: {
        texts: [],
        newTexts: []
    },
    mounted() {
        this.$refs.startDate.value = this.getDate(new Date());
        this.$refs.endDate.value = this.getDate(new Date());
        this.getTexts();
    },
    filters: {
        getTime: function (date) {
            date = new Date(Number(date));
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
        }
    },
    methods: {
        getDate(date) {
            return `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        },
        copy(content) {
            // console.log(content);、
            if (ClipboardJS.isSupported()) {
                new ClipboardJS('.text_fn_copy');
                hint('复制成功');
            } else {
                hint('系统不支持，请手动复制');
            }
        },
        addText() {
            let content = this.$refs.textarea.value;
            if (!content) {
                hint('请输入内容！', 'fail');
                return;
            }
            axios.post('/addText', {
                content
            }).then((response) => {
                console.log(response.data);
                if (response.data.state) {
                    hint('发送成功!!!');
                    this.newTexts.push([Date.now(), content]);
                } else {
                    hint(response.data.error, 'fail');
                }
            }).catch(function (error) {
                console.log(error);
            });
        },
        getTexts() {
            let startDate = this.$refs.startDate.value;
            let endDate = this.$refs.endDate.value;
            axios.get('/getTexts', {
                params: {
                    startDate, endDate
                }
            }).then((response) => {
                let texts = response.data.texts;
                texts.forEach(x => x.res.sort((a, b) => a[0] < b[0]));
                texts.sort((a, b) => a.date < b.date);
                this.texts = texts;
            }).catch(function (error) {
                console.log(error);
            });
        }
    }
})

