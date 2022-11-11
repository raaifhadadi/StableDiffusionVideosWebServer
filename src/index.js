const express = require('express')
const axios = require('axios')
const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/api', (req, res) => {
    // res.send('Hello API!!!')
    axios.get('http://109.158.65.154:8080/test').then((response) => {
        console.log(response.data)
        res.header("Access-Control-Allow-Origin", "*");
        res.setHeader('content-type', 'video/mp4');
        res.send(response.data)
    })
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})