// The Stockholm pack: the original game, kept as a city pack (spec 01 §1).
// It is not shipped; it is the regression baseline the inherited smoke suite
// and value gate were written against, so the engine can be proven unchanged
// by the pack-ification before any Japanese city leans on it.

import { ANCHORS as RAW, CORRIDORS as RAW_CORRIDORS, WATER, DISTRICTS, LINE } from './data.js';
import { FACTS, EGGS, NAMES } from './facts.js';

// Stable ids from the real names: 'S:t Eriksplan' -> 's-t-eriksplan'.
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const anchors = RAW.map((a) => ({ ...a, id: slug(a.name) }));

const ERA_YEARS = [1950, 1952, 1957, 1964, 1975, 2000];
const LINE_OF = {
  'green-south': 'Gröna linjen', 'green-west': 'Västerortsbanan',
  'red-south': 'Röda linjen', 'red-orn': 'Röda linjen', 'red-ost': 'Röda linjen',
  'blue-main': 'Blå linjen', 'blue-akalla': 'Blå linjen',
};
const PROJECT_OF = {
  'green-west': 'westline', 'red-south': 'redline', 'red-orn': 'redline', 'red-ost': 'redline',
  'blue-main': 'blueline', 'blue-akalla': 'blueline',
};

const corridors = RAW_CORRIDORS.map((c) => ({
  id: c.id,
  name: c.name,
  line: LINE_OF[c.id],
  opensIn: ERA_YEARS.indexOf(c.opensIn),
  anchors: anchors.slice(c.start, c.end).map((a) => a.id),
  trust: c.trust,
  tease: c.tease,
  project: PROJECT_OF[c.id],
}));

export default {
  id: 'stockholm',
  name: { en: 'Stockholm', ja: 'ストックホルム' },
  gameTitle: { en: 'Tunnelbana' },
  locale: 'en',
  currency: { unit: 'kr', scale: 1, locale: 'sv-SE', shortForm: 'kmb' },
  map: {
    center: [18.0640, 59.3230], zoom: 12.0, minZoom: 10.3, maxZoom: 14.5,
    maxBounds: [[17.5, 59.03], [18.65, 59.58]],
    fallback: { latMax: 59.3320, latMin: 59.2520, lonMin: 18.0400 },
    nightStyle: 'basemap/night.json',
    lightStyle: 'https://tiles.openfreemap.org/styles/positron',
    saveBounds: { latMin: 59.0, latMax: 59.6, lonMin: 17.5, lonMax: 18.6 },
    buildCenter: 0,
    buildRadiusKm: 13,
  },
  start: { year: 1950, built: [0, 1, 2], line: { name: 'Gröna linjen', color: LINE.color }, trains: 1 },
  anchors,
  corridors,
  eras: [
    { year: 1950, key: '1950', color: '#35a86b' },
    { year: 1952, key: '1952', color: '#6fd6b0', pk: 5, delivered: 20000 },
    { year: 1957, key: '1957', color: '#35a86b', pk: 12, delivered: 80000 },
    { year: 1964, key: '1964', color: '#c8544a', pk: 25, delivered: 230000 },
    { year: 1975, key: '1975', color: '#4f8fd4', pk: 50, delivered: 440000 },
    { year: 2000, key: '2000', color: '#e0a63c', pk: 90, delivered: 780000 },
  ],
  // westline and blueline seed from T-Centralen (their first corridor stops
  // are adjacent to it in reality); redline seeds as an ORPHAN shuttle on its
  // corridor's first two stops (report 646 §a: lines opening as disconnected
  // stubs is itself historical).
  projects: [
    { id: 'westline', era: 1, pk: 5, seed: ['t-centralen', 'hotorget'], gift: 1 },
    { id: 'redline', era: 3, pk: 10, seed: ['mariatorget', 'zinkensdamm'], gift: 1 },
    { id: 'blueline', era: 4, pk: 16, seed: ['t-centralen', 'radhuset'], gift: 1 },
  ],
  water: WATER,
  nobuild: [],
  districts: DISTRICTS,
  lines: {
    palette: ['#4f8fd4', '#c8544a', '#b06fa8', '#8fae4a', '#6fd6b0'],
    identities: {
      westline: { name: 'Västerortsbanan', color: '#6fd6b0' },
      redline: { name: 'Röda linjen', color: '#c8544a' },
      blueline: { name: 'Blå linjen', color: '#4f8fd4' },
    },
    reserved: ['#c8544a', '#4f8fd4', '#6fd6b0'],
    historic: ['Gröna linjen', 'Röda linjen', 'Blå linjen'],
    foundedName: (n) => 'Linje ' + n,
    foundedFrom: 2,
    // Owner ruling 2026-08-10: Västerortsbanan IS the green line's west arm,
    // so it may be recoloured, and it alone may wear the family green.
    recolorException: { name0: 'Västerortsbanan', project: 'westline' },
  },
  rules: {
    hubEra: 2,
    incidentEra: 2,
    loops: false,
    infill: false,
    sandboxLines: 16,
    maxStations: 90,
    balance: {},
    // What every save made before eraGoals existed was promised (0.14.0).
    legacyEraGoals: [0, 20000, 80000, 180000, 340000, 600000],
  },
  diagram: { unitKm: 0.9, originAnchor: 0 },
  facts: FACTS,
  eggs: EGGS,
  ghostTrain: { id: 'silverpilen', line: 0, color: null },
  names: NAMES,
  naming: { freeSpotBase: 'Station', freeSpotSuffix: ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'] },
  strings: {},
  achievements: [
    { id: 'full-1950', name: 'Hökarängen', hint: 'Complete the 1950 line',
      check: (g, h) => h.usedCount() >= 13, mult: { fare: 1.02 }, reward: { kr: 2500 } },
    { id: 'red-line', name: 'Röda linjen', hint: 'Reach Fruängen',
      check: (g, h) => h.used('fruangen'), mult: { fare: 1.03 } },
    { id: 'blue-line', name: 'Blå linjen', hint: 'Reach Hjulsta',
      check: (g, h) => h.used('hjulsta'), mult: { fare: 1.03 } },
    { id: 'vasterort', name: 'Västerort', hint: 'Complete the 1952 line to Vällingby',
      check: (g, h) => h.planDone('green-west') },
    { id: 'genom-staden', name: 'Genom staden', hint: 'Reach 1957: the lines become a system',
      check: (g, h) => h.era() >= 2 },
    { id: 'red-complete', name: 'Söder om Söder', hint: 'Deliver every red corridor',
      check: (g, h) => h.planDone('red-south') && h.planDone('red-orn') && h.planDone('red-ost') },
    { id: 'blue-complete', name: 'Järvafältet', hint: 'Deliver both blue corridors',
      check: (g, h) => h.planDone('blue-main') && h.planDone('blue-akalla') },
    { id: 'charters', name: 'Three charters', hint: 'Take all three megaproject lines',
      check: (g, h) => h.owned('westline') && h.owned('redline') && h.owned('blueline') },
    { id: 'era-1964', name: 'Två färger', hint: 'Reach 1964',
      check: (g, h) => h.era() >= 3 },
    { id: 'era-1975', name: 'Under Järvafältet', hint: 'Reach 1975',
      check: (g, h) => h.era() >= 4 },
  ],
  catalog: {},
  council: {},
  credits: { basedOn: 'Tunnelbana by Matthew MacLaine', author: 'Matthew MacLaine', feedback: null },
  test: {
    firstCorridor: 'green-south',
    firstProject: 'westline',
    waterSample: [59.3260, 18.0700],
    drySample: [59.2000, 18.4000],
    farSample: [59.4500, 18.3000],
  },
};
