const express = require('express')
const axios = require('axios')
const app = express()
const port = 3001
const serverURL = 'http://109.158.65.154:8080'  //TODO: extract to config

var nextJobID = 1

// List of all the machines available
// elements are of form:
// {
//   id: 'machine_id',
//   ip: 'xxx.xxx.xxx.xxx,
//   status: 'machine_status',
//   lock: machine_lock
// }
const gpuMachines = []

// List of all the jobs available
// elements are of form:
// {
//   id: 'job_id',
//   status: 'job_status',
//   machine: 'machine_id'
//   body: {
//     prompts: 'prompt1;promp1;...',
//     mode: 'mode', 
//     etc
//   }
// }
const requests = []


/*
NEW PROPOSED FLOW:

    1. Client sends a GET request with prompt, setting etc
    2. Server responds with a job id, adds job to requests list

    3. Client begins polling server for job status (GEt request with job id)
    4. switch(job.status) {
        case 'pending':
            // client dislpays "waiting for machine" message
            // server is trying to asign machine to first job in requests list
        case 'generating init frames + int': 
            // client displays "generating init frames" message + loading bar
        case 'generating frames complete':
            // client sends new GET request with job id and seed number
            // server forwards response to gpu machine to gen video and reruns 200
            // client begins polling again
        case 'generating video + int':
            // client displays "generating video " message + loading bar
        case 'video complete':
            // clinet sends get request to get the video
            // server gets video, releases machine lock, and sends video to client
            // client displays video
    }
*/

// GET request to initialise a job
app.get('/job', (req, res) => {
    requests.push({
        id: nextJobID,
        status: 'pending',
        machine: null,
        body: req.query
    })
    console.log(requests)
    nextJobID++
    res.header("Access-Control-Allow-Origin", "*");
    res.contentType('application/json');
    res.send({ id: nextJobID - 1 })
})

// poll for job status
app.get('/status', (req, res) => {
    const jobID = req.query.jobID
    const job = requests.find(job => job.id == jobID)
    if (job) {
        res.header("Access-Control-Allow-Origin", "*");
        res.contentType('text/plain');
        res.send({ status: job.status })
    } else {
        res.status(404).send('Job not found')
    }
})

// Hello World
app.get('/', (req, res) => {
    res.send('Hello World!')
})


// API to genereate initial frames
app.get('/api/generateFrames', (req, res) => {
    axios.get(serverURL + '/test')
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
        url: serverURL + '/api',
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
        url: serverURL + '/test',
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