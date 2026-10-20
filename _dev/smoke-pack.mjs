// The city pack's invariants (spec 01 §5.1): the facts about the DATA that
// every rule in the engine silently relies on. Run for the shipped pack:
//   node _dev/smoke-pack.mjs
// and for the baseline: METROS_CITY=stockholm node _dev/smoke-pack.mjs
// (Stockholm predates via corridors, so its opening stops are allowed to
// belong to its first corridor as well.)
import * as sim from '../src/sim.js';
import { inRing, kmBetween } from '../src/geo.js';

const { CITY, ANCHORS, CORRIDORS, ERAS } = sim;
let failed = 0;
const err = (msg) => { console.error('PACK ' + CITY.id + ': ' + msg); failed++; };

const idx = (id) => ANCHORS.findIndex((a) => a.id === id);
const START = CITY.start.built.map((r) => (typeof r === 'number' ? r : idx(r)));
const centre = ANCHORS[CITY.map.buildCenter].geo;

// 11. ids unique, codes unique per line letter.
{
  const ids = new Set();
  for (const a of ANCHORS) {
    if (!a.id || ids.has(a.id)) err('anchor id missing or duplicated: ' + a.id);
    ids.add(a.id);
  }
  const codes = new Map();
  for (const a of ANCHORS) for (const c of a.codes || []) {
    if (codes.has(c)) err('station code ' + c + ' on both ' + codes.get(c) + ' and ' + a.name);
    codes.set(c, a.name);
  }
}

// 1-2. No anchor in water or on ground the city will not build on, and all
// inside the base build radius.
for (const a of ANCHORS) {
  for (const w of CITY.water) if (inRing(a.geo, w.ring)) err(a.name + ' sits in the water ring ' + w.label);
  for (const n of CITY.nobuild || []) if (inRing(a.geo, n.ring)) err(a.name + ' sits in the no-build ring ' + n.label);
  if (kmBetween(a.geo, centre) > CITY.map.buildRadiusKm) err(a.name + ' is outside the build radius');
  const b = CITY.map.saveBounds;
  if (!(a.geo[0] > b.latMin && a.geo[0] < b.latMax && a.geo[1] > b.lonMin && a.geo[1] < b.lonMax)) {
    err(a.name + ' is outside the save bounds, so its saves would be rejected');
  }
}

// 3. Spacing along the opening line and along every corridor.
const MIN = sim.BAL.minSpacingKm;
for (let k = 1; k < START.length; k++) {
  if (kmBetween(ANCHORS[START[k - 1]].geo, ANCHORS[START[k]].geo) < MIN) err('opening stops too close');
}
for (const c of CORRIDORS) {
  for (let k = 1; k < c.anchors.length; k++) {
    const d = kmBetween(ANCHORS[c.anchors[k - 1]].geo, ANCHORS[c.anchors[k]].geo);
    if (d < MIN) err(c.id + ': ' + ANCHORS[c.anchors[k]].name + ' is ' + d.toFixed(2) + ' km from the stop before');
  }
}

// 4. Every anchor is NEW in exactly one place (a corridor, or the opening
// line); a stop a corridor passes through was owned by one opening no later.
{
  const owners = ANCHORS.map(() => []);
  for (const i of START) owners[i].push('start');
  for (const c of CORRIDORS) c.anchors.forEach((i, k) => { if (c.own[k]) owners[i].push(c.id); });
  ANCHORS.forEach((a, i) => {
    const o = owners[i].filter((x) => !(CITY.id === 'stockholm' && x === 'start'));
    if (o.length !== 1) err(a.name + ' is new in ' + (o.join(', ') || 'nothing'));
  });
  for (const c of CORRIDORS) {
    if (!c.anchors.length) err(c.id + ' is empty');
    c.anchors.forEach((i, k) => {
      if (c.own[k]) return;
      const ownerC = CORRIDORS.find((x) => x.anchors.some((j, m) => j === i && x.own[m]));
      const earlier = START.includes(i) || (ownerC && ownerC.opensIn <= c.opensIn);
      if (!earlier) err(c.id + ' passes through ' + ANCHORS[i].name + ' before anything builds it');
    });
    if (c.closeLoop) {
      const last = c.anchors[c.anchors.length - 1];
      if (c.own[c.anchors.length - 1]) err(c.id + ' closes on a stop it owns: the ring must close on its own line');
      if (!CITY.rules.loops) err(c.id + ' closes a ring but the pack does not allow loops');
      void last;
    }
  }
}

// 5. Era indices and projects.
for (const c of CORRIDORS) {
  if (!(c.opensIn >= 0 && c.opensIn < ERAS.length)) err(c.id + ' opens in an era that does not exist');
  if (c.project) {
    const p = CITY.projects.find((x) => x.id === c.project);
    if (!p) err(c.id + ' names a missing project ' + c.project);
    else if (p.era > c.opensIn) err(c.id + ' opens before its charter can be bought');
  }
}

// 6. Seeds exist and stand apart.
for (const p of CITY.projects) {
  const [a, b] = p.seed.map(idx);
  if (a < 0 || b < 0) { err(p.id + ' seeds a missing anchor'); continue; }
  if (kmBetween(ANCHORS[a].geo, ANCHORS[b].geo) < MIN) err(p.id + ' seeds two stops too close together');
}

// 7. Eras climb, and the last is the sandbox.
for (let i = 1; i < ERAS.length; i++) {
  if (i > 1 && !(ERAS[i].pk > ERAS[i - 1].pk && ERAS[i].delivered > ERAS[i - 1].delivered)) {
    err('era ' + ERAS[i].year + ' does not ask for more than the one before');
  }
  if (!(ERAS[i].year > ERAS[i - 1].year)) err('era years must climb');
}
if (!ERAS.every((e) => e.key && e.color)) err('every era needs a key and a colour');

// 8. Each era's corridor grants repay its charters (the original rule).
// Eras with no charter grant a token instead.
for (let e = 0; e < ERAS.length; e++) {
  const grants = CORRIDORS.filter((c) => c.opensIn === e).reduce((n, c) => n + c.trust, 0);
  const prices = CITY.projects.filter((p) => p.era === e).reduce((n, p) => n + p.pk, 0);
  if (prices && grants !== prices) err('era ' + ERAS[e].year + ' grants ' + grants + ' trust against ' + prices + ' in charters');
}

// 9. Colours: identities never in the free palette; reserved ones are identities'.
{
  const lc = (c) => c.toLowerCase();
  const pal = new Set(CITY.lines.palette.map(lc));
  const ids = new Set(Object.values(CITY.lines.identities).map((x) => lc(x.color)));
  // Stockholm's founding palette predates the identities and carries their
  // colours (foundedColor skips them by the reserved list instead).
  if (CITY.id !== 'stockholm') for (const c of ids) if (pal.has(c)) err('identity colour ' + c + ' is also in the free palette');
  for (const c of CITY.lines.reserved) if (!ids.has(lc(c))) err('reserved colour ' + c + ' belongs to no identity');
  if (pal.has(lc(CITY.start.line.color))) err('the first line\'s colour is in the free palette');
}

// 10. Facts fit a toast; eggs need real stations.
for (const f of CITY.facts) if (f.length > 140) err('a fact runs ' + f.length + ' characters: ' + f.slice(0, 30));
for (const e of CITY.eggs) for (const id of e.needs) if (idx(id) < 0) err('egg ' + e.id + ' needs missing ' + id);
if (CITY.ghostTrain && !CITY.eggs.some((e) => e.id === CITY.ghostTrain.id)) err('the ghost train has no egg');

// The diagram (spec 01 §3.12): every anchor placed by hand on the half grid,
// no two on one point, and a plan stop never on top of the one before it.
if (CITY.id !== 'stockholm') {
  const seen = new Map();
  for (const a of ANCHORS) {
    if (!Array.isArray(a.dia) || a.dia.length !== 2) { err(a.name + ' has no diagram position'); continue; }
    if (a.dia.some((v) => !Number.isFinite(v) || Math.round(v * 2) !== v * 2)) err(a.name + ' is off the half grid on the diagram');
    const k = a.dia.join(',');
    if (seen.has(k)) err(a.name + ' and ' + seen.get(k) + ' share a diagram point');
    seen.set(k, a.name);
  }
}

// Portals stand on real termini, open in a real era, and have a cost.
for (const p of CITY.portals || []) {
  if (idx(p.anchor) < 0) err('portal ' + p.id + ' stands on missing ' + p.anchor);
  if (!(p.era >= 0 && p.era < ERAS.length)) err('portal ' + p.id + ' opens in a missing era');
  if (!(p.cost && (p.cost.pk || p.cost.kr))) err('portal ' + p.id + ' has no price');
  if (!(p.demand > 0 && p.reachKm > 0)) err('portal ' + p.id + ' brings nobody');
}

// The hub and the build centre.
if (!ANCHORS.some((a) => a.hub)) err('no born hub');
if (CITY.test.loopCloseAnchor) {
  const c = CORRIDORS.find((x) => x.closeLoop);
  if (!c || c.anchors[c.anchors.length - 1] !== idx(CITY.test.loopCloseAnchor)) err('the ring corridor must close on ' + CITY.test.loopCloseAnchor);
}

// The test samples say what they claim.
{
  const g = sim.newGame();
  const inWater = CITY.water.some((w) => inRing(CITY.test.waterSample, w.ring));
  if (!inWater) err('test.waterSample is not in the water');
  if (sim.freeSpotValue(g, CITY.test.drySample) !== 0.15) err('test.drySample is not at the demand floor');
  if (!(kmBetween(CITY.test.farSample, centre) > CITY.map.buildRadiusKm)) err('test.farSample is inside the radius');
}

if (failed) {
  console.error('PACK SMOKE FAILED: ' + failed + ' problem(s) in ' + CITY.id);
  process.exit(1);
}
console.log('PACK SMOKE OK: ' + CITY.id + ' · ' + ANCHORS.length + ' anchors · ' + CORRIDORS.length + ' corridors');
