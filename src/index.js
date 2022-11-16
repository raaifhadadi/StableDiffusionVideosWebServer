const express = require('express')
const axios = require('axios')
const app = express()
const port = 3000


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/generate', async (req, res) => {

    const query = req.query

    const axiosResponse = await axios({
        url: 'http://109.158.65.154:8080/api',
        responseType: 'stream',
        params: query,
        timeout: 100000000
    }).catch((error) => {
        res.send(error)
    })

    axiosResponse.data.pipe(res)
    res.header("Access-Control-Allow-Origin", "*");
    res.contentType('video/mp4');

})

app.get('/api', async (req, res) => {

    const axiosResponse = await axios({
        url: 'http://109.158.65.154:8080/test',
        responseType: 'stream'
    }).catch((error) => {
        res.send(error)
    })

    res.header("Access-Control-Allow-Origin", "*");
    res.contentType('video/mp4');
    axiosResponse.data.pipe(res)

})

app.get('/api3', async (req, res) => {

    res.header("Access-Control-Allow-Origin", "*");
    res.contentType('video/mp4');
    res.sendFile('./turtle.mp4', { root: __dirname });

})

app.get('/api2', (req, res) => {

    axios.get('http://109.158.65.154:8080/test2').then((response) => {
        // console.log(response.data)
        res.header("Access-Control-Allow-Origin", "*");
        // res.contentType('video/mp4')
        res.send(response.data)
    }).catch((error) => {
        res.send(error)
    })
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})