let video;
let bodyPose;
let poses = [];
let modelLoaded = false;

// Posture status
let postureGood = true;
let badPostureCount = 0;
let goodPostureCount = 0;
const THRESHOLD = 30; // frames before changing status
const CHECK_INTERVAL = 15; // check every N frames

// Alert settings
let alertShown = false;
let lastAlertTime = 0;
const ALERT_COOLDOWN = 5000; // 5 seconds between alerts

// Reference measurements
let referenceNoseY = null;
let referenceShoulderY = null;

function preload() {
    // BodyPose model laden
    bodyPose = ml5.bodyPose('MoveNet', {flipped: true});
}

function setup() {
    let canvas = createCanvas(640, 480);
    canvas.parent('canvas-container');
    
    // Webcam setup
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();
    
    // Start pose detection
    bodyPose.detectStart(video, gotPoses);
    
    // Update status
    setTimeout(() => {
        modelLoaded = true;
        updateStatus('loading', 'Camera en AI zijn klaar!', 'Begin met rechte rug zitten...');
    }, 2000);
}

function draw() {
    // Mirror camera beeld
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);
    pop();
    
    // Teken pose skeleton
    if (poses.length > 0) {
        let pose = poses[0];
        
        // Teken keypoints
        for (let keypoint of pose.keypoints) {
            if (keypoint.confidence > 0.3) {
                fill(0, 255, 0);
                noStroke();
                circle(keypoint.x, keypoint.y, 8);
            }
        }
        
        // Teken skeleton connections
        drawSkeleton(pose);
        
        // Check posture (not every frame for performance)
        if (frameCount % CHECK_INTERVAL === 0) {
            checkPosture(pose);
        }
    }
    
    // Teken status overlay
    drawStatusOverlay();
}

function gotPoses(results) {
    poses = results;
}

function drawSkeleton(pose) {
    let connections = bodyPose.getSkeleton();
    
    stroke(0, 255, 0);
    strokeWeight(2);
    
    for (let connection of connections) {
        let a = connection[0];
        let b = connection[1];
        
        if (a.confidence > 0.3 && b.confidence > 0.3) {
            line(a.x, a.y, b.x, b.y);
        }
    }
}

function checkPosture(pose) {
    // Get key body parts
    let nose = pose.keypoints.find(kp => kp.name === 'nose');
    let leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
    let rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
    let leftHip = pose.keypoints.find(kp => kp.name === 'left_hip');
    let rightHip = pose.keypoints.find(kp => kp.name === 'right_hip');
    
    // Check if all parts are visible
    if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) {
        return;
    }
    
    if (nose.confidence < 0.3 || leftShoulder.confidence < 0.3 || 
        rightShoulder.confidence < 0.3 || leftHip.confidence < 0.3 || 
        rightHip.confidence < 0.3) {
        return;
    }
    
    // Calculate average positions
    let shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    let hipY = (leftHip.y + rightHip.y) / 2;
    let noseY = nose.y;
    
    // Set reference on first good detection
    if (referenceNoseY === null) {
        referenceNoseY = noseY;
        referenceShoulderY = shoulderY;
    }
    
    // Check 1: Neck angle - is head too far forward/down?
    let neckAngle = shoulderY - noseY;
    
    // Check 2: Torso angle - shoulders should be well above hips
    let torsoLength = hipY - shoulderY;
    
    // Check 3: Relative position - is user slouching compared to reference?
    let shoulderDrop = shoulderY - referenceShoulderY;
    let noseDrop = noseY - referenceNoseY;
    
    // Determine if posture is good
    let isGood = true;
    let reason = '';
    
    // Head too far forward or down
    if (neckAngle < 60) {
        isGood = false;
        reason = 'Je hoofd hangt te ver naar voren!';
    }
    
    // Slouching - shoulders dropped significantly
    if (shoulderDrop > 40) {
        isGood = false;
        reason = 'Je zakt onderuit! Schouders omhoog!';
    }
    
    // Torso compressed (sitting hunched)
    if (torsoLength < 120) {
        isGood = false;
        reason = 'Je zit in elkaar gedoken! Rug recht!';
    }
    
    // Head dropped too much relative to shoulders
    if (noseDrop > 30 && shoulderDrop > 20) {
        isGood = false;
        reason = 'Je zit te onderuit! Rechtop zitten!';
    }
    
    // Update counters
    if (isGood) {
        goodPostureCount++;
        badPostureCount = 0;
        
        if (goodPostureCount > THRESHOLD && !postureGood) {
            postureGood = true;
            hideAlert();
            updateStatus('good', '✅ Goede houding!', 'Je zit lekker rechtop. Ga zo door!');
            
            // Update reference when posture becomes good
            referenceNoseY = noseY;
            referenceShoulderY = shoulderY;
        }
    } else {
        badPostureCount++;
        goodPostureCount = 0;
        
        if (badPostureCount > THRESHOLD && postureGood) {
            postureGood = false;
            showAlert();
            updateStatus('bad', '⚠️ Slechte houding!', reason);
        }
    }
}

function drawStatusOverlay() {
    if (!modelLoaded) return;
    
    // Status badge in hoek
    let badgeSize = 120;
    let margin = 20;
    
    noStroke();
    if (postureGood) {
        fill(74, 222, 128, 200);
    } else {
        fill(248, 113, 113, 200);
    }
    
    rect(width - badgeSize - margin, margin, badgeSize, 60, 10);
    
    fill(255);
    textSize(16);
    textAlign(CENTER, CENTER);
    text(postureGood ? '✓ Goed' : '✗ Slecht', 
         width - badgeSize/2 - margin, margin + 30);
}

function showAlert() {
    let now = millis();
    if (now - lastAlertTime > ALERT_COOLDOWN) {
        document.getElementById('alert-banner').classList.add('show');
        lastAlertTime = now;
        
        // Play sound if available
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
        
        setTimeout(hideAlert, 3000);
    }
}

function hideAlert() {
    document.getElementById('alert-banner').classList.remove('show');
}

function updateStatus(type, statusText, tipText) {
    let indicator = document.getElementById('status-indicator');
    let status = document.getElementById('status-text');
    let tip = document.getElementById('tip');
    
    // Reset classes
    status.className = 'status-text';
    
    if (type === 'good') {
        indicator.textContent = '✅';
        status.classList.add('status-good');
    } else if (type === 'bad') {
        indicator.textContent = '⚠️';
        status.classList.add('status-bad');
    } else if (type === 'loading') {
        indicator.textContent = '✓';
        status.classList.add('status-loading');
    }
    
    status.textContent = statusText;
    tip.textContent = tipText;
}
