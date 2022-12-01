const express = require("express");
const axios = require("axios");
const fs = require("fs");
// import * as fs from "node:fs";
var Blob = require("blob");
const { initializeApp } = require("firebase-admin/app");
const { Storage } = require("@google-cloud/storage");
const app = express();
const port = 3001;
const serverURL = "109.158.65.154:8080"; //TODO: extract to config
const GOOGLE_APPLICATION_CREDENTIALS =
  "./stable-diffusion-videos-firebase-adminsdk-1hsdk-e7dde4e502.json";

///////////////////////////////////////////////////////////////from here

// const fetch = require("node-fetch");
// const fs = require("fs");

// const response = await fetch(
//   "https://stablediffusionvideoswebserver-production.up.railway.app/api3"
// );
// const buffer = await response.buffer();

// fs.writeFile(`./videos/name.mp4`, buffer, () =>
//   console.log("finished downloading video!")
// );

///////////////////////////////////////////////tohere

// initializeApp({
//   credential: applicationDefault(),
//   databaseURL: "https://stable-diffusion-videos-default-rtdb.firebaseio.com",
// });

const gc = new Storage({
  keyFilename: GOOGLE_APPLICATION_CREDENTIALS,
  projectId: "stable-diffusion-videos",
});

const bucket = gc.bucket("gcf-sources-59636912597-us-central1");
bucket.file("./api3.mp4");

var nextJobID = 1;
const jobStages = [
  "pending",
  "genertaing initial frames",
  "initial frames generated",
  "generating video",
  "video generated",
];

// List of all the machines available
// elements are of form:
// {
//   id: 'machine_id',
//   ip: 'xxx.xxx.xxx.xxx,
//   status: 'machine_status',
//   lock: machine_lock
// }
const gpuMachines = [
  {
    id: "1",
    ip: serverURL,
    status: "available",
    lock: false,
  },
];

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
const requests = [];
// TODO: redesign to just hold job ids?

// Map from job IDs to their status
const jobs = new Map([]);

// TODO: should empty jobs sometime when we don't think they need it anymore
// After we send the content to the client is ideal

// TODO: what happens if the user doesn't select a frame? does the machine stay 'busy'?
// could maybe have 2 queues to make a second wait less of a problem

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

/*
Queue management
- Driven by requests (we don't need a loop just to monitor the queue)
- When requests are being served, they schedule their own callbacks to completion
- When a new request is made, we schedule a poll
  - When we poll we schedule as many requests as we can (until no machine is free)
- When a machine becomes free, we schedule a poll
- For the second request (with the init frame selection) we just need to schedule callbacks (doesn't interact with the queue)
*/

function sleep(s) {
  return new Promise((r) => setTimeout(r, s * 1000));
}

app.get("/request", async (req, res) => {
  const jobID = queueRequest(req.query);
  processQueue();

  res.header("Access-Control-Allow-Origin", "*");
  res.contentType("application/json");
  res.send({ id: jobID });
});

function queueRequest(query) {
  const jobID = nextJobID;
  nextJobID++;

  jobs.set(jobID, {
    status: "pending",
    machine: null,
    body: query,
  });

  requests.push(jobID);
  return jobID;
}

function processQueue() {
  while (true) {
    const machine = findFreeMachine();

    if (machine === null || requests.length == 0) {
      return;
    }

    // Dequeue
    const jobID = requests.shift();

    const job = jobs.get(jobID);
    assignJob(job, machine);
    runJob(job, machine);
  }
}

// Assign a pending job to a machine
// Pre: the job is pending and the machine is free
function assignJob(job, machine) {
  console.assert(job.status == "pending");
  console.assert(machine.status == "available");

  job.status = "generating";
  job.machine = machine.id;
  machine.status = "busy";
}

// Run an assigned job on a machine asyncronously
async function runJob(job, machine) {
  //   const url = "http://" + machine.ip + "/api";
  const url1 =
    "https://stablediffusionvideoswebserver-production.up.railway.app/api3";
  const params = job.body;

  console.log("job started");

  const video = await axios({
    method: "get",
    url: url1,
    params: params,
    timeout: 100000000,
    responseType: "stream",
  }).catch((error) => {
    console.log(error);
  });

  // replace userId with the actual userId to be sent as param from frontend, similary for prompt
  const userId = "3";
  const prompt = "aVideoDuuuuud";
  const vidTempStore = "./user" + userId + "-" + prompt + ".mp4";
  video.data.pipe(fs.createWriteStream(vidTempStore));

  await new Promise((resolve, reject) => {
    video.data.on("end", () => {
      resolve();
    });
  }).then(() => {
    const fileDest = "user" + userId + "/" + prompt + ".mp4"; // please replace prompt1 with the actual prompt sent from front end as a parameter
    const ws = bucket
      .upload(vidTempStore, {
        destination: fileDest,
      })
      .then(() => {
        fs.unlink(vidTempStore, (err) => {
          if (err) throw err;
          console.log(vidTempStore + " was deleted");
        });
      });
  });

  completeJob(job, machine);

  console.log("job done");
}

function completeJob(job, machine) {
  console.assert(job.status == "generating");
  console.assert(machine.status == "busy");

  job.status = "done";
  machine.status = "available";

  processQueue();
}

// Get the first free machine
// Returns null if no machine is free
function findFreeMachine() {
  for (const machine of gpuMachines) {
    if (machine.status == "available") {
      return machine;
    }
  }
  return null;
}

// GET request to initialise a job
app.get("/job", (req, res) => {
  requests.push({
    id: nextJobID,
    status: "pending",
    machine: null,
    body: req.query,
  });
  console.log(requests);
  nextJobID++;
  res.header("Access-Control-Allow-Origin", "*");
  res.contentType("application/json");
  res.send({ id: nextJobID - 1 });
});

// poll for job status
app.get("/status", async (req, res) => {
  const jobID = Number(req.query.jobID);

  console.log(jobID);

  const job = jobs.get(jobID);
  console.log(job);
  if (job) {
    if (job.status == "generating") {
      // get machine ip
      const machine = gpuMachines.find((m) => m.id == job.machine);
      const url = "http://" + machine.ip + "/getProgress";
      await axios({
        url: url,
        respomseType: "text",
      }).then((response) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.contentType("text/plain");
        res.send({ progress: response.data, status: job.status });
      });
    } else {
      res.header("Access-Control-Allow-Origin", "*");
      res.contentType("text/plain");
      res.send({ status: job.status });
    }
    // TODO: if status is generating, send progress
  } else {
    res.header("Access-Control-Allow-Origin", "*");
    res.status(404).send("Job not found");
  }
});

// Hello World
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// API to genereate initial frames
app.get("/api/generateFrames", (req, res) => {
  axios
    .get(serverURL + "/test")
    .then((response) => {
      res.send(response.data.data);
    })
    .catch((error) => {
      res.send(error);
    });
});

// Api to generate and return a video
app.get("/generate", async (req, res) => {
  const query = req.query;

  axios({
    url: serverURL + "/api",
    responseType: "stream",
    params: query,
    timeout: 100000000,
  })
    .then((response) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.contentType("video/mp4");
      response.data.pipe(res);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

// *Unused* api to check server returns pre-generated video from flask fs
app.get("/getPreGeneratedVideo", async (req, res) => {
  axios({
    url: serverURL + "/test",
    responseType: "stream",
  })
    .then((response) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.contentType("video/mp4");
      response.data.pipe(res);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

// *Unused* api to return a pre-generated video from express fs
app.get("/api3", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.contentType("video/mp4");
  res.sendFile("./turtle.mp4", { root: __dirname });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.get("/logjobs", (req, res) => {
  console.log(jobs);
  res.send("logged");
});

app.get("/logrequests", (req, res) => {
  console.log(requests);
  res.send("logged");
});

//axios({
//    url: url,
//    params: params,
//    responseType: 'stream',
//    timeout: 100000000
//}).then(response => {
//    res.header("Access-Control-Allow-Origin", "*");
//    res.contentType('video/mp4');
//    response.data.pipe(res)
//}).catch((error) => {
//    res.status(500).send(error)
//})
