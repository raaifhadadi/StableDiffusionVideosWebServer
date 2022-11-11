const express = require('express')
const axios = require('axios')
const app = express()
const port = 3000


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/api', async (req, res) => {


    // axios.get('http://109.158.65.154:8080/test').then((response) => {
    //     // console.log(response);
    //     // console.log(response.data)
    //     res.status(200)
    //     // res.send(response.data)
    //     res.json(response)
    // })

    const axiosResponse = await axios({
        url: 'http://109.158.65.154:8080/test',
        responseType: 'stream'
    })

    axiosResponse.data.pipe(res)
    res.header("Access-Control-Allow-Origin", "*");
    res.contentType('video/mp4');

    // const downloader = download('http://109.158.65.154:8080/test', 'video.mp4', "GET")
    // downloader.go().then(() => {
    //     res.sendFile(__dirname + '/video.mp4')
    // })

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