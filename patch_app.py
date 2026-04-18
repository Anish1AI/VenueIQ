import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

new_render_rec = """function renderRecommendations() {
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
}"""

new_render_bias = """function renderBiasAudit() {
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
        <span class="text-5xl font-black font-headline text-white">${equityScore}</span>
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
}"""

new_append_msg = """function appendMessage(text, sender) {
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
}"""

# Using regex to replace the function bodies
js = re.sub(r'function renderRecommendations\(\)\s*\{[\s\S]*?(?=\nfunction renderBiasAudit)', new_render_rec + '\n', js)
js = re.sub(r'function renderBiasAudit\(\)\s*\{[\s\S]*?(?=\nfunction updatePhaseUI)', new_render_bias + '\n', js)
js = re.sub(r'function appendMessage\(text, sender\)\s*\{[\s\S]*?(?=\nfunction buildGeminiPrompt)', new_append_msg + '\n', js)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated app.js")
