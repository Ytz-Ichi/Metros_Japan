// The Nagoya campaign, end to end (spec 01 §5.2, spec 02 §15): every era,
// every charter and every corridor in plan order, the stops 桜通線 and 鶴舞線
// thread through, 名城線 closing into a ring, the ring's service, and the
// saves. Run: node _dev/smoke-nagoya.mjs
import * as sim from '../src/sim.js';
import { fmtMoney, fmtCount } from '../src/format.js';

const { CITY, ANCHORS, CORRIDORS } = sim;
if (CITY.id !== 'nagoya') {
  console.error('smoke-nagoya.mjs measures the Nagoya pack (unset METROS_CITY)');
  process.exit(1);
}
const err = (msg) => { console.error('ASSERT FAILED: ' + msg); process.exit(1); };
const A = (id) => sim.anchorIndex(id);
const lineOf = (g, name0) => g.lines.findIndex((L) => L.name0 === name0);
const run = (g, s) => { for (let t = 0; t < s; t += 0.05) { sim.tick(g, 0.05); g.events.length = 0; } };

// --- The opening position ---
{
  const g = sim.newGame();
  const names = g.lines[0].stations.map((s) => s.name).join(',');
  if (names !== '名古屋,伏見,栄') err('the game should open on 名古屋・伏見・栄, got ' + names);
  if (g.lines[0].name !== '東山線' || g.lines[0].color !== '#fab123') err('the first line is the yellow 東山線');
  if (g.lines[0].stations[0].tier !== 3) err('名古屋 is born a ターミナル');
  if (sim.canDemolish(g, 0, 'head')) err('名古屋 must never be demolishable');
  if (sim.canDemolish(g, 0, 'tail')) err('栄 belongs to no corridor, so it must never be demolishable');
  const st = sim.planStakes(g);
  if (st.length !== 1 || ANCHORS[st[0].anchor].id !== 'shinsakaemachi') err('the first stake is 新栄町');
  if (st[0].line !== 0) err('the first stake continues 東山線');
  if (sim.placementProblem(g, 0, 'tail', CITY.test.waterSample) !== 'water') err('名古屋港 must refuse a station');
  // 名古屋城's grounds: no station, and the label says why.
  if (sim.placementProblem(g, 0, 'tail', [35.1860, 136.9000]) !== 'nobuild') err('名古屋城 must refuse a station');
  if (sim.nobuildAt([35.1860, 136.9000]) !== '名古屋城') err('the refusal should name 名古屋城');
  if (sim.canBuy(g, 'meijo')) err('名城線 must wait for 1965');
  if (sim.freeBuildUnlocked(g)) err('free building waits for the 1957 plan');
}

// --- Money and counts read in yen (spec 01 §3.10) ---
{
  if (fmtMoney(900) !== '90万円') err('900 internal should read 90万円, got ' + fmtMoney(900));
  if (fmtMoney(1100) !== '110万円') err('a station should read 110万円, got ' + fmtMoney(1100));
  if (fmtMoney(6) !== '6,000円') err('6 internal should read 6,000円, got ' + fmtMoney(6));
  if (fmtMoney(123456) !== '1.23億円') err('123456 internal should read 1.23億円, got ' + fmtMoney(123456));
  if (fmtCount(20000) !== '2万') err('20000 riders should read 2万, got ' + fmtCount(20000));
  if (fmtCount(123400) !== '12.3万') err('123400 riders should read 12.3万, got ' + fmtCount(123400));
  if (fmtCount(9999) !== '9,999') err('below 万 the digits are grouped, got ' + fmtCount(9999));
}

// --- The whole campaign, scripted the way the plan reads ---
// Each stake is built from the end of its line that touches the stop before
// it; a corridor's first stop goes from the nearer end.
function buildStake(g, s) {
  const li = s.line;
  if (li === null) err('stake ' + ANCHORS[s.anchor].name + ' has no line to continue it');
  const L = g.lines[li];
  let end;
  if (s.close) {
    end = L.stations[0].anchor === s.anchor ? 'tail' : 'head';
  } else if (s.prev !== null && L.stations[0].anchor === s.prev) end = 'head';
  else if (s.prev !== null && L.stations[L.stations.length - 1].anchor === s.prev) end = 'tail';
  else {
    const geo = ANCHORS[s.anchor].geo;
    const dh = Math.hypot(L.stations[0].geo[0] - geo[0], L.stations[0].geo[1] - geo[1]);
    const dt = Math.hypot(L.stations[L.stations.length - 1].geo[0] - geo[0], L.stations[L.stations.length - 1].geo[1] - geo[1]);
    end = dh < dt ? 'head' : 'tail';
  }
  g.money = 1e12;
  const p = sim.placementProblem(g, li, end, ANCHORS[s.anchor].geo, s.anchor);
  if (p) err('building ' + ANCHORS[s.anchor].name + ' on ' + L.name + ' refused: ' + p);
  if (!sim.extendTo(g, li, end, ANCHORS[s.anchor].geo, s.anchor)) err('extendTo ' + ANCHORS[s.anchor].name + ' failed');
}

const g = sim.newGame();
g.opened = true;
for (let era = 0; era < sim.ERAS.length; era++) {
  if (era > 0) {
    g.totalDelivered = Math.max(g.totalDelivered, sim.nextEra(g).delivered);
    g.pk = 1e4;
    if (sim.planBlockers(g).length) err('era ' + sim.ERAS[era].year + ': plan still blocked ' + JSON.stringify(sim.planBlockers(g)));
    if (!sim.advanceEra(g)) err('advance to ' + sim.ERAS[era].year + ' failed');
  }
  for (const c of CORRIDORS.filter((x) => x.opensIn === era)) {
    if (c.project && !g.owned[c.project]) {
      g.pk = 1e4;
      g.money = 1e12;
      const before = g.lines.length;
      if (!sim.buy(g, c.project)) err('charter ' + c.project + ' refused');
      if (g.lines.length !== before + 1) err('charter ' + c.project + ' should found a line');
      const seed = CITY.projects.find((p) => p.id === c.project).seed.map(A);
      // A seed on a standing station shares it at tier 2 or better.
      for (const i of seed) {
        for (const L of g.lines) for (const s of L.stations) {
          if (s.anchor === i && s.tier < 2 && sim.linesAtAnchor(g, i) > 1) err(ANCHORS[i].name + ' should be raised to tier 2 by the charter');
        }
      }
    }
    for (let guard = 0; guard < 40 && !sim.corridorComplete(g, c); guard++) {
      const s = sim.planStakes(g).find((x) => x.corridor.id === c.id);
      if (!s) err(c.id + ' is incomplete but offers no stake');
      buildStake(g, s);
    }
    if (!sim.corridorComplete(g, c)) err(c.id + ' did not complete');
  }
  sim.updatePlanDone(g);
}

// The checks the spec names (spec 02 §15).
{
  const meijo = lineOf(g, '名城線');
  const sakae = A('sakae');
  if (sim.linesAtAnchor(g, sakae) < 2) err('栄 should carry 東山線 and 名城線');
  const L = g.lines[meijo];
  if (!L.loop) err('名城線 should have closed into a ring');
  if (L.stations.length !== 28) err('名城線 should ring 28 stops, got ' + L.stations.length);
  for (const id of ['motoyama', 'yagoto', 'kanayama', 'aratamabashi', 'ozone']) {
    if (!L.stations.some((s) => s.anchor === A(id))) err('名城線 should call at ' + id);
  }
  // 鶴舞線 calls at 上前津 and 桜通線 at its four interchanges: the plan threads them.
  const ts = g.lines[lineOf(g, '鶴舞線')];
  if (!ts.stations.some((s) => s.anchor === A('kamimaezu'))) err('鶴舞線 must call at 上前津');
  const sk = g.lines[lineOf(g, '桜通線')];
  for (const id of ['marunouchi', 'hisaya-odori', 'imaike', 'gokiso', 'aratamabashi']) {
    if (!sk.stations.some((s) => s.anchor === A(id))) err('桜通線 must call at ' + id);
  }
  const k = g.lines[lineOf(g, '上飯田線')];
  if (!k || k.stations.length !== 2) err('上飯田線 is two stops');
  if (g.lines[lineOf(g, '名港線')].color !== '#b074d6' || !sim.lineStripe(g.lines[lineOf(g, '名港線')])) {
    err('名港線 wears 名城線 purple with a white stripe');
  }
  if (sim.usedAnchorsAll(g).size !== ANCHORS.length) err('every anchor should be built, got ' + sim.usedAnchorsAll(g).size);
  if (g.lines.length !== 6) err('six lines at the end of the plan, got ' + g.lines.length);
  sim.checkAchievements(g);
  for (const id of ['loop-closed', 'kamiiida', 'all-charters', 'tokushige', 'akaike', 'plan-all', 'whole-map']) {
    if (!g.achieved[id]) err('achievement ' + id + ' should be earned');
  }
  run(g, 0.1);
  if (!g.endingSeen) err('every station in the last era should reach 終点');
}

// --- Through-running (spec 01 §3.7): a bought portal makes its terminus a
// door to the railway beyond. Its source is dead until bought (no demand, no
// coverage penalty), and buying it raises the terminus's demand and the
// network's income. ---
{
  const base = sim.hydrate(sim.serialize(g));
  const pt = sim.PORTALS.find((p) => p.id === 'portal-toyota');
  const akaike = () => {
    for (const L of base.lines) for (const s of L.stations) if (s.anchor === pt.anchorIdx) return s.mult;
    return 0;
  };
  const cov0 = sim.coverage(base);
  const m0 = akaike();
  const withP = sim.hydrate(sim.serialize(g));
  withP.pk = 100;
  if (!sim.canBuy(withP, 'portal-toyota')) err('名鉄豊田線 through-running should sell once 赤池 stands');
  if (!sim.buy(withP, 'portal-toyota')) err('buying the portal failed');
  if (!withP.events.some((e) => e.type === 'portal')) err('the portal should announce itself');
  let m1 = 0;
  for (const L of withP.lines) for (const s of L.stations) if (s.anchor === pt.anchorIdx) m1 = s.mult;
  if (!(m1 > m0 + 0.3)) err('赤池 should gain the railway\'s riders, ' + m0 + ' -> ' + m1);
  if (!(sim.coverage(base) === cov0)) err('an unbought portal must not move coverage');
  const earn = (h) => {
    h.owned.drivers = 1; h.money = 1e9; h.nextIncidentAt = Infinity; h.nextSurgeAt = Infinity;
    for (let t = 0; t < 120; t += 0.05) { sim.tick(h, 0.05); h.events.length = 0; }
    const before = h.money;
    for (let t = 0; t < 240; t += 0.05) { sim.tick(h, 0.05); h.events.length = 0; }
    return h.money - before;
  };
  const a0 = earn(base), a1 = earn(withP);
  if (!(a1 > a0)) err('through-running should raise income, ' + Math.round(a0) + ' -> ' + Math.round(a1));
  // Unbought, the source is inert: a fresh game's city multiplier reads 1.
  if (Math.abs(sim.cityMult(sim.newGame()) - 1) > 1e-9) err('portals must not dilute the city multiplier');
}

// --- The ring's service (spec 01 §3.3) ---
{
  const r = sim.hydrate(sim.serialize(g));
  const li = lineOf(r, '名城線');
  const L = r.lines[li];
  if (!L.loop) err('the ring must survive a save');
  if (!Number.isFinite(sim.lineCycleEst(r, li))) err('a ring cycle must be finite');
  // Strip the other lines' trains away from the question: four trains on
  // the ring, drivers and nothing else.
  r.owned.drivers = 1;
  for (const t of r.trains) t.line = li;
  while (r.trains.length < 4) sim.addTrain(r, li);
  r.trains.length = 4;
  r.money = 1e12;
  r.nextIncidentAt = Infinity;
  if (!Number.isFinite(sim.lineHeadwayS(r, li))) err('a ring headway must be finite');
  const d0 = L.delivered;
  const seen = { 1: 0, '-1': 0 };
  let wrapped = false;
  for (let t = 0; t < 900; t += 0.05) {
    sim.tick(r, 0.05);
    r.events.length = 0;
    for (const tr of r.trains) {
      if (!tr.run) continue;
      seen[tr.run.dir] = 1;
      const p = sim.trainPos(r, tr);
      if ((p.from === 0 && p.to === L.stations.length - 1) || (p.to === 0 && p.from === L.stations.length - 1)) wrapped = true;
    }
  }
  if (!(L.delivered > d0)) err('the ring should deliver riders');
  if (!seen[1] || !seen[-1]) err('the ring should run both directions');
  if (!wrapped) err('trains should run the closing segment');
  if (r.trains.some((t) => !t.run && !t.mothballed)) err('with nothing asking, ring trains never park');
  const v = sim.trainView(r, r.trains[0].id);
  if (!v.loopDir || v.towards) err('a ring train reads 右回り/左回り, not a terminus');
  if (sim.canDemolish(r, li, 'head')) err('a ring has no end to demolish');
  // A depot order on a ring lets a train off at its next stop.
  r.lines.forEach((_, l2) => { if (l2 !== li) sim.addTrain(r, l2); });
  const target = r.lines.findIndex((L2, l2) => l2 !== li && L2.stations.length >= 2);
  r.moveQueue.push({ from: li, to: target });
  run(r, 200);
  if (r.moveQueue.length) err('a depot order from a ring must execute');
  // Removing a stop opens the ring there, keeping every array in step.
  r.money = 1e12;
  for (const t of r.trains) if (t.line === li) { t.run = null; t.at = 0; }
  const at = L.stations.findIndex((s) => s.anchor === A('nagoya-daigaku'));
  const n0 = L.stations.length;
  if (!sim.removeStation(r, li, at)) err('a ring stop should be removable');
  const L2 = r.lines[li];
  if (L2.loop) err('removing a stop opens the ring');
  if (L2.stations.length !== n0 - 1) err('one stop fewer after the removal');
  const ends = new Set([L2.stations[0].anchor, L2.stations[L2.stations.length - 1].anchor]);
  if (!ends.has(A('yagoto-nisseki')) || !ends.has(A('motoyama'))) {
    err('the opened ring should end either side of the removed stop');
  }
  for (const arr of [L2.waitingF, L2.waitingB, L2.left60, L2.leaveAcc, L2.lastPassF, L2.lastPassB, L2.skip]) {
    if (arr.length !== L2.stations.length) err('a per-station array fell out of step opening the ring');
  }
  run(r, 120);
  if (sim.corridorComplete(r, CORRIDORS.find((c) => c.id === 'm-loop'))) err('an open ring re-opens its corridor');
}

// --- Another city's save is refused, and the bytes are left alone ---
{
  const foreign = JSON.stringify({ saveVersion: 8, money: 5, lines: [] });
  const h = sim.hydrate(foreign);
  if (!h.hydrateFallback || h.hydrateWrongCity !== 'stockholm') err('a Stockholm save must be refused as another city');
  const own = sim.hydrate(sim.pack(sim.newGame()));
  if (own.hydrateFallback) err('a Nagoya save must load');
}

console.log('NAGOYA SMOKE OK');
