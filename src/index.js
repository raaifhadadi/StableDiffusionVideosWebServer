const express = require('express')
const axios = require('axios')
const app = express()
const port = 3000


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/generate', async (req, res) => {

    // get query from url
    const query = req.query
    console.log(query)

    const axiosResponse = await axios({
        url: 'http://109.158.65.154:8080/api',
        responseType: 'stream',
        params: query,
        timeout: 100000000
    })

    axiosResponse.data.pipe(res)
    res.header("Access-Control-Allow-Origin", "*");
    res.contentType('video/mp4');

})

app.get('/api', async (req, res) => {

    const axiosResponse = await axios({
        url: 'http://109.158.65.154:8080/test',
        responseType: 'stream'
    })

    axiosResponse.data.pipe(res)
    res.header("Access-Control-Allow-Origin", "*");
    res.contentType('video/mp4');

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