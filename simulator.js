/**
 * SIMULATED Stadium Simulator
 */

export class StadiumSimulator {
  // SIMULATED stadium data
  static stadiumData = [
    // 8 Concession Stands
    { id: 'c1', name: 'Main Concourse Burgers', type: 'concession', coordinates: { lat: 37.7785, lng: -122.3892 }, section_proximity: ['101', '102', '103'] },
    { id: 'c2', name: 'Pizza Plaza', type: 'concession', coordinates: { lat: 37.7786, lng: -122.3895 }, section_proximity: ['104', '105', '106'] },
    { id: 'c3', name: 'Craft Beer Corner', type: 'concession', coordinates: { lat: 37.7787, lng: -122.3898 }, section_proximity: ['107', '108', '109'] },
    { id: 'c4', name: 'Hot Dog Stand North', type: 'concession', coordinates: { lat: 37.7788, lng: -122.3901 }, section_proximity: ['110', '111', '112'] },
    { id: 'c5', name: 'Taco Cart', type: 'concession', coordinates: { lat: 37.7782, lng: -122.3891 }, section_proximity: ['201', '202', '203'] },
    { id: 'c6', name: 'Pretzel Place', type: 'concession', coordinates: { lat: 37.7783, lng: -122.3894 }, section_proximity: ['204', '205', '206'] },
    { id: 'c7', name: 'Vegan Eats', type: 'concession', coordinates: { lat: 37.7784, lng: -122.3897 }, section_proximity: ['207', '208', '209'] },
    { id: 'c8', name: 'Sweet Treats', type: 'concession', coordinates: { lat: 37.7785, lng: -122.3900 }, section_proximity: ['210', '211', '212'] },
    
    // 6 Restrooms
    { id: 'r1', name: 'Restroom North', type: 'restroom', coordinates: { lat: 37.7789, lng: -122.3896 }, section_proximity: ['101', '102', '201', '202'] },
    { id: 'r2', name: 'Restroom South', type: 'restroom', coordinates: { lat: 37.7781, lng: -122.3896 }, section_proximity: ['108', '109', '208', '209'] },
    { id: 'r3', name: 'Restroom East', type: 'restroom', coordinates: { lat: 37.7785, lng: -122.3888 }, section_proximity: ['104', '105', '204', '205'] },
    { id: 'r4', name: 'Restroom West', type: 'restroom', coordinates: { lat: 37.7785, lng: -122.3904 }, section_proximity: ['111', '112', '211', '212'] },
    { id: 'r5', name: 'Restroom Upper Deck A', type: 'restroom', coordinates: { lat: 37.7788, lng: -122.3892 }, section_proximity: ['301', '302'] },
    { id: 'r6', name: 'Restroom Upper Deck B', type: 'restroom', coordinates: { lat: 37.7782, lng: -122.3892 }, section_proximity: ['305', '306'] },

    // 4 Exit Gates
    { id: 'g1', name: 'Gate A (Main)', type: 'exit', coordinates: { lat: 37.7790, lng: -122.3890 }, section_proximity: ['101', '112'] },
    { id: 'g2', name: 'Gate B', type: 'exit', coordinates: { lat: 37.7780, lng: -122.3890 }, section_proximity: ['106', '107'] },
    { id: 'g3', name: 'Gate C', type: 'exit', coordinates: { lat: 37.7780, lng: -122.3902 }, section_proximity: ['108', '109'] },
    { id: 'g4', name: 'Gate D', type: 'exit', coordinates: { lat: 37.7790, lng: -122.3902 }, section_proximity: ['104', '105'] }
  ];

  /**
   * Returns current game phase based on game start time
   * SIMULATED mock game clock offset logic
   * @param {Date} gameStartTime 
   * @returns {string} PRE_GAME, LIVE, HALFTIME, POST_GAME
   */
  getPhase(gameStartTime) {
    const now = new Date();
    // Use SIMULATED time offsets for demonstration purposes
    const diffInMinutes = (now - gameStartTime) / (1000 * 60);

    // SIMULATED schedule
    if (diffInMinutes < 0) return 'PRE_GAME';
    if (diffInMinutes >= 0 && diffInMinutes <= 60) return 'LIVE'; // 1st half
    if (diffInMinutes > 60 && diffInMinutes <= 75) return 'HALFTIME';
    if (diffInMinutes > 75 && diffInMinutes <= 135) return 'LIVE'; // 2nd half
    return 'POST_GAME';
  }

  /**
   * Returns a pressure map object {nodeId: 0.0-1.0}
   * SIMULATED base load values with +-15% noise
   * @param {string} phase 
   */
  simulatePressure(phase) {
    const pressureMap = {};

    // SIMULATED base loads per type and phase
    const baseLoads = {
      PRE_GAME:  { concession: 0.7, restroom: 0.4, exit: 0.1 },
      LIVE:      { concession: 0.2, restroom: 0.2, exit: 0.05 },
      HALFTIME:  { concession: 0.9, restroom: 0.9, exit: 0.1 },
      POST_GAME: { concession: 0.1, restroom: 0.3, exit: 0.95 }
    };

    const currentBase = baseLoads[phase] || baseLoads['LIVE'];

    StadiumSimulator.stadiumData.forEach(node => {
      let baseLoad = currentBase[node.type] || 0.1;
      
      // Add +- 15% random noise (SIMULATED)
      const noise = (Math.random() * 0.3) - 0.15; 
      let load = baseLoad + noise;

      // Clamp between 0.0 and 1.0
      load = Math.max(0, Math.min(1, load));

      pressureMap[node.id] = parseFloat(load.toFixed(2));
    });

    return pressureMap;
  }

  /**
   * Returns mock array of 5 recent crowd reports
   * SIMULATED timestamps within last 10 minutes
   */
  getCrowdReports() {
    const reports = [
      { id: 'c1', issue: 'Long line at Main Concourse Burgers' },
      { id: 'r3', issue: 'Restroom East is out of paper towels' },
      { id: 'c5', issue: 'Taco Cart line moving fast' },
      { id: 'r1', issue: 'Restroom North needs cleaning' },
      { id: 'g1', issue: 'Gate A scanner broken, causing delay' }
    ];

    const now = new Date().getTime();

    // Generate 5 SIMULATED reports
    return reports.map(report => {
      // Random time within the last 10 minutes (10 * 60 * 1000 ms)
      const randomOffset = Math.floor(Math.random() * 600000);
      return {
        ...report,
        timestamp: new Date(now - randomOffset),
        isSimulated: true
      };
    }).sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
  }
}

// ==========================================
// Section Behavioral Memory
// ==========================================

export const SECTION_ARCHETYPES = {
  // Lower bowl, center — typically season ticket holders
  'sections_100_115': {
    halftime_restroom_early: true,   // they leave 3 min BEFORE buzzer
    food_preference: 'quick',         // know the venue, go efficient
    exit_strategy: 'staged',          // experienced, don't rush
    label: "Season ticket holders in your area"
  },
  // Upper deck — typically casual/group fans
  'sections_200_230': {
    halftime_restroom_early: false,   // leave WITH the crowd
    food_preference: 'exploratory',
    exit_strategy: 'immediate',
    label: "Groups in your section"
  },
  // Family/accessible sections
  'sections_accessible': {
    halftime_restroom_early: true,
    food_preference: 'nearby',
    exit_strategy: 'early',
    label: "Families in your area"
  }
};

export function getSectionArchetype(seatSection) {
  const num = parseInt(seatSection, 10);
  if (!isNaN(num)) {
    if (num >= 100 && num <= 115) return SECTION_ARCHETYPES['sections_100_115'];
    if (num >= 200 && num <= 230) return SECTION_ARCHETYPES['sections_200_230'];
  }
  return SECTION_ARCHETYPES['sections_200_230']; // default
}

export function getSectionPattern(seatSection, crowdReports) {
  // Build a live bias map from this session's crowd reports
  // filtered to reports coming from the same section range
  const relevantReports = crowdReports.filter(r =>
    Math.abs(r.section - parseInt(seatSection, 10)) <= 10
  );

  const intentCounts = {};
  for (const report of relevantReports) {
    if (report.intent) {
      intentCounts[report.intent] = (intentCounts[report.intent] ?? 0) + 1;
    }
  }

  // Convert counts to small bias deltas (-0.05 to +0.05)
  const total = relevantReports.length || 1;
  return Object.fromEntries(
    Object.entries(intentCounts).map(([k, v]) => [k, (v / total) * 0.10 - 0.05])
  );
}
