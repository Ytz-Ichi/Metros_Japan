// The informed-player rule the probe bots share (0.14.0, with the fleet
// expansion). The shop card quotes the next train's marginal upkeep live, so
// the floor-of-competence bot reads it too and declines a train that would
// eat more than 12 percent of gross. Without this the first 0.14.0 candidate
// run binged seventeen trains inside era 1950, drowned in the fleet curve
// and never reached 1952, measuring its own spiral instead of the pacing.
// ONE definition, imported by probe-arc and probe-costs: the two probes must
// model the same player or cross-checking them (and checking telemetry
// against them) silently compares incompatible bots.
export function wouldBuyTrain(sim, g) {
  return sim.nextTrainUpkeep(g) <= 0.12 * Math.max(1, sim.grossRate(g));
}

// The plan-following builder, shared for the same reason (probe-arc and
// probe-costs must model one player).
export function nextExtension(sim, g) {
  const { ANCHORS } = sim;
  // The plan's own stakes (spec 01 §3.2): a stop on new ground goes from the
  // nearest legal end; a stop the corridor passes THROUGH, or a ring's
  // closing point, must be built by the corridor's own line, from the end
  // that touches the stop before it. (Built anchors are never re-bought as
  // junction shares otherwise: the 2026-08-07 plan-gate measurement spent
  // an hour grading a bot that double-tracked every corridor stop.)
  for (const s of sim.planStakes(g)) {
    const k = s.anchor;
    if (s.via || s.close) {
      if (s.line === null || !g.lines[s.line] || g.lines[s.line].loop) continue;
      const L = g.lines[s.line];
      const end = s.close ? (L.stations[0].anchor === k ? 'tail' : 'head')
        : s.prev !== null && L.stations[0].anchor === s.prev ? 'head' : 'tail';
      if (sim.placementProblem(g, s.line, end, ANCHORS[k].geo, k)) continue;
      return { li: s.line, end, cost: sim.extensionCost(g, s.line, end, ANCHORS[k].geo, k), k };
    }
    // Which line should take it: the one whose end is nearest.
    let best = null;
    for (let li = 0; li < g.lines.length; li++) {
      if (g.lines[li].loop) continue;
      for (const end of ['head', 'tail']) {
        if (sim.placementProblem(g, li, end, ANCHORS[k].geo, k)) continue;
        const cost = sim.extensionCost(g, li, end, ANCHORS[k].geo, k);
        if (!best || cost < best.cost) best = { li, end, cost, k };
      }
    }
    if (best) return best;
  }
  return null;
}

