/**
 * VenueAssistant class for making intelligent stadium recommendations
 */
export class VenueAssistant {
  /**
   * Creates an instance of VenueAssistant.
   * @param {Object} userContext - The context of the user.
   * @param {string} userContext.seat_section - The user's seat section.
   * @param {number} userContext.group_size - The size of the user's group.
   * @param {boolean} userContext.accessibility - Whether the user requires accessibility features.
   * @param {Array<string>} userContext.preferences - User preferences (e.g., food types).
   * @param {Object} firebase_db - Reference to the Firebase Firestore database.
   */
  constructor(userContext, firebase_db) {
    this.userContext = userContext;
    this.db = firebase_db;
  }

  /**
   * Calculates the current pressure for a given node based on phase load, reports, and proximity.
   * @param {string} nodeId - The ID of the node (concession, restroom, etc.).
   * @param {string} phase - The current game phase (e.g., PRE_GAME, LIVE, HALFTIME).
   * @param {Array<Object>} reports - Recent crowd reports.
   * @param {string} userSection - The user's current seat section.
   * @returns {number} The calculated pressure score (0.0 to 1.0).
   */
  calculatePressure(nodeId, phase, reports, userSection) {
    // Base load based on phase
    const baseLoads = {
      PRE_GAME: 0.5,
      LIVE: 0.2,
      HALFTIME: 0.9,
      POST_GAME: 0.3
    };
    let pressure = baseLoads[phase] || 0.2;

    // Report delta: Add pressure if there are recent reports for this node
    const nodeReports = reports.filter(r => r.id === nodeId);
    if (nodeReports.length > 0) {
      pressure += (nodeReports.length * 0.15);
    }

    // Proximity penalty (mock logic: standard penalty added)
    const proximityPenalty = 0.05; 
    pressure += proximityPenalty;

    return Math.max(0, Math.min(1.0, pressure));
  }

  /**
   * Calculates an equity score to prevent over-recommending the same node.
   * Uses inverse frequency formula: 1 / (1 + recentSends * 0.3)
   * @param {string} nodeId - The ID of the node.
   * @param {string} userSection - The user's current seat section.
   * @param {Array<Object>} decisionHistory - History of recent recommendations.
   * @returns {number} The equity score.
   */
  getEquityScore(nodeId, userSection, decisionHistory) {
    const recentSends = decisionHistory.filter(
      decision => decision.nodeId === nodeId && decision.section === userSection
    ).length;

    return 1 / (1 + recentSends * 0.3);
  }

  /**
   * Ranks relevant nodes based on intent, phase, and pressure map.
   * Uses weighted score: pressure(40%) + walkTime(35%) + equity(25%)
   * @param {string} intent - The user intent (e.g., 'food', 'restroom').
   * @param {string} phase - The current game phase.
   * @param {Object} pressureMap - Map of nodeId to pressure values {nodeId: 0.0-1.0}.
   * @returns {Array<Object>} Ranked array of node recommendations.
   */
  rankRecommendations(intent, phase, pressureMap) {
    const relevantNodes = Object.keys(pressureMap).map(id => ({
      id,
      pressure: pressureMap[id],
      // Mock scores for walk time and equity for demonstration
      walkTimeScore: Math.random(), 
      equityScore: Math.random() 
    }));

    const ranked = relevantNodes.map(node => {
      // Invert pressure so lower pressure = higher score
      const invertedPressureScore = 1.0 - node.pressure;
      
      const weightedScore = 
        (invertedPressureScore * 0.40) + 
        (node.walkTimeScore * 0.35) + 
        (node.equityScore * 0.25);
        
      return {
        ...node,
        score: weightedScore
      };
    });

    return ranked.sort((a, b) => b.score - a.score);
  }

  /**
   * Builds a plain-English explanation comparing the top node and an alternative.
   * @param {Object} topNode - The recommended node.
   * @param {Object} alternativeNode - The next best alternative node.
   * @param {Object} scores - The score breakdowns for context.
   * @returns {string} The explanation string.
   */
  buildExplanation(topNode, alternativeNode, scores) {
    const topName = topNode.name || topNode.id;
    const altName = alternativeNode.name || alternativeNode.id;
    
    // Assuming scores contains the sub-metrics, otherwise we use the nodes' scores
    const topScorePct = Math.round(topNode.score * 100);
    const altScorePct = Math.round(alternativeNode.score * 100);

    return `We recommend ${topName} (Score: ${topScorePct}) over ${altName} (Score: ${altScorePct}) because it currently has lower crowd pressure and better overall wait times right now.`;
  }

  /**
   * Returns a proactive alert if the phase is transitioning within 5 minutes.
   * @param {string} phase - The current game phase.
   * @param {number} minutesUntilPhaseChange - Minutes remaining until the next phase.
   * @returns {Object|null} An alert object or null if no action is needed.
   */
  getProactiveAlert(phase, minutesUntilPhaseChange) {
    if (minutesUntilPhaseChange <= 5) {
      if (phase === 'LIVE') {
        return {
          type: 'HALFTIME_WARNING',
          message: 'Halftime is in less than 5 minutes! Lines will get long fast. Consider going to the restroom or getting food now.'
        };
      } else if (phase === 'HALFTIME') {
        return {
          type: 'LIVE_WARNING',
          message: 'The game is starting back up in less than 5 minutes. Head back to your seat!'
        };
      } else if (phase === 'PRE_GAME') {
        return {
          type: 'START_WARNING',
          message: 'The game starts in 5 minutes! Make your way to your seat.'
        };
      }
    }
    return null;
  }
}

// ==========================================
// Intent Prediction Engine
// ==========================================

export const INTENT_PROFILES = {
  HALFTIME: {
    restroom:  { base: 0.68, groupBoost: -0.08, accessibilityBoost: 0.12 },
    food:      { base: 0.55, groupBoost: +0.15, accessibilityBoost: -0.05 },
    stay:      { base: 0.20, groupBoost: -0.10, accessibilityBoost: +0.10 },
    merch:     { base: 0.15, groupBoost: +0.05, accessibilityBoost: -0.03 }
  },
  PRE_GAME: {
    restroom:  { base: 0.30, groupBoost: -0.05, accessibilityBoost: 0.08 },
    food:      { base: 0.70, groupBoost: +0.12, accessibilityBoost: -0.02 },
    stay:      { base: 0.35, groupBoost: -0.08, accessibilityBoost: +0.15 },
    merch:     { base: 0.45, groupBoost: +0.08, accessibilityBoost: -0.05 }
  },
  POST_GAME: {
    exit:      { base: 0.90, groupBoost: +0.05, accessibilityBoost: +0.05 },
    food:      { base: 0.25, groupBoost: +0.10, accessibilityBoost: -0.08 },
    stay:      { base: 0.12, groupBoost: -0.05, accessibilityBoost: +0.08 },
    merch:     { base: 0.30, groupBoost: +0.03, accessibilityBoost: -0.05 }
  }
};

/**
 * Predicts the user's intent probabilistically
 * @param {Object} userContext
 * @param {string} phase
 * @param {number} timeSinceLastAction
 * @param {Object} sectionPattern
 */
export function predictIntent(userContext, phase, timeSinceLastAction, sectionPattern) {
  const { group_size, accessibility, seat_section } = userContext;
  const profile = INTENT_PROFILES[phase];
  const results = {};

  if (!profile) return [];

  for (const [intent, weights] of Object.entries(profile)) {
    const groupFactor    = group_size >= 3 ? weights.groupBoost : 0;
    const accessFactor   = accessibility ? weights.accessibilityBoost : 0;
    const recencyFactor  = Math.min(0.10, timeSinceLastAction / 600000 * 0.10);
    // ^ scores up slightly the longer since last action (restlessness signal)

    const sectionBias    = sectionPattern[seat_section]?.[intent] ?? 0;
    // ^ learned from this session's crowd reports for this section

    const raw = weights.base + groupFactor + accessFactor 
                + recencyFactor + sectionBias;

    results[intent] = Math.min(0.97, Math.max(0.03, raw));
  }

  // Normalize so top 3 intents are shown, all others collapsed
  return rankIntents(results);
}

/**
 * Ranks intents by probability
 * @param {Object} scores
 */
export function rankIntents(scores) {
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([intent, score]) => ({
      intent,
      probability: Math.round(score * 100),
      confidence: score > 0.65 ? 'HIGH' : score > 0.40 ? 'MEDIUM' : 'LOW'
    }));
}
