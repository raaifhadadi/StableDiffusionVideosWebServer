const express = require('express')
const { download } = require('fetch-video');
const axios = require('axios')
const app = express()
const port = 3000
const src = ""
const URL = require('url').URL;

const queue = []

const machines = []

vid_request = {
    prompt: "What is the name of the video you want to watch?",
    setting1: "Video",
}

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/api', (req, res) => {

    // axios({
    //     method: 'get',
    //     url: 'http://109.158.65.154:8080/test',
    //     responseType: 'blob',
    //     timeout: 10000000,
    // })
    //     .then((response) => {
    //         // console.log(response.data)
    //         src = (URL.createObjectURL(response.data));
    //         console.log(src);
    //     })
    // res.send(src)

    // axios.get('http://109.158.65.154:8080/test').then((response) => {
    //     // console.log(response);
    //     // console.log(response.data)
    //     res.status(200)
    //     res.header("Access-Control-Allow-Origin", "*");
    //     res.contentType('video/mp4');
    //     // res.send(response.data)
    //     res.json(response)
    // })

    const downloader = download('http://109.158.65.154:8080/test', 'video.mp4', "GET")
    downloader.go().then(() => {
        res.sendFile(__dirname + '/video.mp4')
    })

})

app.get('/api2', (req, res) => {

    axios.get('http://109.158.65.154:8080/test2').then((response) => {
        // console.log(response.data)
        res.header("Access-Control-Allow-Origin", "*");
        // res.contentType('video/mp4')
        res.send(response.data)
    })
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})