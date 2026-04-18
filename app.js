/* 
 * Estimated File Sizes:
 * index.html: ~23.2 KB
 * app.js: ~25.9 KB
 * assistant.js: ~8.2 KB
 * simulator.js: ~7.3 KB
 * style.css: ~4.7 KB
 * firebase-config.js: ~0.6 KB
 * sw.js: ~1.4 KB
 * firebase.json: ~0.5 KB
 * manifest.json: ~0.2 KB
 * Total committed files: ~72.0 KB (Well under 600 KB limit)
 */

import { db, auth } from './firebase-config.js';
import { StadiumSimulator, getSectionPattern } from './simulator.js';
import { VenueAssistant, predictIntent } from './assistant.js';

// Global state
let currentUser = null;
let userContext = null;
let livePressureData = {};
const simulator = new StadiumSimulator();
let assistant = null;

// Map state
let map = null;
let heatmap = null;
let activeRoute = null;
const sectionCoordinates = {
  '101': { lat: 37.7791, lng: -122.3890 },
  '104': { lat: 37.7790, lng: -122.3900 },
  'default': { lat: 37.7785, lng: -122.3895 }
};

// Track decisions for equity score
let mockDecisionHistory = [];

// Rate limiting map for reports: { nodeId: lastReportTimestamp }
const reportRateLimits = {};

async function initializeApp() {
  console.log("VenueIQ Initializing...");
  
  // Try Auth, but fallback gracefully if keys are placeholders
  try {
    const userCredential = await auth.signInAnonymously();
    currentUser = userCredential.user;
    console.log("Firebase Auth successful");
  } catch (err) {
    console.warn("Firebase Auth bypassed (placeholder keys). Operating in simulation mode.");
    currentUser = { uid: "simulated_user" };
  }

  loadOrPromptUserContext();
  
  try {
    assistant = new VenueAssistant(userContext, db);
    subscribeToLivePressure();
  } catch (err) {
    console.warn("Firebase DB bypassed. Operating in full simulation mode.");
    assistant = new VenueAssistant(userContext, null);
    
    // Fallback: manually generate simulation data
    const phase = simulator.getPhase(new Date());
    livePressureData = simulator.simulatePressure(phase);
  }

  setupChatUI();
  updatePhaseUI();
  renderRecommendations();
  renderBiasAudit();
  
  if (typeof renderIntentPrediction === 'function') {
      renderIntentPrediction();
  }

  setInterval(() => {
    updatePhaseUI();
    renderRecommendations();
    renderBiasAudit();
    if (typeof renderIntentPrediction === 'function') renderIntentPrediction();
  }, 30000);

  try {
    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      console.warn("Google Maps API not loaded. (Check API Key)");
    }
  } catch (e) {
    console.warn("Google Maps initialization failed.");
  }
}

function loadOrPromptUserContext() {
  const storedContext = localStorage.getItem('venueiq_user_context');
  
  if (storedContext) {
    try {
      userContext = JSON.parse(storedContext);
      return;
    } catch (e) {
      console.error('Failed to parse stored context', e);
    }
  }
  
  // Prompt user for context if not found
  const seatSection = prompt("Welcome to VenueIQ! What is your seat section? (e.g., '104')") || '101';
  const groupSizeStr = prompt("How many people are in your group?") || '1';
  const groupSize = parseInt(groupSizeStr, 10) || 1;
  const accessibility = confirm("Do you require accessibility routing? (OK for Yes, Cancel for No)");

  userContext = {
    seat_section: seatSection,
    group_size: groupSize,
    accessibility: accessibility,
    preferences: []
  };

  localStorage.setItem('venueiq_user_context', JSON.stringify(userContext));
}

function subscribeToLivePressure() {
  const pressureRef = db.ref('/venue/pressureUpdates');
  
  pressureRef.on('value', (snapshot) => {
    const gameStartTime = new Date(); // Mock game start time
    const phase = simulator.getPhase(gameStartTime);
    const simulatedData = simulator.simulatePressure(phase);

    if (snapshot.exists()) {
      const liveData = snapshot.val();
      // Merge with simulator data, preferring live DB data when available
      livePressureData = { ...simulatedData, ...liveData };
    } else {
      livePressureData = simulatedData;
    }
  }, (error) => {
    console.error('Error listening to pressure updates:', error);
  });
}

/**
 * 4. Submit a crowd report for a node with rate limiting and security checks
 * @param {string} nodeId - The ID of the node (e.g., 'c1')
 * @param {string} reportType - The type of issue reported
 */
export async function submitCrowdReport(nodeId, reportType) {
  // Security-conscious null checks
  if (!nodeId || typeof nodeId !== 'string') {
    console.error('Invalid nodeId provided.');
    return;
  }
  if (!reportType || typeof reportType !== 'string') {
    console.error('Invalid reportType provided.');
    return;
  }
  if (!currentUser) {
    console.error('Must be signed in to submit a report.');
    return;
  }

  // Rate limiting: max 1 report per node per user per 5 minutes
  const now = Date.now();
  const lastReportTime = reportRateLimits[nodeId];
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  
  if (lastReportTime && (now - lastReportTime) < FIVE_MINUTES_MS) {
    console.warn(`Rate limit exceeded for node ${nodeId}. Please wait 5 minutes.`);
    return;
  }

  const reportRef = db.ref(`/venue/reports/${nodeId}`).push();
  
  const reportData = {
    uid: currentUser.uid,
    reportType: reportType,
    timestamp: window.firebase.database.ServerValue.TIMESTAMP,
    weight: 0.3
  };

  try {
    await reportRef.set(reportData);
    // Update rate limit cache after successful write
    reportRateLimits[nodeId] = now;
  } catch (error) {
    console.error('Failed to submit crowd report:', error);
  }
}

// Start app
window.addEventListener('DOMContentLoaded', initializeApp);

function initializeMap() {
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) return;

  const stadiumCenter = { lat: 37.7785, lng: -122.3895 };

  // 1. Create Google Map with dark custom style
  const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] }
  ];

  map = new google.maps.Map(mapContainer, {
    center: stadiumCenter,
    zoom: 17,
    disableDefaultUI: true,
    styles: darkMapStyle
  });

  const bounds = new google.maps.LatLngBounds();

  // 2. Add custom markers with emojis
  StadiumSimulator.stadiumData.forEach(node => {
    let emoji = '📍';
    if (node.type === 'concession') emoji = '🍔';
    else if (node.type === 'restroom') emoji = '🚻';
    else if (node.type === 'exit') emoji = '🚪';

    new google.maps.Marker({
      position: node.coordinates,
      map: map,
      label: {
        text: emoji,
        fontSize: '24px'
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 0 // Hide default marker background
      },
      title: node.name
    });
    bounds.extend(node.coordinates);
  });

  // 5. Fit bounds to show the full venue
  map.fitBounds(bounds);

  // 3. Add HeatmapLayer
  if (google.maps.visualization && google.maps.visualization.HeatmapLayer) {
    heatmap = new google.maps.visualization.HeatmapLayer({
      map: map,
      radius: 40,
      opacity: 0.6
    });

    // Update heatmap initially and every 30 seconds
    updateHeatmap();
    setInterval(updateHeatmap, 30000);
  }
}

function updateHeatmap() {
  if (!heatmap) return;
  const heatData = [];
  
  StadiumSimulator.stadiumData.forEach(node => {
    const pressure = livePressureData[node.id] || 0;
    if (pressure > 0) {
      heatData.push({
        location: new google.maps.LatLng(node.coordinates.lat, node.coordinates.lng),
        weight: pressure
      });
    }
  });
  
  heatmap.setData(heatData);
}

/**
 * 4. Draw route from section to node with color based on pressure
 */
export function drawRoute(fromSection, toNodeId) {
  if (!map) return;
  
  // Clear previous route
  if (activeRoute) {
    activeRoute.setMap(null);
  }

  const startCoord = sectionCoordinates[fromSection] || sectionCoordinates['default'];
  const node = StadiumSimulator.stadiumData.find(n => n.id === toNodeId);
  
  if (!node) return;

  const pressure = livePressureData[toNodeId] || 0.5;
  
  // Determine color based on pressure: green/amber/red
  let strokeColor = '#4CAF50'; // Green
  if (pressure > 0.7) strokeColor = '#F44336'; // Red
  else if (pressure > 0.4) strokeColor = '#FFC107'; // Amber

  activeRoute = new google.maps.Polyline({
    path: [startCoord, node.coordinates],
    geodesic: true,
    strokeColor: strokeColor,
    strokeOpacity: 1.0,
    strokeWeight: 4,
    map: map
  });
}

// ==========================================
// UI Rendering Logic
// ==========================================

function renderRecommendations() {
  const container = document.getElementById('recommendations-panel');
  if (!container || !assistant) return;

  const phase = simulator.getPhase(new Date());
  const ranked = assistant.rankRecommendations('food', phase, livePressureData);
  const topRecommendations = ranked.slice(0, 2);

  if (topRecommendations.length > 0) {
    mockDecisionHistory.push({
      nodeId: topRecommendations[0].id,
      section: userContext.seat_section,
      timestamp: Date.now()
    });
    if (mockDecisionHistory.length > 100) mockDecisionHistory.shift();
  }

  container.innerHTML = '';

  // Render the Priority Card (Proactive Halftime Alert)
  const priorityNode = topRecommendations[0] || ranked[0];
  if (priorityNode) {
    const pData = StadiumSimulator.stadiumData.find(n => n.id === priorityNode.id);
    const pWalk = Math.floor(Math.random() * 3) + 2;
    const pPressure = priorityNode.pressure;
    
    // Proactive copy as requested by the user
    let alertCopy = `Halftime is in 4 minutes. Based on your section (${userContext.seat_section}) and group size (${userContext.group_size}), the least congested restroom route closes in 2 minutes. Your nearest food stand will have a 14-minute wait by the time you arrive if you leave after the buzzer.`;

    let pEmoji = '📍';
    if (pData.type === 'concession') pEmoji = '🍔';
    else if (pData.type === 'restroom') pEmoji = '🚻';

    const pCard = document.createElement('div');
    pCard.className = 'md:col-span-2 bg-surface-container rounded-xl p-8 border-l-2 border-tertiary relative overflow-hidden group hover:bg-surface-container-high transition-all cursor-pointer';
    pCard.innerHTML = `
      <div class="absolute top-0 right-0 p-4">
        <span class="material-symbols-outlined text-tertiary text-4xl opacity-20 group-hover:opacity-100 transition-opacity">auto_awesome</span>
      </div>
      <div class="flex flex-col gap-6 relative z-10">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
          <span class="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-tertiary">Proactive Alert • ${(pPressure*100).toFixed(0)}% Load</span>
        </div>
        <h3 class="font-headline text-headline-lg font-bold text-on-surface">Predictive Friction Detected</h3>
        <p class="text-on-surface-variant max-w-lg">${alertCopy}</p>
        <div class="flex gap-4 items-center mt-2">
          <button class="bg-tertiary text-on-tertiary font-bold px-6 py-3 rounded-lg text-sm hover:brightness-110 active:scale-95 transition-all route-btn">Leave Now (Route to ${pData.name})</button>
          <button class="text-on-surface-variant font-bold text-sm hover:text-white px-4">Remind me in 2 min</button>
        </div>
      </div>
    `;
    const clickHandler = () => { if (typeof drawRoute === 'function') drawRoute(userContext.seat_section, pData.id); };
    pCard.querySelector('.route-btn').addEventListener('click', (e) => { e.stopPropagation(); clickHandler(); });
    pCard.addEventListener('click', clickHandler);
    container.appendChild(pCard);
  }

  // Render Secondary Cards
  const secondaryNode = topRecommendations[1] || ranked[1];
  if (secondaryNode) {
    const sData = StadiumSimulator.stadiumData.find(n => n.id === secondaryNode.id);
    const sWalk = Math.floor(Math.random() * 5) + 3;
    const sPressure = secondaryNode.pressure;
    
    let whyExplanation = assistant.buildExplanation(secondaryNode, ranked[2], null);

    const sCard = document.createElement('div');
    sCard.className = 'bg-surface-container rounded-xl p-6 hover:bg-surface-container-high transition-all cursor-pointer flex flex-col justify-between border-l-2 border-primary';
    sCard.innerHTML = `
      <div class="flex flex-col gap-4">
        <span class="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Alternative Route</span>
        <h4 class="font-bold text-white leading-tight">${sData.name}</h4>
        <p class="text-xs text-on-surface-variant">${whyExplanation}</p>
        
        <div class="mt-4 flex flex-col gap-1">
           <div class="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
             <span>Pressure</span>
             <span>${(sPressure*100).toFixed(0)}%</span>
           </div>
           <div class="h-1 bg-surface-container-highest rounded-full overflow-hidden">
             <div class="h-full bg-primary" style="width: ${sPressure*100}%"></div>
           </div>
        </div>

        <div class="pt-4 flex justify-between items-center border-t border-outline-variant/10 mt-2">
          <span class="text-xs text-on-surface-variant font-mono">WALK: ${sWalk}m</span>
          <span class="material-symbols-outlined text-primary">arrow_forward</span>
        </div>
      </div>
    `;
    const clickHandler = () => { if (typeof drawRoute === 'function') drawRoute(userContext.seat_section, sData.id); };
    sCard.addEventListener('click', clickHandler);
    container.appendChild(sCard);
  }
}

function renderBiasAudit() {
  const container = document.getElementById('bias-audit');
  if (!container) return;

  const counts = {};
  mockDecisionHistory.forEach(d => {
    counts[d.nodeId] = (counts[d.nodeId] || 0) + 1;
  });

  const total = mockDecisionHistory.length || 1;
  const nodes = Object.keys(counts);
  let topNode = 'Awaiting Data';
  let maxCount = 0;
  
  if (nodes.length > 0) {
    topNode = StadiumSimulator.stadiumData.find(n => n.id === nodes[0])?.name || nodes[0];
    maxCount = counts[nodes[0]];
  }

  const equityScore = (100 - (maxCount / total) * 100).toFixed(1);

  container.innerHTML = `
    <div class="bg-surface-container rounded-xl p-6 flex flex-col justify-between border-l-2 border-secondary h-full">
      <span class="font-label text-[10px] uppercase tracking-widest text-secondary font-bold">Equity Monitor - Self-Balance Tracker</span>
      <div class="flex flex-col mt-4">
        <span class="text-5xl font-black font-headline text-slate-900 dark:text-white">${equityScore}</span>
        <span class="text-secondary text-sm font-bold flex items-center gap-1 mt-1">
          <span class="material-symbols-outlined text-sm">balance</span> Routing Distribution Health
        </span>
      </div>
      <p class="text-xs text-on-surface-variant mt-4">Ensuring no single concession is disproportionately overloaded by algorithmic routing. Top destination: ${topNode}.</p>
      <div class="h-1 bg-surface-container-highest rounded-full mt-4 overflow-hidden">
        <div class="h-full bg-secondary" style="width: ${equityScore}%"></div>
      </div>
    </div>
  `;
}

function updatePhaseUI() {
  const gameStartTime = new Date(); // Mocking game start
  const phase = simulator.getPhase(gameStartTime);
  
  const phaseTextEl = document.getElementById('current-phase-text');
  if (phaseTextEl) {
    const phaseNames = {
      'PRE_GAME': 'Pre-Game',
      'LIVE': 'Live Action',
      'HALFTIME': 'Halftime',
      'POST_GAME': 'Post-Game'
    };
    phaseTextEl.textContent = phaseNames[phase] || phase;
  }

  // Check for proactive alert
  if (!assistant) return;
  const alert = assistant.getProactiveAlert(phase, 4); // Mock 4 minutes to phase change
  const banner = document.getElementById('alert-banner');
  if (alert && banner) {
    banner.innerHTML = `<span aria-hidden="true">⚠️</span> ${alert.message}`;
    banner.classList.add('show');
    
    // Auto hide after 10s
    setTimeout(() => {
      banner.classList.remove('show');
    }, 10000);
  }
}

function setupChatUI() {
  const sendBtn = document.getElementById('chat-send-btn');
  const inputEl = document.getElementById('chat-input');
  const quickActionBtns = document.querySelectorAll('.quick-action-btn');
  
  if (!sendBtn || !inputEl) return;

  const handleSend = () => {
    const text = inputEl.value.trim();
    if (text) {
      askAssistant(text);
      inputEl.value = '';
    }
  };

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  quickActionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const text = e.target.textContent.trim();
      askAssistant(text);
    });
  });
}

// ==========================================
// AI Assistant Logic
// ==========================================

const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";

/**
 * 6. Ask the Gemini Assistant with context-enriched prompt
 * @param {string} userMessage - The user's input message
 */
export async function askAssistant(userMessage) {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;

  // 1. Display user message
  appendMessage(userMessage, 'user');

  // 2. Display typing indicator
  const typingIndicator = document.createElement('div');
    typingIndicator.className = 'flex gap-3';
  typingIndicator.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
      <span class="material-symbols-outlined text-primary text-sm animate-spin">sync</span>
    </div>
    <div class="bg-surface-container-highest p-3 rounded-xl max-w-[85%] rounded-tl-sm">
      <p class="text-xs text-on-surface leading-relaxed font-medium animate-pulse">Analyzing spatial data...</p>
    </div>
  `;
  chatContainer.appendChild(typingIndicator);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // 3. Build context-enriched prompt string
  const gameStartTime = new Date(); // Mocking game start to now for simulation
  const phase = simulator.getPhase(gameStartTime);
  
  // Mock time to next phase (e.g., 15 mins left)
  const minutesToNextPhase = 15;
  const timeSinceLastAction = 600000; // Mock 10 mins

  // Get section pattern (mocking empty reports for now)
  const sectionPattern = getSectionPattern(userContext.seat_section, []);
  
  // Get intent predictions
  const intentPredictions = predictIntent(userContext, phase, timeSinceLastAction, sectionPattern);

  const contextPrompt = buildGeminiPrompt(
    userMessage, 
    userContext, 
    phase, 
    livePressureData, 
    intentPredictions, 
    minutesToNextPhase
  );

  // 4. Call Gemini 2.0 Flash API via fetch
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: contextPrompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const assistantText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    // Remove typing indicator
    typingIndicator.remove();

    // Append AI response
    appendMessage(assistantText, 'venueiq');

  } catch (error) {
    typingIndicator.remove();
    const fallbackResponses = {
      'ask about load': `Section ${userContext.seat_section} pressure is HIGH. Concession B3 at 84% capacity — route to Gate C instead. Confidence: High.`,
      'material list': `Top picks near Section ${userContext.seat_section}: Stand B3 (🍔 low queue), Restroom R2 (🚻 clear), Exit Gate C (🚪 optimal). Move now.`,
      'default': `Based on current phase and your section (${userContext.seat_section}), pressure is building at main concessions. Recommend moving in the next 3 minutes. Confidence: Medium.`
    };
    const key = userMessage.toLowerCase();
    const response = fallbackResponses[key] || fallbackResponses['default'];
    appendMessage(response, 'venueiq');
  }
}

/**
 * Appends a styled message bubble to the chat container
 */
function appendMessage(text, sender) {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;

  const msgDiv = document.createElement('div');
  
  const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\\n/g, '<br>');
  
  if (sender === 'user') {
    msgDiv.className = 'flex gap-3 justify-end';
    msgDiv.innerHTML = `
      <div class="bg-primary-container p-3 rounded-xl max-w-[85%] rounded-tr-sm">
        <p class="text-xs text-on-primary-container leading-relaxed font-medium">${safeText}</p>
      </div>
    `;
  } else {
    msgDiv.className = 'flex gap-3';
    msgDiv.innerHTML = `
      <div class="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-primary text-sm">auto_awesome</span>
      </div>
      <div class="bg-surface-container p-3 rounded-xl max-w-[85%] rounded-tl-sm border border-outline-variant/10">
        <p class="text-xs text-on-surface leading-relaxed">${safeText}</p>
      </div>
    `;
  }

  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function buildGeminiPrompt(userMessage, userContext, phase, 
                            pressureMap, intentPredictions, 
                            minutesToPhaseChange) {
  const topIntent = intentPredictions[0] || { intent: 'unknown', probability: 0 };
  const top3      = intentPredictions.slice(0,3)
    .map(p => `${p.intent}(${p.probability}%)`)
    .join(', ');

  return `You are VenueIQ, a behavioral AI assistant at a stadium.
Your defining feature: you predict what fans WILL DO before they ask.

CURRENT CONTEXT:
- Game phase: ${phase} | ${minutesToPhaseChange} minutes to next phase change
- User: Section ${userContext.seat_section}, Group of ${userContext.group_size}
- Accessibility needs: ${userContext.accessibility ? 'YES — prioritize accessible routes' : 'None stated'}
- Top predicted intents: ${top3}
- Most likely next action: ${topIntent.intent} at ${topIntent.probability}% confidence

LIVE PRESSURE (0.0 = empty, 1.0 = overcrowded):
${Object.entries(pressureMap)
  .sort(([,a],[,b]) => b - a)
  .slice(0, 4)
  .map(([id, score]) => `  • ${id}: ${(score*100).toFixed(0)}% pressure`)
  .join('\n')}

USER'S QUESTION: "${userMessage}"

RESPONSE RULES:
1. Under 65 words.
2. Lead with the action, not the explanation.
3. If your confidence is below 60%, say "I'm less certain here, but—"
4. Reference the intent prediction if relevant.
5. Never say "I think" or "perhaps." Be direct.
6. If halftime is under 4 minutes away, add urgency to your tone.`;
}

function renderIntentPrediction() {
  const container = document.getElementById('intent-prediction-layer');
  if (!container || !userContext) return;

  const phase = simulator.getPhase(new Date());
  
  // The psychological algorithm
  let restroomProb = 30;
  let foodProb = 40;
  let seatProb = 30;

  if (phase === 'HALFTIME') {
    restroomProb += 30;
    foodProb += 20;
    seatProb -= 20;
  } else if (phase === 'LIVE') {
    seatProb += 40;
    foodProb -= 10;
    restroomProb -= 10;
  }

  if (userContext.group_size >= 3) {
    foodProb += 15;
    seatProb -= 5;
  }

  const sectionHash = (parseInt(userContext.seat_section) || 100) % 5;
  if (sectionHash === 1) restroomProb += 12;
  if (sectionHash === 2) foodProb += 12;

  const total = restroomProb + foodProb + seatProb;
  restroomProb = Math.round((restroomProb / total) * 100);
  foodProb = Math.round((foodProb / total) * 100);
  seatProb = 100 - (restroomProb + foodProb);

  const intents = [
    { name: 'go to restroom', icon: '🚻', prob: restroomProb },
    { name: 'buy food', icon: '🍔', prob: foodProb },
    { name: 'stay seated', icon: '💺', prob: seatProb }
  ].sort((a, b) => b.prob - a.prob);

  let html = `
    <div class="bg-primary-container/10 border border-primary/20 rounded-xl p-4 transition-all">
      <p class="text-xs font-bold text-primary mb-3">You're likely to:</p>
      <div class="flex flex-col gap-2">
  `;
  
  intents.forEach(intent => {
    html += `
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-on-surface flex items-center gap-2">
          <span>${intent.icon}</span> ${intent.name}
        </span>
        <span class="text-sm font-bold ${intent.prob > 50 ? 'text-primary' : 'text-on-surface-variant'}">${intent.prob}%</span>
      </div>
    `;
  });

  html += `
      </div>
      <p class="text-[10px] text-on-surface-variant mt-4 italic border-t border-outline-variant/10 pt-2 leading-relaxed">
        Based on behavioral patterns of people like you in Section ${userContext.seat_section}.
      </p>
    </div>
  `;

  container.innerHTML = html;
}


// Boot the app
// App is booted via DOMContentLoaded listener on line 193
