let video;
let bodyPose;
let poses = [];
let modelLoaded = false;

const APP_VERSION = 'v1.3';

// Posture status
let postureGood = true;
let badPostureCount = 0;
let goodPostureCount = 0;
const FRAME_THRESHOLD = 10; // frames before changing status
const CHECK_INTERVAL = 10; // check every N frames

// Alert settings
let alertShown = false;
let lastAlertTime = 0;
const ALERT_COOLDOWN = 5000; // 5 seconds between alerts

// Reference measurements
let referenceNoseY = null;
let referenceShoulderY = null;

console.log('🪑 Houding Monitor ' + APP_VERSION + ' - Starting...');

function preload() {
    // BodyPose model laden
    bodyPose = ml5.bodyPose('MoveNet', {flipped: true});
}

function setup() {
    let canvas = createCanvas(640, 480);
    canvas.parent('canvas-container');
    
    console.log('🎥 Setting up webcam...');
    
    // Webcam setup
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();
    
    console.log('🤖 Starting pose detection...');
    
    // Start pose detection
    bodyPose.detectStart(video, gotPoses);
    
    // Update status
    setTimeout(() => {
        modelLoaded = true;
        console.log('✅ Model loaded and ready!');
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
            if (keypoint.confidence > 0.1) {
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
    
    // Debug: log first time we get poses
    if (results.length > 0 && frameCount % 120 === 0) {
        console.log('📊 Poses detected:', results.length, 'pose(s)');
    }
}

function drawSkeleton(pose) {
    let connections = bodyPose.getSkeleton();
    
    stroke(0, 255, 0);
    strokeWeight(2);
    
    for (let connection of connections) {
        let a = connection[0];
        let b = connection[1];
        
        if (a.confidence > 0.1 && b.confidence > 0.1) {
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
        if (frameCount % 120 === 0) {
            console.log('⚠️ Missing body parts:', {
                nose: !!nose,
                leftShoulder: !!leftShoulder,
                rightShoulder: !!rightShoulder,
                leftHip: !!leftHip,
                rightHip: !!rightHip
            });
        }
        return;
    }
    
    // Lower confidence threshold to 0.1 (was 0.3)
    const MIN_CONFIDENCE = 0.1;
    
    if (nose.confidence < MIN_CONFIDENCE || leftShoulder.confidence < MIN_CONFIDENCE || 
        rightShoulder.confidence < MIN_CONFIDENCE || leftHip.confidence < MIN_CONFIDENCE || 
        rightHip.confidence < MIN_CONFIDENCE) {
        if (frameCount % 120 === 0) {
            console.log('⚠️ Low confidence:', {
                nose: nose.confidence.toFixed(2),
                leftShoulder: leftShoulder.confidence.toFixed(2),
                rightShoulder: rightShoulder.confidence.toFixed(2),
                leftHip: leftHip.confidence.toFixed(2),
                rightHip: rightHip.confidence.toFixed(2)
            });
        }
        return;
    }
    
    // Calculate average positions
    let shoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    let shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    let hipX = (leftHip.x + rightHip.x) / 2;
    let hipY = (leftHip.y + rightHip.y) / 2;
    let noseX = nose.x;
    let noseY = nose.y;
    
    // Set reference on first good detection (first 60 frames only)
    if (referenceNoseY === null && frameCount < 120) {
        referenceNoseY = noseY;
        referenceShoulderY = shoulderY;
        console.log('📍 Reference posture set at frame', frameCount);
    }
    
    // Determine if posture is good
    let isGood = true;
    let reason = '';
    let checks = [];
    
    // Check 1: Head forward lean - horizontal distance nose to shoulders
    let headForward = abs(noseX - shoulderX);
    checks.push(`headForward: ${headForward.toFixed(1)}px ${headForward > 80 ? '❌' : '✅'}`);
    if (headForward > 80) {
        isGood = false;
        reason = 'Je leunt te ver voorover! Hoofd naar achteren!';
    }
    
    // Check 2: Vertical alignment - head should be above shoulders
    let neckLength = shoulderY - noseY;
    checks.push(`neckLength: ${neckLength.toFixed(1)}px ${neckLength < 80 ? '❌' : '✅'}`);
    if (neckLength < 80) {
        isGood = false;
        reason = 'Je hoofd hangt naar voren! Kin omhoog!';
    }
    
    // Check 3: Spine angle - check angle between hip-shoulder and shoulder-nose
    let spineAngleRad = atan2(shoulderY - hipY, shoulderX - hipX);
    let neckAngleRad = atan2(noseY - shoulderY, noseX - shoulderX);
    
    // Spine should be mostly vertical (close to 90 degrees from horizontal)
    let spineDegrees = abs(degrees(spineAngleRad));
    checks.push(`spineDegrees: ${spineDegrees.toFixed(1)}° ${spineDegrees < 70 ? '❌' : '✅'}`);
    if (spineDegrees < 70) { // Should be close to 90
        isGood = false;
        reason = 'Je zit onderuit! Rug recht!';
    }
    
    // Check 4: Forward head posture - neck angle
    let neckDegrees = degrees(neckAngleRad);
    checks.push(`neckDegrees: ${neckDegrees.toFixed(1)}° ${neckDegrees > -10 ? '❌' : '✅'}`);
    // Neck should not lean forward too much (should be between -10 and -90)
    if (neckDegrees > -10) {
        isGood = false;
        reason = 'Stop met voorover leunen!';
    }
    
    // Check 5: Torso compressed (sitting hunched)
    let torsoLength = hipY - shoulderY;
    checks.push(`torsoLength: ${torsoLength.toFixed(1)}px ${torsoLength < 150 ? '❌' : '✅'}`);
    if (torsoLength < 150) {
        isGood = false;
        reason = 'Je zit in elkaar gedoken! Rug strekken!';
    }
    
    // Check 6: Shoulder drop compared to reference
    if (referenceShoulderY !== null) {
        let shoulderDrop = shoulderY - referenceShoulderY;
        checks.push(`shoulderDrop: ${shoulderDrop.toFixed(1)}px ${shoulderDrop > 50 ? '❌' : '✅'}`);
        if (shoulderDrop > 50) {
            isGood = false;
            reason = 'Je zakt onderuit! Schouders omhoog!';
        }
    }
    
    // Debug info in console - every 2 seconds
    if (frameCount % 120 === 0) {
        console.log('📏 Posture Check:', {
            result: isGood ? '✅ GOOD' : '❌ BAD',
            reason: reason || 'All checks passed',
            checks: checks
        });
    }
    
    // Update counters with smaller threshold for faster response
    if (isGood) {
        goodPostureCount++;
        badPostureCount = 0;
        
        if (goodPostureCount > 10 && !postureGood) {
            postureGood = true;
            hideAlert();
            updateStatus('good', '✅ Goede houding!', 'Je zit lekker rechtop. Ga zo door!');
            console.log('✅ Status: GOOD posture');
            
            // Update reference when posture becomes good
            referenceNoseY = noseY;
            referenceShoulderY = shoulderY;
        }
    } else {
        badPostureCount++;
        goodPostureCount = 0;
        
        if (badPostureCount > 10 && postureGood) {
            postureGood = false;
            showAlert();
            updateStatus('bad', '⚠️ Slechte houding!', reason);
            console.log('❌ Status: BAD posture -', reason);
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
