var mic, fft, pos, vel, A, B, c, trgPos;
var gain = 0.002;
var canvasWidth = 700;
var canvasHeight = 500;
var circRadius = 25;
var trgRadius = 50;
var trgDistance = 200;
var score = 0;
var ntrials = 0;
var cursorTrace;
var spectrumSmoothing = 0.8; // between 0.0 and 1.0
var spectrumBins = 1024; // 2^k for k between 4 and 10
var spectrum;
var userInput;
// var nInputDims = 1024; // spectrum.length
var nInputDims = 50;
var angs;

function setup() {
   var canvas = createCanvas(canvasWidth, canvasHeight);
   canvas.parent('sketch-container');
   noFill();
   textFont('Georgia');

   // monitor microphone input
   mic = new p5.AudioIn();
   mic.start();
   fft = new p5.FFT(spectrumSmoothing, spectrumBins);
   fft.setInput(mic);

   // initialize experiment
   startNewExperiment();
}

function startNewExperiment() {
   setDecoder();
   startNewTrial(false);
   score = 0;
   ntrials = 0;
}

function setDecoder() {
   c = createVector(0, 0);
   A = [createVector(0.5, 0), createVector(0, 0.5)];
   B = new Array();

   var nextMax = random(0, 3);
   var ang = random(2*PI);
   var nq1 = 0, nq2 = 0, nq3 = 0, nq4 = 0;
   var maxnq = (B.length+1)/4;
   var deg = 180*ang/PI;
   angs = new Array();
   // pick a new random angle every 3 or so indices
   // and try to prevent picking angles in the same quadrants
   for (i = 0; i<nInputDims; i++) {
      if (i > nextMax) {
         ang = random(2*PI);
         nextMax = random(i, i+3);
      }
      ang = ang + random(-PI/6, PI/6); // jitter

      if (cos(ang) < 0 && sin(ang) < 0) {
         nq1 = nq1 + 1;
         ang = chooseNewAngleIfTooMany(nq1, maxnq, ang);
      } else if (cos(ang) < 0 && sin(ang) > 0) {
         nq2 = nq2 + 1;
         ang = chooseNewAngleIfTooMany(nq2, maxnq, ang);
      } else if (cos(ang) > 0 && sin(ang) < 0) {
         nq3 = nq3 + 1;
         ang = chooseNewAngleIfTooMany(nq3, maxnq, ang);
      } else if (cos(ang) > 0 && sin(ang) > 0) {
         nq4 = nq4 + 1;
         ang = chooseNewAngleIfTooMany(nq4, maxnq, ang);
      }
      deg = 180*ang/PI;
      if (deg > 315 || deg < 45) {
         deg = 1;
      } else if (deg >= 45 && deg < 135) {
         deg = 2;
      } else if (deg >= 135 && deg < 225) {
         deg = 3;
      } else {
         deg = 4;
      }
      angs = concat(angs, deg);
      B = concat(B, createVector(cos(ang), sin(ang)));
   }
}

function chooseNewAngleIfTooMany(nq, maxN, ang) {
   if (nq < maxN) {
      return ang;
   } else {
      return random(2*PI);
   }
}

function startNewTrial(isSuccess) {
   pos = createVector(canvasWidth/2.0,canvasHeight/2.0);
   vel = createVector(0,0);
   trgPos = setRandomTarget();
   cursorTrace = new Array();
   if (isSuccess) {
      score = score + 1;
   }
   ntrials = ntrials + 1;
}

function draw() {

   // draw target, cursor history, and score
   background(255);
   showTarget();
   showCursorHistory();
   showScore();

   // display processed mic input
   getAndShowInput();

   // update decoder with mic input
   updateAndDrawCursor();
   checkIfCursorAcquiredTarget();   

}

function getAndShowInput() {
   spectrum = fft.analyze(spectrumBins);
   noFill();
   var c = color(255, 187, 0);
   strokeWeight(2);
   stroke(c);

   // beginShape();
   // for (i = 0; i<spectrum.length; i++) {
   //    vertex(i, map(spectrum[i], 0, 255, height, 0) );
   // }
   // endShape();
   // userInput = spectrum;

   beginShape();
   var amps = fft.logAverages(fft.getOctaveBands(3));
   for (i = 0; i<amps.length; i++) {      
      var vx = map(i, 0, amps.length, 0, width);
      vertex(vx, map(amps[i], 0, 255, height, height/2));
   }
   endShape();
   userInput = amps;

   // var d = color(100);
   // stroke(d);
   // strokeWeight(1);
   // beginShape();
   // for (i = 0; i<angs.length; i++) {      
   //    var vx = map(i, 0, angs.length, 0, width);
   //    // vertex(vx, map(angs[i], 0, 360, height, height/2));
   //    vertex(vx, map(angs[i], 1, 4, height, height/2));
   // }
   // endShape();

   // var vals = new Array();
   // var freqBins = new Array("bass", "lowMid", "mid", "highMid", "treble");
   // beginShape();
   // for (i = 0; i<freqBins.length; i++) {
   //    var eng = fft.getEnergy(freqBins[i]);
   //    append(vals, eng);
   //    vertex(i, map(eng, 0, 255, height, 0));
   // }
   // endShape();
   // userInput = vals;
   
}

function showCursorHistory() {
   beginShape();
   noFill();
   stroke(0);
   for (i = 0; i<cursorTrace.length; i++) {
      vertex(cursorTrace[i].x, cursorTrace[i].y);
   }
   endShape();
}

function updateAndDrawCursor() {
   vel = updateCursorVel(userInput, vel, A, B, c);
   pos = updateCursorPos(pos, vel, gain);
   resetIfHitBoundary();

   // draw cursor
   var clr = color(121, 141, 224);
   fill(clr);
   noStroke();
   ellipse(pos.x, pos.y, circRadius); // x, y, w, h
}

function showTarget() {
   var clr = color(50, 54, 200);
   fill(clr);
   noStroke();
   ellipse(trgPos.x, trgPos.y, trgRadius); // x, y, w, h
}

function setRandomTarget() {
   var angle = random([0, 45, 90, 135, 180, 225, 270, 315])*PI/180;
   trgPos = createVector(cos(angle), sin(angle));
   trgPos.mult(trgDistance);
   trgPos.add(canvasWidth/2.0, canvasHeight/2.0);
   return trgPos;
}

function updateCursorVel(spectrum, vel, A, B, c) {
   // vel[t] = A*vel[t-1] + B*spectrum + c

   // compute A*vel[t-1]
   var velx = p5.Vector.dot(A[0], vel);
   var vely = p5.Vector.dot(A[1], vel);
   var velNext = createVector(velx, vely);

   // compute B*spectrum
   for (i = 0; i<spectrum.length; i++) {
      velNext.add(p5.Vector.mult(B[i], spectrum[i]));
   }

   velNext.add(c);
   return velNext;
}

function updateCursorPos(pos, vel, gain) {
   pos = p5.Vector.add(pos, p5.Vector.mult(vel, gain));
   var curPos = createVector(pos.x, pos.y)
   append(cursorTrace, curPos);
   return pos;
}

function resetIfHitBoundary() {
   if (pos.x < 0 || pos.x > canvasWidth || pos.y < 0 || pos.y > canvasHeight) {
      startNewTrial(false);
   }
}

function checkIfCursorAcquiredTarget() {
   var d = dist(pos.x, pos.y, trgPos.x, trgPos.y);
   if (d < circRadius/2 + trgRadius/2) {
      var clr = color(100, 54, 50);
      fill(clr);
      noStroke();
      ellipse(trgPos.x, trgPos.y, trgRadius);
      startNewTrial(true);
   }
}

function showScore() {
  textSize(16);
  fill(0);
  strokeWeight(1);
  var msg = "Score: " + score.toString() + " out of " + ntrials.toString();
  text(msg, 15, 15);
}

function mouseClicked() {
   startNewExperiment();
}

function keyPressed() {
   if (keyCode === RIGHT_ARROW) {
      startNewTrial(false);
   }
}
