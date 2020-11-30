const video = document.getElementById('video')

let faceMatcher, labeledFaceDescriptors

Promise.all([
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models'),
  faceapi.nets.ageGenderNet.loadFromUri('/models'),
]).then(startVideo)

async function startVideo() {
  labeledFaceDescriptors = await loadLabeledImages()
  faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6)
  navigator.getUserMedia(
    {video: {}},
    stream => video.srcObject = stream,
    err => console.error(err)
  )
}

video.addEventListener('play', async () => {
  // const canvas = faceapi.createCanvasFromMedia(video)
  const canvas = document.getElementById('canvas');
  // document.body.append(canvas)
  const displaySize = {width: video.width, height: video.height};
  faceapi.matchDimensions(canvas, displaySize);
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender()
      .withFaceDescriptors();
    // const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    //   .withFaceLandmarks()
    //   .withFaceExpressions()
    //   .withAgeAndGender()
    //   .withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))
    console.log('results', results, 'detections', detections);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box;
      const detection = resizedDetections[i];
      const gender = detection.gender === 'male' ? 'Homem' : 'Mulher';
      const age = Math.round(detection.age);
      const name = result.toString();
      let label;
      if (name.includes('unknown')) {
        label = `Desconhecido(a) ${detection.detection.score.toFixed(2)} - ${gender} - ${age}`;
      } else {
        label = `${name}`;
      }
      const drawBox = new faceapi.draw.DrawBox(box, {label,});
      drawBox.draw(canvas)
    })

    if (results.some(result => result.toString().includes('Fulano'))) {
      document.body.style.background = '#cc0000';
    } else {
      document.body.style.background = '#777777';
    }

    // resizedDetections.forEach(detection => {
    //   const box = detection.detection.box;
    //   console.log(detection);
    //   const gender = detection.gender === 'male' ? 'Homem' : 'Mulher';
    //   const age = Math.round(detection.age);
    //   const drawBox = new faceapi.draw.DrawBox(box, {
    //     label: `${name} - ${detection.detection.score.toFixed(2)} - ${gender} - ${age}`,
    //   })
    //   drawBox.draw(canvas)
    // })
  }, 500)

})

function loadLabeledImages() {
  const labels = ['Fabrício Vasconcellos', 'Rafael Ribeiro']
  return Promise.all(
    labels.map(async label => {
      const descriptions = [];
      for (let i = 1; i <= 2; i++) {
        const img = await faceapi.fetchImage(`labeled_images/${label}/${i}.jpg`);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        descriptions.push(detections.descriptor)
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  )
}

const vid = document.querySelector('video');
navigator.mediaDevices.getUserMedia({video: true}) // request cam
    .then(stream => {
      vid.srcObject = stream; // don't use createObjectURL(MediaStream)
      return vid.play(); // returns a Promise
    })
    .then(()=>{ // enable the button
      const btn = document.querySelector('button');
      btn.disabled = false;
      btn.onclick = e => {
        takeASnap()
            .then(download);
      };
    })
    .catch(e=>console.log('please use the fiddle instead'));

function takeASnap(){
  const canvas = document.createElement('canvas'); // create a canvas
  const ctx = canvas.getContext('2d'); // get its context
  canvas.width = vid.videoWidth; // set its size to the one of the video
  canvas.height = vid.videoHeight;
  ctx.drawImage(vid, 0,0); // the video
  return new Promise((res, rej)=>{
    canvas.toBlob(res, 'image/jpeg'); // request a Blob from the canvas
  });
}
async function download(blob){
  // uses the <a download> to download a Blob
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'screenshot.jpg';
  document.body.appendChild(a);
  await a.click();
  await loadLabeledImages();
}
