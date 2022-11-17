const express = require('express')
const axios = require('axios')
const app = express()
const port = 3000

// Hello World
app.get('/', (req, res) => {
    res.send('Hello World!')
})


// API to genereate initial frames
app.get('/api/generateFrames', (req, res) => {
    axios.get('http://109.158.65.154:8080/test')
        .then(response => {
            res.send(response.data.data)
        })
        .catch(error => {
            res.send(error)
        })
})

// Api to generate and return a video
app.get('/generate', async (req, res) => {

    const query = req.query

    axios({
        url: 'http://109.158.65.154:8080/api',
        responseType: 'stream',
        params: query,
        timeout: 100000000
    }).then(response => {
        res.header("Access-Control-Allow-Origin", "*");
        res.contentType('video/mp4');
        response.data.pipe(res)
    }).catch((error) => {
        res.status(500).send(error)
    })

})

// *Unused* api to check server returns pre-generated video from flask fs
app.get('/getPreGeneratedVideo', async (req, res) => {

    axios({
        url: 'http://109.158.65.154:8080/test',
        responseType: 'stream'
    }).then(response => {
        res.header("Access-Control-Allow-Origin", "*");
        res.contentType('video/mp4');
        response.data.pipe(res)
    }).catch(error => {
        res.status(500).send(error);
    })

})

// *Unused* api to return a pre-generated video from express fs
app.get('/api3', async (req, res) => {

    res.header("Access-Control-Allow-Origin", "*");
    res.contentType('video/mp4');
    res.sendFile('./turtle.mp4', { root: __dirname });

})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})