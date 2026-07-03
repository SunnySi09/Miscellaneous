// Core interaction script for Garrett & Wellsy's Private Space

// Initialize Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyA8I-VRgvnD8RZHjxyCaXy2GlwTNDMJ-B0",
  authDomain: "our-space-11814.firebaseapp.com",
  databaseURL: "https://our-space-11814-default-rtdb.firebaseio.com",
  projectId: "our-space-11814",
  storageBucket: "our-space-11814.firebasestorage.app",
  messagingSenderId: "792102403029",
  appId: "1:792102403029:web:9a3c42919c8e0af1fd5b5c"
};

// Initialize Firebase compat
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// EmailJS Config (Configure these with your EmailJS credentials)
const emailjsConfig = {
  publicKey: "W-A_MoICU44Ll0MNo", // Paste your EmailJS Public Key here
  serviceId: "service_fprir7g", // Paste your EmailJS Service ID here
  templateId: "template_x4gxfgf" // Paste your EmailJS Template ID here
};

// Initialize EmailJS
if (typeof emailjs !== 'undefined') {
  emailjs.init({
    publicKey: emailjsConfig.publicKey || "YOUR_EMAILJS_PUBLIC_KEY"
  });
}

function sendEmailNotification(title, message, imageUrl = "", sendToBoth = false) {
  if (!emailjsConfig.publicKey || !emailjsConfig.serviceId || !emailjsConfig.templateId) {
    console.log("EmailJS keys not configured. Skipping email notification.");
    return;
  }
  
  const emailsToSend = sendToBoth 
    ? ['garrettme412@gmail.com', 'wellsyme123@gmail.com'] 
    : [partnerUser === 'Garrett' ? 'garrettme412@gmail.com' : 'wellsyme123@gmail.com'];
  
  emailsToSend.forEach(email => {
    const recipientName = email === 'garrettme412@gmail.com' ? 'Garrett' : 'Wellsy';
    const templateParams = {
      title: title,
      message: message,
      to_name: recipientName,
      to_email: email,
      image_url: imageUrl
    };
    
    emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, templateParams)
      .then((response) => {
        console.log("Email sent successfully to " + recipientName, response.status, response.text);
      }, (error) => {
        console.error("EmailJS failed to send email to " + recipientName, error);
      });
  });
}

// Color map for reference matching style.css
const PETAL_COLORS = {
  lily: 'rgba(204, 122, 152, 0.75)',       // Rose
  sunflower: 'rgba(255, 174, 51, 0.85)',   // Rich Gold
  whiteRose: 'rgba(255, 255, 255, 0.9)'    // White
};

// Application State
let currentUser = null;
let partnerUser = null;
const moodEmojis = {
  'Happy': '😊',
  'Sad': '😔',
  'Angry': '😡',
  'Need You': '❤️',
  'Miss You': '🥺'
};

// Petal Particle System Configuration
const canvas = document.getElementById('petal-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animationFrameId = null;
let petalEffectEndTime = 0;

// Initialize canvas size
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* --- Web Audio API Chime Synth --- */
function playUrgentChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a beautiful, gentle two-tone chime (ambient chord)
    function playTone(freq, delay, duration) {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
      // Soft attack
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + delay + 0.15);
      // Soft decay
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration);
    }
    
    // Play E5 and A5 for a soft, comforting bell sound
    playTone(659.25, 0, 1.8);    // E5
    playTone(880.00, 0.12, 2.0);  // A5
  } catch (e) {
    console.warn("Audio Context blocked or not supported:", e);
  }
}

/* --- Petal Particle Class --- */
class Petal {
  constructor(isAcknowledgeTriggered = false, specificType = null, isFast = false) {
    this.x = Math.random() * canvas.width;
    // If triggered manually, spawn scattered at the top; if initial ambient drift, spawn offscreen
    this.y = isAcknowledgeTriggered ? (Math.random() * -canvas.height * 0.5) : (Math.random() * -50);
    this.size = Math.random() * 12 + 10;
    
    // Speed: if fast, fall quicker!
    if (isFast) {
      this.speedY = Math.random() * 3.0 + 3.0; // fall faster (3.0 to 6.0)
      this.speedX = Math.random() * 2.0 - 1.0;
      this.fadeSpeed = 0.005;
    } else {
      this.speedY = Math.random() * 1.5 + 1.0;
      this.speedX = Math.random() * 0.8 - 0.4;
      this.fadeSpeed = 0.003;
    }
    
    this.oscillationSpeed = Math.random() * 0.02 + 0.01;
    this.oscillationDistance = Math.random() * 40 + 20;
    this.angle = Math.random() * 360;
    this.rotationSpeed = isFast ? (Math.random() * 4 - 2) : (Math.random() * 2 - 1);
    this.angleTracker = Math.random() * Math.PI * 2;
    
    // Petal types: lily (rose/pink), sunflower (yellow/gold), whiteRose (soft white)
    if (specificType) {
      this.type = specificType;
    } else {
      const types = ['lily', 'sunflower', 'whiteRose'];
      this.type = types[Math.floor(Math.random() * types.length)];
    }
    this.color = PETAL_COLORS[this.type];
    
    // Opacity
    this.opacity = Math.random() * 0.3 + 0.7;
  }

  update() {
    this.y += this.speedY;
    this.angleTracker += this.oscillationSpeed;
    this.x += this.speedX + Math.sin(this.angleTracker) * 0.4;
    this.angle += this.rotationSpeed;
    
    // Slow fade-out near the bottom of screen
    if (this.y > canvas.height - 150) {
      this.opacity -= this.fadeSpeed * 3;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.angle * Math.PI) / 180);
    ctx.globalAlpha = Math.max(0, this.opacity);
    
    // Add soft glow effect
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    
    ctx.fillStyle = this.color;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    
    if (this.type === 'lily') {
      // Lily petal: elegant pointed shape
      ctx.moveTo(0, -this.size);
      ctx.quadraticCurveTo(this.size * 0.6, -this.size * 0.2, this.size * 0.2, this.size);
      ctx.quadraticCurveTo(-this.size * 0.6, -this.size * 0.2, 0, -this.size);
    } else if (this.type === 'sunflower') {
      // Sunflower petal: elongated oval
      ctx.moveTo(0, -this.size * 1.2);
      ctx.quadraticCurveTo(this.size * 0.4, 0, 0, this.size * 1.2);
      ctx.quadraticCurveTo(-this.size * 0.4, 0, 0, -this.size * 1.2);
    } else {
      // White rose petal: soft heart-like rounded cup shape
      ctx.moveTo(0, -this.size * 0.6);
      ctx.bezierCurveTo(this.size * 0.8, -this.size, this.size, 0, 0, this.size * 0.8);
      ctx.bezierCurveTo(-this.size, 0, -this.size * 0.8, -this.size, 0, -this.size * 0.6);
    }
    
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// Particle Loop Controller
function updateAndRenderPetals() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const currentTime = Date.now();
  const isAcknowledgeRunning = currentTime < petalEffectEndTime;
  
  // Update and draw existing particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw();
    
    // Remove off-screen or fully transparent particles
    if (p.y > canvas.height + 50 || p.opacity <= 0) {
      particles.splice(i, 1);
    }
  }

  // Generate new particles if Acknowledge mode is active
  if (isAcknowledgeRunning && particles.length < 80) {
    particles.push(new Petal(true));
  } else if (!isAcknowledgeRunning && particles.length < 15) {
    // Soft, minimal ambient floating petals (always present but very subtle)
    particles.push(new Petal(false));
  }
  
  animationFrameId = requestAnimationFrame(updateAndRenderPetals);
}

// Trigger intensive falling petals animation
function triggerAcknowledgeFlowerAnimation() {
  petalEffectEndTime = Date.now() + 7000; // Animation runs for 7 seconds
  // Seed initial burst of petals for immediate visual response
  for (let i = 0; i < 40; i++) {
    particles.push(new Petal(true));
  }
}

/* --- Toast Notification Controller --- */
function showToast(emoji, message) {
  const toast = document.getElementById('notification-banner');
  const toastEmoji = document.getElementById('toast-emoji');
  const toastMsg = document.getElementById('toast-message');
  
  toastEmoji.textContent = emoji;
  toastMsg.textContent = message;
  
  toast.classList.add('active');
  
  setTimeout(() => {
    toast.classList.remove('active');
  }, 4000);
}

/* --- App View Controller --- */
function showView(viewId) {
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update navigation styles
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-target') === viewId) {
      link.classList.add('active');
    }
  });
}

/* --- SVG Bouquet Generation & Visuals --- */

function drawLily(x, y, scale = 1, rotation = 0) {
  return `
    <g transform="translate(${x}, ${y}) rotate(${rotation}) scale(${scale})">
      <path d="M-5 10 C-12 0 0 -22 0 -28 C0 -22 12 0 5 10 Z" class="leaf-green-svg" opacity="0.6"/>
      <path d="M0 0 C-18 -12 -22 -38 0 -42 C22 -38 18 -12 0 0 Z" class="lily-petal-svg" />
      <path d="M0 -6 C-12 -14 -14 -32 0 -38 C12 -32 14 -14 0 -6 Z" class="lily-petal-center-svg" />
      
      <path d="M0 0 C-28 -6 -38 -22 -32 -32 C-26 -42 -12 -32 0 0 Z" class="lily-petal-svg" />
      <path d="M-3 -3 C-22 -8 -30 -20 -25 -26 C-20 -32 -10 -24 -3 -3 Z" class="lily-petal-center-svg" />
      
      <path d="M0 0 C28 -6 38 -22 32 -32 C26 -42 12 -32 0 0 Z" class="lily-petal-svg" />
      <path d="M3 -3 C22 -8 30 -20 25 -26 C20 -32 10 -24 3 -3 Z" class="lily-petal-center-svg" />
      
      <path d="M0 0 C-12 16 -28 26 -35 16 C-42 6 -22 -6 0 0 Z" class="lily-petal-svg" />
      <path d="M-2 2 C-11 11 -22 19 -27 13 C-32 7 -17 -2 0 0 Z" class="lily-petal-center-svg" />
      
      <path d="M0 0 C12 16 28 26 35 16 C42 6 22 -6 0 0 Z" class="lily-petal-svg" />
      <path d="M2 2 C11 11 22 19 27 13 C32 7 17 -2 0 0 Z" class="lily-petal-center-svg" />
      
      <path d="M0 -6 Q-9 -16 -11 -24" class="lily-stamen-svg"/>
      <circle cx="-11" cy="-24" r="2.2" class="lily-anther-svg"/>
      <path d="M0 -6 Q9 -16 10 -24" class="lily-stamen-svg"/>
      <circle cx="10" cy="-24" r="2.2" class="lily-anther-svg"/>
      <path d="M0 -6 L0 -28" class="lily-stamen-svg"/>
      <circle cx="0" cy="-28" r="2.2" class="lily-anther-svg"/>
    </g>
  `;
}

function drawSunflower(x, y, scale = 1, rotation = 0) {
  let petals = '';
  for (let i = 0; i < 14; i++) {
    const angle = (i * 360) / 14;
    petals += `
      <path d="M0 0 C-7 -10 -9 -27 0 -32 C9 -27 7 -10 0 0" 
            transform="rotate(${angle})" 
            class="sunflower-petal-outer-svg" />
      <path d="M0 -2 C-5 -8 -6 -22 0 -26 C6 -22 5 -8 0 -2" 
            transform="rotate(${angle})" 
            class="sunflower-petal-inner-svg" />
    `;
  }
  return `
    <g transform="translate(${x}, ${y}) rotate(${rotation}) scale(${scale})">
      <g>${petals}</g>
      <circle cx="0" cy="0" r="12" class="sunflower-center-svg" />
      <circle cx="0" cy="0" r="8" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.2" stroke-dasharray="2,2" />
      <circle cx="0" cy="0" r="4.5" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="1.5,1.5" />
    </g>
  `;
}

function drawLeaf(x, y, scale = 1, rotation = 0) {
  return `
    <g transform="translate(${x}, ${y}) rotate(${rotation}) scale(${scale})">
      <path d="M0 0 C-11 -16 -16 -38 0 -48 C16 -38 11 -16 0 0 Z" class="leaf-green-svg" />
      <path d="M0 0 L0 -45" class="leaf-stem-svg" />
      <path d="M0 -12 Q-6 -17 -9 -17" class="leaf-stem-svg" />
      <path d="M0 -22 Q6 -27 9 -27" class="leaf-stem-svg" />
      <path d="M0 -32 Q-5 -35 -7 -37" class="leaf-stem-svg" />
    </g>
  `;
}

function generateBouquetSVG(lilies, sunflowers, wrapStyle, hasCard) {
  let output = `<svg viewBox="0 0 200 240" class="bouquet-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">`;
  
  let wrapClass = 'wrap-paper-classic-svg';
  let ribbonClass = 'bow-ribbon-svg';
  if (wrapStyle === 'pink') {
    wrapClass = 'wrap-paper-pink-svg';
  } else if (wrapStyle === 'gold') {
    wrapClass = 'wrap-paper-gold-svg';
    ribbonClass = 'bow-ribbon-gold-svg';
  }
  
  // 1. Wrap Paper Back
  output += `<path d="M35 110 C20 70 180 70 165 110 L120 185 L80 185 Z" class="wrap-paper-svg ${wrapClass}" opacity="0.65"/>`;
  
  // 2. Background Leaves
  output += drawLeaf(42, 92, 0.75, -45);
  output += drawLeaf(158, 92, 0.75, 45);
  output += drawLeaf(62, 72, 0.85, -25);
  output += drawLeaf(138, 72, 0.85, 25);
  output += drawLeaf(100, 52, 0.9, 0);
  
  // 3. Flower Layout
  const items = [];
  for (let i = 0; i < sunflowers; i++) items.push('sunflower');
  for (let i = 0; i < lilies; i++) items.push('lily');
  
  // Order items consistently to prevent random jumping on state updates
  // Sunflowers generally go center-back, lilies front/flanks
  const orderedItems = [];
  const sunflowerItems = items.filter(x => x === 'sunflower');
  const lilyItems = items.filter(x => x === 'lily');
  
  // Interleave them starting with sunflower
  const maxLen = Math.max(sunflowerItems.length, lilyItems.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < sunflowerItems.length) orderedItems.push(sunflowerItems[i]);
    if (i < lilyItems.length) orderedItems.push(lilyItems[i]);
  }
  
  const flowerPositions = [
    { x: 100, y: 80, rot: 0, scale: 0.82 },
    { x: 72, y: 90, rot: -15, scale: 0.8 },
    { x: 128, y: 90, rot: 15, scale: 0.8 },
    { x: 50, y: 110, rot: -30, scale: 0.75 },
    { x: 150, y: 110, rot: 30, scale: 0.75 },
    { x: 100, y: 112, rot: 8, scale: 0.85 },
    { x: 74, y: 122, rot: -10, scale: 0.82 },
    { x: 126, y: 122, rot: 12, scale: 0.82 },
    { x: 100, y: 142, rot: -5, scale: 0.85 },
    { x: 70, y: 146, rot: 5, scale: 0.78 },
    { x: 130, y: 146, rot: -8, scale: 0.78 },
    { x: 96, y: 162, rot: 2, scale: 0.82 },
    { x: 114, y: 162, rot: -2, scale: 0.8 },
    { x: 82, y: 105, rot: 5, scale: 0.75 },
    { x: 118, y: 105, rot: -5, scale: 0.75 },
    { x: 100, y: 62, rot: 12, scale: 0.75 }
  ];
  
  const count = Math.min(orderedItems.length, flowerPositions.length);
  for (let i = 0; i < count; i++) {
    const pos = flowerPositions[i];
    if (orderedItems[i] === 'sunflower') {
      output += drawSunflower(pos.x, pos.y, pos.scale, pos.rot);
    } else {
      output += drawLily(pos.x, pos.y, pos.scale, pos.rot);
    }
  }
  
  // Small envelope tucked card (tucked behind wrap paper and front leaves in the flowers)
  if (hasCard) {
    output += `
      <g transform="translate(100, 104) rotate(-8) scale(0.85)" class="svg-tucked-card" id="svg-card-trigger">
        <rect x="-30" y="-20" width="60" height="40" rx="4" fill="#FFFDF9" stroke="rgba(100,69,143,0.15)" stroke-width="1" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.06))"/>
        <rect x="-27" y="-17" width="54" height="34" rx="2.5" fill="none" stroke="rgba(204,122,152,0.15)" stroke-width="1"/>
        <text x="0" y="5" font-family="'Plus Jakarta Sans'" font-size="12" fill="var(--rose)" text-anchor="middle">❤️</text>
      </g>
    `;
  }
  
  // Front leaves
  output += drawLeaf(68, 142, 0.65, -55);
  output += drawLeaf(132, 142, 0.65, 55);
  
  // 4. Wrap Paper Front
  output += `<path d="M35 110 C45 150 80 185 80 185 L120 185 C120 185 155 150 165 110 C125 125 75 125 35 110 Z" class="wrap-paper-svg ${wrapClass}" />`;
  output += `<path d="M35 110 Q70 145 98 185 L102 185 Q130 140 165 110" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" />`;
  
  // Bottom stems
  output += `
    <path d="M92 185 L86 218" stroke="#3F9A43" stroke-width="3" />
    <path d="M100 185 L100 223" stroke="#3F9A43" stroke-width="2.5" />
    <path d="M108 185 L114 218" stroke="#3F9A43" stroke-width="3" />
  `;
  
  // Bow Ribbon
  output += `
    <path d="M100 185 C83 167 65 180 100 185 Z" class="bow-ribbon-svg ${ribbonClass}" />
    <path d="M100 185 C117 167 135 180 100 185 Z" class="bow-ribbon-svg ${ribbonClass}" />
    <circle cx="100" cy="185" r="5.5" class="bow-ribbon-svg ${ribbonClass}" />
    <path d="M98 188 C90 196 89 207 83 215" fill="none" class="bow-ribbon-svg ${ribbonClass}" stroke-width="2.8" stroke-linecap="round" />
    <path d="M102 188 C110 196 111 207 117 215" fill="none" class="bow-ribbon-svg ${ribbonClass}" stroke-width="2.8" stroke-linecap="round" />
  `;
  
  output += `</svg>`;
  return output;
}

function renderPlaceholder(containerId, title, desc, onClick) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="bouquet-placeholder">
      <svg class="placeholder-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
        <path d="M12 22C12 22 17 18 17 13C17 10.2386 14.7614 8 12 8C9.23858 8 7 10.2386 7 13C7 18 12 22 12 22Z" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 8V2M9 5H15" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 13C5 13 4 11.5 4 10C4 8.5 6 7 8 8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 13C19 13 20 11.5 20 10C20 8.5 18 7 16 8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="placeholder-title">${title}</div>
      <div class="placeholder-desc">${desc}</div>
    </div>
  `;
  
  container.querySelector('.bouquet-placeholder').addEventListener('click', onClick);
}

function removeBouquet(bqId, isSentByMe) {
  db.collection("bouquets").doc(bqId).delete().then(() => {
    showToast('🗑️', 'Bouquet removed.');
  }).catch(err => {
    console.error("Error deleting bouquet:", err);
  });
}

function acknowledgeBouquet(bqId) {
  db.collection("bouquets").doc(bqId).update({
    acknowledged: true
  }).then(() => {
    triggerAcknowledgeFlowerAnimation();
    showToast('❤️', 'Sent love back!');
    
    // Email Notification
    sendEmailNotification(
      `💖 G & W Space: Bouquet received with love!`,
      `${currentUser} has received your beautiful bouquet and sent back lots of love! Got your love babe! ❤️`,
      "",
      true // Send to both
    );
  }).catch(err => {
    console.error("Error acknowledging bouquet:", err);
  });
}

function renderBouquets(sentBouquets, receivedBouquets) {
  const leftContainer = document.getElementById('left-bouquet-container');
  const rightContainer = document.getElementById('right-bouquet-container');
  
  leftContainer.innerHTML = '';
  rightContainer.innerHTML = '';
  
  // 1. Render Left Received Bouquets
  if (receivedBouquets.length === 0) {
    renderPlaceholder(
      'left-bouquet-container', 
      'Awaiting Bouquet', 
      `No bouquet from ${partnerUser} yet`,
      () => {
        showToast('💝', `You can send a bouquet to ${partnerUser} to surprise them!`);
      }
    );
  } else {
    receivedBouquets.forEach((bq, index) => {
      const bqWrapper = document.createElement('div');
      bqWrapper.className = 'bouquet-item-wrapper';
      
      if (receivedBouquets.length === 1) {
        bqWrapper.style.width = '280px';
        bqWrapper.style.height = '340px';
        bqWrapper.style.left = '20px';
        bqWrapper.style.bottom = '0';
      } else {
        if (index === 0) {
          bqWrapper.style.width = '230px';
          bqWrapper.style.height = '280px';
          bqWrapper.style.left = '10px';
          bqWrapper.style.bottom = '15px';
          bqWrapper.style.zIndex = '1';
          bqWrapper.style.transform = 'rotate(-8deg)';
          bqWrapper.style.opacity = '0.9';
        } else {
          bqWrapper.style.width = '230px';
          bqWrapper.style.height = '280px';
          bqWrapper.style.right = '10px';
          bqWrapper.style.bottom = '0';
          bqWrapper.style.zIndex = '2';
          bqWrapper.style.transform = 'rotate(8deg)';
        }
      }
      
      const showAckBtn = bq.acknowledged !== true;
      
      bqWrapper.innerHTML = `
        ${generateBouquetSVG(bq.lilies, bq.sunflowers, bq.wrap, true)}
        <button class="btn-remove-bouquet" data-id="${bq.id}" title="Remove bouquet">×</button>
        ${showAckBtn ? `<button class="btn-ack-bouquet" data-id="${bq.id}">Got your love babe ❤️</button>` : ''}
      `;
      
      const svgCard = bqWrapper.querySelector('#svg-card-trigger');
      if (svgCard) {
        svgCard.addEventListener('click', (e) => {
          e.stopPropagation();
          openCardViewer(bq.message, bq.date, partnerUser);
        });
      }
      
      bqWrapper.querySelector('.btn-remove-bouquet').addEventListener('click', (e) => {
        e.stopPropagation();
        removeBouquet(bq.id, false);
      });
      
      if (showAckBtn) {
        const ackBtn = bqWrapper.querySelector('.btn-ack-bouquet');
        if (ackBtn) {
          ackBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            acknowledgeBouquet(bq.id);
          });
        }
      }
      
      leftContainer.appendChild(bqWrapper);
    });
  }
  
  // 2. Render Right Sent Bouquets
  if (sentBouquets.length === 0) {
    renderPlaceholder(
      'right-bouquet-container', 
      'Send a Bouquet', 
      `Surprise ${partnerUser} with flowers`,
      openBouquetCustomizer
    );
  } else {
    sentBouquets.forEach((bq, index) => {
      const bqWrapper = document.createElement('div');
      bqWrapper.className = 'bouquet-item-wrapper';
      
      if (sentBouquets.length === 1) {
        bqWrapper.style.width = '220px';
        bqWrapper.style.height = '270px';
        bqWrapper.style.left = '10px';
        bqWrapper.style.bottom = '0';
        bqWrapper.style.transform = 'rotate(-5deg)';
      } else {
        if (index === 0) {
          bqWrapper.style.width = '220px';
          bqWrapper.style.height = '270px';
          bqWrapper.style.left = '10px';
          bqWrapper.style.bottom = '0';
          bqWrapper.style.zIndex = '1';
          bqWrapper.style.transform = 'rotate(-8deg)';
          bqWrapper.style.opacity = '0.9';
        } else {
          bqWrapper.style.width = '220px';
          bqWrapper.style.height = '270px';
          bqWrapper.style.right = '10px';
          bqWrapper.style.bottom = '0';
          bqWrapper.style.zIndex = '2';
          bqWrapper.style.transform = 'rotate(8deg)';
        }
      }
      
      bqWrapper.innerHTML = `
        ${generateBouquetSVG(bq.lilies, bq.sunflowers, bq.wrap, true)}
        <button class="btn-remove-bouquet" data-id="${bq.id}" title="Remove bouquet">×</button>
      `;
      
      const svgCard = bqWrapper.querySelector('#svg-card-trigger');
      if (svgCard) {
        svgCard.addEventListener('click', (e) => {
          e.stopPropagation();
          openCardViewer(bq.message, bq.date, currentUser);
        });
      }
      
      bqWrapper.querySelector('.btn-remove-bouquet').addEventListener('click', (e) => {
        e.stopPropagation();
        removeBouquet(bq.id, true);
      });
      
      rightContainer.appendChild(bqWrapper);
    });
    
    if (sentBouquets.length === 1) {
      const addMoreBtn = document.createElement('div');
      addMoreBtn.className = 'bouquet-mini-placeholder';
      addMoreBtn.innerHTML = `
        <span class="mini-plus">+</span>
        <span class="mini-label">Send More</span>
      `;
      addMoreBtn.addEventListener('click', openBouquetCustomizer);
      rightContainer.appendChild(addMoreBtn);
    }
  }
}

/* --- Card & Envelope 3D Viewer --- */
function openCardViewer(message, dateStr, senderName) {
  const modal = document.getElementById('card-viewer-modal');
  const textEl = document.getElementById('card-viewer-text');
  const dateEl = document.getElementById('card-viewer-date');
  const signatureEl = document.getElementById('card-viewer-signature');
  
  textEl.textContent = message;
  dateEl.textContent = dateStr || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  signatureEl.textContent = `- ${senderName}`;
  
  modal.classList.add('active');
  
  // Trigger 3D Envelope unfolding animations
  setTimeout(() => {
    modal.classList.add('card-viewer-modal-active');
  }, 100);
}

function closeCardViewer() {
  const modal = document.getElementById('card-viewer-modal');
  modal.classList.remove('card-viewer-modal-active');
  
  // Let animation play backwards before hiding overlay
  setTimeout(() => {
    modal.classList.remove('active');
  }, 750);
}

/* --- Bouquet Customizer Controls --- */
function openBouquetCustomizer() {
  document.getElementById('send-bouquet-modal').classList.add('active');
  document.getElementById('slider-lilies').value = 3;
  document.getElementById('slider-sunflowers').value = 3;
  document.getElementById('bouquet-message').value = '';
  
  document.querySelectorAll('.wrap-option-btn').forEach(btn => {
    if (btn.getAttribute('data-wrap') === 'classic') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  updateCustomizerPreview();
}

function closeBouquetCustomizer() {
  document.getElementById('send-bouquet-modal').classList.remove('active');
}

function updateCustomizerPreview() {
  const lilies = parseInt(document.getElementById('slider-lilies').value);
  const sunflowers = parseInt(document.getElementById('slider-sunflowers').value);
  const activeWrapBtn = document.querySelector('.wrap-option-btn.active');
  const wrap = activeWrapBtn ? activeWrapBtn.getAttribute('data-wrap') : 'classic';
  
  document.getElementById('label-lilies-count').textContent = lilies;
  document.getElementById('label-sunflowers-count').textContent = sunflowers;
  
  const previewBox = document.getElementById('bouquet-live-preview');
  if (previewBox) {
    previewBox.innerHTML = generateBouquetSVG(lilies, sunflowers, wrap, false);
  }
}

function sendBouquet() {
  const lilies = parseInt(document.getElementById('slider-lilies').value);
  const sunflowers = parseInt(document.getElementById('slider-sunflowers').value);
  const activeWrapBtn = document.querySelector('.wrap-option-btn.active');
  const wrap = activeWrapBtn ? activeWrapBtn.getAttribute('data-wrap') : 'classic';
  const message = document.getElementById('bouquet-message').value.trim();
  
  if (lilies === 0 && sunflowers === 0) {
    showToast('⚠️', 'Your bouquet needs at least one flower!');
    return;
  }
  
  if (!message) {
    showToast('⚠️', 'Please write a love note to go with your bouquet.');
    return;
  }
  
  db.collection("bouquets").where("sender", "==", currentUser).get().then(snapshot => {
    if (snapshot.size >= 2) {
      showToast('⚠️', 'You can send up to 2 bouquets at a time. Please remove one first!');
      return;
    }
    
    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    
    db.collection("bouquets").add({
      sender: currentUser,
      lilies: lilies,
      sunflowers: sunflowers,
      wrap: wrap,
      message: message,
      date: dateStr,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      closeBouquetCustomizer();
      showToast('💐', `Your bouquet has been sent to ${partnerUser}!`);
      triggerAcknowledgeFlowerAnimation();
      
      // Email Notification
      sendEmailNotification(
        `💐 G & W Space: New Bouquet from ${currentUser}!`,
        `${currentUser} sent you a beautiful bouquet of Lilies & Sunflowers! \n\nNote card says: "${message}"`
      );
    }).catch(err => {
      console.error("Error sending bouquet:", err);
      showToast('⚠️', 'Failed to send bouquet.');
    });
  });
}

/* --- State Sync & Updates (Firebase Listeners) --- */

let activeListeners = [];

function setupFirebaseListeners() {
  activeListeners.forEach(unsubscribe => unsubscribe());
  activeListeners = [];
  
  // 1. Partner Mood Listener
  let initialMoodLoad = true;
  const moodUnsubscribe = db.collection("users").doc(partnerUser)
    .onSnapshot(doc => {
      const partnerEmojiEl = document.getElementById('partner-mood-display').querySelector('.mood-emoji');
      const partnerMoodStatusEl = document.getElementById('partner-mood-status');
      const ackButton = document.getElementById('btn-acknowledge-mood');
      
      if (doc.exists) {
        const data = doc.data();
        localStorage.setItem(`g_and_w_mood_${partnerUser}`, data.mood);
        
        const ackKey = `g_and_w_ack_for_${partnerUser}_by_${currentUser}`;
        const lastAckMood = localStorage.getItem(`g_and_w_last_ack_mood_${partnerUser}`);
        if (lastAckMood !== data.mood) {
          localStorage.setItem(ackKey, 'false');
        }
        
        const alreadyAcked = localStorage.getItem(ackKey) === 'true';
        if (!alreadyAcked) {
          partnerEmojiEl.textContent = moodEmojis[data.mood] || '😊';
          partnerMoodStatusEl.textContent = `is feeling: ${data.mood}`;
          ackButton.classList.remove('hidden');
        } else {
          partnerEmojiEl.textContent = '😊';
          partnerMoodStatusEl.textContent = `is feeling: Normal`;
          ackButton.classList.add('hidden');
        }
        
        if (!initialMoodLoad) {
          showToast(moodEmojis[data.mood] || '❤️', `${partnerUser} updated their mood to ${data.mood}.`);
        }
      } else {
        partnerEmojiEl.textContent = '⏳';
        partnerMoodStatusEl.textContent = "hasn't updated their mood today";
        ackButton.classList.add('hidden');
      }
      initialMoodLoad = false;
    });
  activeListeners.push(moodUnsubscribe);
  
  // 2. Love Acknowledgement Listener
  let initialAckLoad = true;
  const ackUnsubscribe = db.collection("acks").doc(partnerUser)
    .onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data();
        if (data.target === currentUser && !initialAckLoad) {
          triggerAcknowledgeFlowerAnimation();
          showToast('🌸', `${partnerUser} is sending you love! Flowery petals are falling.`);
        }
      }
      initialAckLoad = false;
    });
  activeListeners.push(ackUnsubscribe);
  
  // 3. Urgent message Alert Listener
  let initialAlertLoad = true;
  const alertUnsubscribe = db.collection("alerts").doc("urgent")
    .onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data();
        if (data.sender === partnerUser && !initialAlertLoad) {
          const timeDiff = Date.now() - data.timestamp;
          if (timeDiff < 12000) {
            const modal = document.getElementById('urgent-alert-modal');
            const modalText = document.getElementById('urgent-alert-text');
            modalText.textContent = `${data.sender} needs your attention right away.`;
            modal.classList.add('active');
            playUrgentChime();
          }
        }
      }
      initialAlertLoad = false;
    });
  activeListeners.push(alertUnsubscribe);
  
  // 4. Bouquets Listener
  const bouquetUnsubscribe = db.collection("bouquets").orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
      let sent = [];
      let received = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const bq = { id: doc.id, ...data };
        if (data.sender === currentUser) {
          if (sent.length < 2) sent.push(bq);
        } else if (data.sender === partnerUser) {
          if (received.length < 2) received.push(bq);
        }
      });
      renderBouquets(sent, received);
    });
  activeListeners.push(bouquetUnsubscribe);
  
  // 5. Shared Tasks Listener
  const taskUnsubscribe = db.collection("tasks").orderBy("createdAt", "asc")
    .onSnapshot(snapshot => {
      let tasks = [];
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      renderTasksList(tasks);
    });
  activeListeners.push(taskUnsubscribe);
}

function initUserSpace(user) {
  currentUser = user;
  partnerUser = user === 'Garrett' ? 'Wellsy' : 'Garrett';
  
  localStorage.setItem('g_and_w_user', user);
  
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  
  document.getElementById('welcome-greeting').textContent = `Hello, ${currentUser} ❤️`;
  document.getElementById('partner-name-label').textContent = partnerUser;
  
  updateLocalUIState();
  
  const addAssigneeSelect = document.getElementById('todo-assignee');
  if (addAssigneeSelect) {
    addAssigneeSelect.value = partnerUser;
  }
  
  setupFirebaseListeners();
}

function updateLocalUIState() {
  if (!currentUser) return;
  
  const savedMyMood = localStorage.getItem(`g_and_w_mood_${currentUser}`);
  const statusLabel = document.getElementById('current-user-mood-status').querySelector('span');
  
  if (savedMyMood) {
    const emoji = moodEmojis[savedMyMood] || '';
    statusLabel.textContent = `${emoji} ${savedMyMood}`;
    
    document.querySelectorAll('.mood-select-btn').forEach(btn => {
      if (btn.getAttribute('data-mood') === savedMyMood) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  } else {
    statusLabel.textContent = "Not selected yet";
    document.querySelectorAll('.mood-select-btn').forEach(btn => btn.classList.remove('active'));
  }
}

/* --- Shared Tasks / Promises State Management --- */

let editTodoId = null;

function addTodoTask() {
  const input = document.getElementById('todo-input');
  const title = input.value.trim();
  const assigneeSelect = document.getElementById('todo-assignee');
  const assignee = assigneeSelect.value;
  
  if (!title) {
    showToast('⚠️', 'Please write a promise/task title!');
    return;
  }
  
  db.collection("tasks").add({
    title: title,
    assignee: assignee,
    creator: currentUser,
    completed: false,
    image: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    input.value = '';
    showToast('✨', `Promise added for ${assignee}!`);
    
    // Email Notification for task addition
    sendEmailNotification(
      `✨ G & W Space: New Promise for ${assignee}!`,
      `${currentUser} has created a new promise/task for ${assignee}: \n\n"${title}" \n\nPlease open Our Space to check it out.`,
      "",
      true // Send to both
    );
  }).catch(err => {
    console.error("Error adding task:", err);
  });
}

function deleteTodoTask(id) {
  db.collection("tasks").doc(id).delete().then(() => {
    showToast('🗑️', 'Task deleted.');
  }).catch(err => {
    console.error("Error deleting task:", err);
  });
}

function closeEditTodoModal() {
  document.getElementById('edit-task-modal').classList.remove('active');
  editTodoId = null;
}

function saveEditedTodoTask() {
  if (!editTodoId) return;
  
  const input = document.getElementById('edit-todo-input');
  const title = input.value.trim();
  const assigneeSelect = document.getElementById('edit-todo-assignee');
  const assignee = assigneeSelect.value;
  
  if (!title) {
    showToast('⚠️', 'Task title cannot be empty!');
    return;
  }
  
  db.collection("tasks").doc(editTodoId).update({
    title: title,
    assignee: assignee
  }).then(() => {
    closeEditTodoModal();
    showToast('✏️', 'Promise details updated.');
  }).catch(err => {
    console.error("Error updating task:", err);
  });
}

// Complete Task handling
let currentlyCompletingTodoId = null;

function triggerCompleteTaskUpload(todoId) {
  currentlyCompletingTodoId = todoId;
  const fileInput = document.getElementById('todo-image-input');
  fileInput.value = '';
  fileInput.click();
}

function openLightbox(title, imgSrc) {
  const modal = document.getElementById('todo-lightbox-modal');
  document.getElementById('lightbox-todo-title').textContent = `Fulfilled: "${title}"!`;
  document.getElementById('lightbox-image').src = imgSrc;
  modal.classList.add('active');
}

function closeLightbox() {
  document.getElementById('todo-lightbox-modal').classList.remove('active');
}

function renderTasksList(tasks) {
  if (!currentUser) return;
  
  const pendingContainer = document.getElementById('todo-list-pending');
  const completedContainer = document.getElementById('todo-list-completed');
  
  pendingContainer.innerHTML = '';
  completedContainer.innerHTML = '';
  
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  
  if (pendingTasks.length === 0) {
    pendingContainer.innerHTML = '<p class="todo-empty-message">No pending promises. Create one above! ✨</p>';
  } else {
    pendingTasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'todo-item glass-panel-inner';
      
      const isAssigneeMe = task.assignee === currentUser;
      const actionHtml = isAssigneeMe 
        ? `<button class="todo-complete-btn" data-id="${task.id}">Complete 📸</button>`
        : `<span class="todo-waiting-placeholder">Awaiting ${task.assignee}'s proof 📸</span>`;
        
      card.innerHTML = `
        <div class="todo-item-header">
          <span class="todo-item-title">${task.title}</span>
          <div class="todo-btn-group">
            <button class="todo-icon-btn todo-icon-btn-edit" data-id="${task.id}" title="Edit task">✏️</button>
            <button class="todo-icon-btn todo-icon-btn-delete" data-id="${task.id}" title="Delete task">🗑️</button>
          </div>
        </div>
        <div class="todo-item-actions">
          <div class="todo-meta">
            <span class="todo-badge todo-badge-assignee">For: ${task.assignee}</span>
            <span class="todo-badge todo-badge-creator">By: ${task.creator}</span>
          </div>
          ${actionHtml}
        </div>
      `;
      pendingContainer.appendChild(card);
    });
  }
  
  if (completedTasks.length === 0) {
    completedContainer.innerHTML = '<p class="todo-empty-message">No completed promises yet. Complete a task with photo proof! 📸</p>';
  } else {
    completedTasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'todo-item completed glass-panel-inner';
      card.innerHTML = `
        <div class="todo-item-header">
          <span class="todo-item-title">${task.title}</span>
          <button class="todo-icon-btn todo-icon-btn-delete" data-id="${task.id}" title="Delete task">🗑️</button>
        </div>
        <div class="todo-item-actions">
          <div class="todo-meta">
            <span class="todo-badge todo-badge-assignee">For: ${task.assignee}</span>
            <span class="todo-badge todo-badge-creator">By: ${task.creator}</span>
          </div>
          <div class="todo-proof-container">
            <span class="todo-proof-label">Proof:</span>
            <img class="todo-proof-thumbnail" src="${task.image}" data-id="${task.id}" data-title="${task.title}" alt="Completion proof thumbnail">
          </div>
        </div>
      `;
      completedContainer.appendChild(card);
    });
  }
  
  // Bind Event Listeners Dynamically
  document.querySelectorAll('.todo-icon-btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const task = tasks.find(t => t.id === id);
      if (task) {
        editTodoId = id;
        document.getElementById('edit-todo-input').value = task.title;
        document.getElementById('edit-todo-assignee').value = task.assignee;
        document.getElementById('edit-task-modal').classList.add('active');
      }
    });
  });
  
  document.querySelectorAll('.todo-icon-btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteTodoTask(btn.getAttribute('data-id')));
  });
  
  document.querySelectorAll('.todo-complete-btn').forEach(btn => {
    btn.addEventListener('click', () => triggerCompleteTaskUpload(btn.getAttribute('data-id')));
  });
  
  document.querySelectorAll('.todo-proof-thumbnail').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.getAttribute('data-title'), img.src));
  });
}

/* --- Shared Tasks / Promises Event Listeners --- */

// Tab Navigation Link
document.getElementById('nav-btn-todo').addEventListener('click', () => showView('view-todo'));

// Add Task Button
document.getElementById('btn-add-todo').addEventListener('click', addTodoTask);

// Save Edit Task
document.getElementById('btn-save-edit-todo').addEventListener('click', saveEditedTodoTask);

// Cancel Edit Task
document.getElementById('btn-cancel-edit-todo').addEventListener('click', closeEditTodoModal);

// Close Lightbox
document.getElementById('btn-close-todo-lightbox').addEventListener('click', closeLightbox);

// Handle Hidden File Input Proof Upload and Downscale via Storage
document.getElementById('todo-image-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file || !currentlyCompletingTodoId) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      // Downscale image via canvas to max 400px
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const maxDim = 400;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxDim) {
          height = Math.round(height * maxDim / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round(width * maxDim / height);
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Capture the ID in a local variable and reset the global tracker immediately
      const todoId = currentlyCompletingTodoId;
      currentlyCompletingTodoId = null;
      
      // Convert to Base64 data URL directly (using 0.7 quality to keep size small)
      const base64DataURL = canvas.toDataURL('image/jpeg', 0.7);
      
      // Update task directly in Firestore (no Firebase Storage needed!)
      db.collection("tasks").doc(todoId).update({
        completed: true,
        image: base64DataURL,
        completedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        // Retrieve task title and send email notification
        db.collection("tasks").doc(todoId).get().then(doc => {
          const taskTitle = doc.exists ? doc.data().title : "a promise";
          sendEmailNotification(
            `📸 G & W Space: Promise fulfilled by ${currentUser}!`,
            `${currentUser} has completed the task: "${taskTitle}"! \n\nCheck Our Space website to view the proof image.`,
            "", // No external URL needed, it's stored inline
            true // Send to both
          );
        });
        showToast('🎉', `Promise fulfilled!`);
        triggerAcknowledgeFlowerAnimation();
      }).catch(err => {
        console.error("Firestore update error:", err);
        showToast('⚠️', 'Failed to complete task. Please try again!');
      });
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

/* --- Event Listeners Setup --- */

// User Login Submission Form Handler
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  
  if (email === 'garrettme412@gmail.com' && password === 'garrettlovewellsy') {
    initUserSpace('Garrett');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
  } else if (email === 'wellsyme123@gmail.com' && password === 'wellsylovegarrett') {
    initUserSpace('Wellsy');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
  } else {
    showToast('⚠️', 'Incorrect email or password!');
  }
});

// Tab Navigation
document.getElementById('nav-btn-home').addEventListener('click', () => showView('view-home'));
document.getElementById('nav-btn-mood').addEventListener('click', () => showView('view-mood'));

// Logout Button
document.getElementById('nav-btn-logout').addEventListener('click', () => {
  // Unsubscribe listeners
  activeListeners.forEach(unsubscribe => unsubscribe());
  activeListeners = [];
  
  currentUser = null;
  partnerUser = null;
  localStorage.removeItem('g_and_w_user');
  
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');
  
  document.querySelectorAll('.mood-select-btn').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById('left-bouquet-container').innerHTML = '';
  document.getElementById('right-bouquet-container').innerHTML = '';
});

// Mood Selector Buttons
document.querySelectorAll('.mood-select-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!currentUser) return;
    
    const mood = btn.getAttribute('data-mood');
    const emoji = btn.getAttribute('data-emoji');
    
    // Save to Firestore
    db.collection("users").doc(currentUser).set({
      mood: mood,
      emoji: emoji,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      localStorage.setItem(`g_and_w_mood_${currentUser}`, mood);
      updateLocalUIState();
      showToast(emoji, `You shared that you are feeling ${mood}.`);
      
      // Email Notification
      sendEmailNotification(
        `G & W Space: ${currentUser} shared a mood!`,
        `${currentUser} updated their mood on the space. They are now feeling: ${mood} ${emoji}.`
      );
    }).catch(err => {
      console.error("Error setting mood:", err);
    });
  });
});

// Acknowledge Mood Button
document.getElementById('btn-acknowledge-mood').addEventListener('click', () => {
  if (!currentUser || !partnerUser) return;
  
  const savedPartnerMood = localStorage.getItem(`g_and_w_mood_${partnerUser}`);
  if (!savedPartnerMood) return;
  
  const ackKey = `g_and_w_ack_for_${partnerUser}_by_${currentUser}`;
  localStorage.setItem(ackKey, 'true');
  localStorage.setItem(`g_and_w_last_ack_mood_${partnerUser}`, savedPartnerMood);
  
  // Immediately update UI to Normal state
  const partnerEmojiEl = document.getElementById('partner-mood-display').querySelector('.mood-emoji');
  const partnerMoodStatusEl = document.getElementById('partner-mood-status');
  if (partnerEmojiEl) partnerEmojiEl.textContent = '😊';
  if (partnerMoodStatusEl) partnerMoodStatusEl.textContent = `is feeling: Normal`;
  
  document.getElementById('btn-acknowledge-mood').classList.add('hidden');
  
  db.collection("acks").doc(currentUser).set({
    target: partnerUser,
    timestamp: Date.now()
  }).then(() => {
    triggerAcknowledgeFlowerAnimation();
    showToast('❤️', `Sent acknowledgment to ${partnerUser}.`);
    
    // Email Notification
    sendEmailNotification(
      `G & W Space: ${currentUser} sent you love!`,
      `${currentUser} acknowledged your mood and sent you some warm flower petals! ❤️`
    );
  }).catch(err => {
    console.error("Error setting acknowledgment:", err);
  });
});

// Urgent Message Action Trigger
document.getElementById('btn-send-urgent').addEventListener('click', () => {
  if (!currentUser) return;
  
  db.collection("alerts").doc("urgent").set({
    sender: currentUser,
    timestamp: Date.now()
  }).then(() => {
    showToast('🔔', `Urgent alert sent to ${partnerUser}!`);
    
    // Email Notification
    sendEmailNotification(
      `🚨 URGENT ALERT from ${currentUser}!`,
      `${currentUser} sent an urgent notification. They need your attention right away! Please open Our Space.`
    );
  }).catch(err => {
    console.error("Error setting alert:", err);
  });
});

// Dismiss Urgent Alert Modal
document.getElementById('btn-close-urgent').addEventListener('click', () => {
  document.getElementById('urgent-alert-modal').classList.remove('active');
});

/* --- Bouquet & Card Event Listeners --- */

// Open Customizer
document.getElementById('btn-open-bouquet-customizer').addEventListener('click', openBouquetCustomizer);

// Cancel Customizer
document.getElementById('btn-cancel-bouquet').addEventListener('click', closeBouquetCustomizer);

// Send Bouquet
document.getElementById('btn-send-bouquet').addEventListener('click', sendBouquet);

// Slider Inputs Live Preview Update
document.getElementById('slider-lilies').addEventListener('input', updateCustomizerPreview);
document.getElementById('slider-sunflowers').addEventListener('input', updateCustomizerPreview);

// Wrap Option Buttons Selection
document.querySelectorAll('.wrap-option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.wrap-option-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateCustomizerPreview();
  });
});

// Close Card Viewer
document.getElementById('btn-close-card-viewer').addEventListener('click', closeCardViewer);

/* --- Interactive Petal Bursts --- */

// Trigger a burst of fast falling petals of a specific type
function triggerFastPetalBurst(flowerType) {
  for (let i = 0; i < 15; i++) {
    particles.push(new Petal(true, flowerType, true));
  }
}

// Bind click event to flower cards
document.querySelectorAll('.flower-item-card').forEach(card => {
  card.addEventListener('click', () => {
    const flowerType = card.getAttribute('data-flower');
    if (flowerType) {
      triggerFastPetalBurst(flowerType);
      
      // Gentle spring animation on click
      card.style.transform = 'scale(0.95) translateY(-4px)';
      setTimeout(() => {
        card.style.transform = '';
      }, 150);
    }
  });
});

// Mobile Burger Menu Toggle
const menuToggle = document.getElementById('mobile-menu-toggle');
const navLinksMenu = document.getElementById('nav-links-menu');

if (menuToggle && navLinksMenu) {
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navLinksMenu.classList.toggle('open');
  });

  // Auto close menu when clicking any nav link
  navLinksMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      navLinksMenu.classList.remove('open');
    });
  });
}

/* --- App Startup --- */

// Auto Login if previous session is active
const savedSessionUser = localStorage.getItem('g_and_w_user');
if (savedSessionUser === 'Garrett' || savedSessionUser === 'Wellsy') {
  initUserSpace(savedSessionUser);
}

// Start Ambient drift of flower petals
updateAndRenderPetals();
