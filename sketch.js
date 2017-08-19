var mic, fft, pos, vel, gain, A, B, c, trgPos;
var canvasWidth = 1200;
var canvasHeight = 600;
var nInputDims = 1024; // spectrum.length
var circRadius = 25;
var trgRadius = 50;
var trgDistance = 200;
var score = 0;
var ntrials = 0;
var cursorTrace;

function setup() {
   createCanvas(canvasWidth, canvasHeight);
   noFill();

   // monitor microphone input
   mic = new p5.AudioIn();
   mic.start();
   fft = new p5.FFT();
   fft.setInput(mic);

   // initialize cursor position
   pos = createVector(canvasWidth/2.0,canvasHeight/2.0);
   trgPos = setRandomTarget();
   vel = createVector(0,0);
   gain = 0.001;
   cursorTrace = new Array();
   setDecoder(); // initializer decoder
}

function draw() {
   background(200);
   drawTarget();

   // show spectrum of mic input
   var spectrum = fft.analyze();
   noFill();
   stroke(0);
   beginShape();
   for (i = 0; i<spectrum.length; i++) {
    vertex(i, map(spectrum[i], 0, 255, height, 0) );
   }
   endShape();

   // draw cursor trace
   beginShape();
   noFill();
   stroke(0);
   for (i = 0; i<cursorTrace.length; i++) {
      vertex(cursorTrace[i].x, cursorTrace[i].y);
   }
   endShape();

   // update decoder
   vel = updateCursorVel(spectrum, vel, A, B, c);
   pos = updateCursorPos(pos, vel, gain);
   resetIfHitBoundary();

   // update cursor
   var clr = color(121, 141, 224);
   fill(clr);
   noStroke();
   ellipse(pos.x, pos.y, circRadius); // x, y, w, h
   checkIfCursorAcquiredTarget();
   showScore();

}

function setDecoder() {
   c = createVector(0, 0);
   A = [createVector(0.5, 0), createVector(0, 0.5)];
   B = new Array();
   for (i = 0; i<nInputDims; i++) {
       B = concat(B, p5.Vector.random2D());
   }
}

function drawTarget() {
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
      restartTrial();
   }
}

function mouseClicked() {
   setDecoder();
   restartTrial();
   score = 0;
   ntrials = 0;
}

function restartTrial() {
   pos.set(canvasWidth/2.0,canvasHeight/2.0);
   vel.set(0,0);
   trgPos = setRandomTarget();
   ntrials = ntrials + 1;
   cursorTrace = new Array();
}

function checkIfCursorAcquiredTarget() {
   var d = dist(pos.x, pos.y, trgPos.x, trgPos.y);
   if (d < circRadius/2 + trgRadius/2) {
      var clr = color(100, 54, 50);
      fill(clr);
      noStroke();
      ellipse(trgPos.x, trgPos.y, trgRadius);
      score = score + 1;
      setTimeout("test", 5000);
      restartTrial();
   }
}

function showScore() {
  textSize(16);
  fill(0);
  var msg = "Score: " + score.toString() + " out of " + ntrials.toString();
  text(msg, 15, 15);
  fill(0);
  text("Press right arrow key to abort trial.\nClick mouse to change the decoder.", canvasWidth-300, 15);
}

function keyPressed() {
   if (keyCode === RIGHT_ARROW) {
      // setDecoder();
      restartTrial();
      // score = 0;
   }
}
