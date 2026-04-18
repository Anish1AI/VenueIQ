import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

new_init = """async function initializeApp() {
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
}"""

# Replace old initializeApp block
js = re.sub(r'async function initializeApp\(\)\s*\{[\s\S]*?(?=\nfunction loadOrPromptUserContext)', new_init + '\n', js)

new_intent_func = """
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
"""

# Append the new function to the end, and also append initializeApp() call
if 'function renderIntentPrediction' not in js:
    js += new_intent_func + "\n\n// Boot the app\ninitializeApp();\n"

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated app.js with initializeApp and Intent Prediction")
