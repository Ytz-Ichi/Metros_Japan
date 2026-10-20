// The Nagoya pack (spec 02): the first city pack, and the one that ships.
// Eras are one real line's story each: 1957 東山線, 1965 名城線, 1971 名港線,
// 1977 鶴舞線, 1989 桜通線 and the ring, 2011 the sandbox. Numbers start as the
// original game's tuned values (spec 02 §1, marked 🎮) and move only with
// measurement (_dev/probe-arc.mjs), never by feel.

import { ANCHORS } from './anchors.js';
import { FACTS, EGGS, NAMES } from './facts.js';
import { STRINGS_JA } from './strings.ja.js';

// Official line colours, DIC-sourced (spec 02 §3).
const C = {
  higashiyama: '#fab123',
  meijo: '#b074d6',
  tsurumai: '#009bbf',
  sakuradori: '#c92f44',
  kamiiida: '#ec78b4',
};

export default {
  id: 'nagoya',
  name: { ja: '名古屋', en: 'Nagoya' },
  gameTitle: { ja: 'Japan Metros', en: 'Japan Metros' },
  locale: 'ja',
  // Owner ruling 2026-10-20: internal values unchanged, shown x1000 in yen,
  // short form in 万/億/兆 (spec 01 §3.10).
  currency: { unit: '円', scale: 1000, locale: 'ja-JP', shortForm: 'wan' },
  map: {
    center: [136.906, 35.168],
    // Stockholm's zoom 12 at 59°N is the same on-screen scale as ~12.67
    // here: log2(cos 35° / cos 59°) of Mercator correction.
    zoom: 12.6, minZoom: 11.0, maxZoom: 15.0,
    maxBounds: [[136.70, 35.00], [137.15, 35.32]],
    // The static view when the basemap cannot load: the opening line and
    // its first reach, framed like Stockholm's.
    fallback: { latMax: 35.208, latMin: 35.128, lonMin: 136.830 },
    nightStyle: 'basemap/night.json',
    lightStyle: 'https://tiles.openfreemap.org/styles/positron',
    saveBounds: { latMin: 34.9, latMax: 35.4, lonMin: 136.6, lonMax: 137.2 },
    buildCenter: 2,      // 栄: the geometric centre (徳重, the farthest, is 11.7 km)
    buildRadiusKm: 13,
  },
  start: {
    year: 1957,
    built: [0, 1, 2],    // 名古屋・伏見・栄, the 1957-11-15 line (then 伏見町・栄町)
    line: { name: '東山線', color: C.higashiyama, number: 1 },
    trains: 1,
  },
  anchors: ANCHORS,
  // `anchors` lists every stop the corridor runs through, existing ones
  // included (spec 01 §3.2). The first corridor to list an anchor owns it;
  // later ones pass THROUGH it, which is how 桜通線 threads 久屋大通, 今池,
  // 御器所 and 新瑞橋 instead of being a fresh line beside them.
  corridors: [
    { id: 'h-east-1', name: '東山線 東', line: '東山線', opensIn: 0, trust: 2,
      anchors: ['shinsakaemachi', 'chikusa', 'imaike', 'ikeshita', 'kakuozan', 'motoyama', 'higashiyama-koen'] },
    { id: 'm-north', name: '名城線 北', line: '名城線', opensIn: 1, trust: 2, project: 'meijo',
      anchors: ['hisaya-odori', 'nagoyajo', 'meijo-koen', 'kurokawa', 'shiga-hondori', 'heian-dori', 'ozone'],
      tease: { from: [35.1700, 136.9080], to: [35.176, 136.907], label: '名古屋城へ · 1965', labelAt: [35.1785, 136.9095] } },
    { id: 'm-south-1', name: '名城線 南', line: '名城線', opensIn: 1, trust: 1,
      anchors: ['yabacho', 'kamimaezu', 'higashi-betsuin', 'kanayama'] },
    { id: 'h-east-2', name: '東山線 星ヶ丘へ', line: '東山線', opensIn: 1, trust: 1,
      anchors: ['hoshigaoka', 'issha', 'kamiyashiro', 'hongo', 'fujigaoka'] },
    { id: 'h-west-1', name: '東山線 西', line: '東山線', opensIn: 1, trust: 1,
      anchors: ['kamejima', 'honjin', 'nakamura-nisseki', 'nakamura-koen'] },
    { id: 'e-port', name: '名港線', line: '名港線', opensIn: 2, trust: 4, project: 'meiko',
      anchors: ['hibino', 'rokubancho', 'tokai-dori', 'minato-kuyakusho', 'tsukijiguchi', 'nagoyako'],
      tease: { from: [35.1435, 136.9016], to: [35.137, 136.898], label: '名古屋港へ · 1971', labelAt: [35.1345, 136.8935] } },
    { id: 'm-south-2', name: '名城線 熱田へ', line: '名城線', opensIn: 2, trust: 3,
      anchors: ['nishi-takakura', 'atsuta-jingu-nishi', 'atsuta-jingu-temmacho', 'horita', 'myoon-dori', 'aratamabashi'] },
    { id: 'h-west-2', name: '東山線 高畑へ', line: '東山線', opensIn: 2, trust: 1,
      anchors: ['iwatsuka', 'hatta', 'takabata'] },
    { id: 't-south', name: '鶴舞線 南', line: '鶴舞線', opensIn: 3, trust: 8, project: 'tsurumai',
      anchors: ['osu-kannon', 'kamimaezu', 'tsurumai', 'arahata', 'gokiso', 'kawana', 'irinaka', 'yagoto',
        'shiogamaguchi', 'ueda', 'hara', 'hirabari', 'akaike'],
      tease: { from: [35.1693, 136.8974], to: [35.163, 136.898], label: '八事・赤池へ · 1977', labelAt: [35.1625, 136.8850] } },
    { id: 't-north', name: '鶴舞線 北', line: '鶴舞線', opensIn: 3, trust: 4,
      anchors: ['marunouchi', 'sengencho', 'joshin', 'shonai-dori', 'shonai-ryokuchi-koen', 'kami-otai'] },
    { id: 's-east', name: '桜通線', line: '桜通線', opensIn: 4, trust: 8, project: 'sakuradori',
      anchors: ['kokusai-center', 'marunouchi', 'hisaya-odori', 'takaoka', 'kurumamichi', 'imaike', 'fukiage',
        'gokiso', 'sakurayama', 'mizuho-kuyakusho', 'mizuho-undojo-nishi', 'aratamabashi', 'sakurahommachi',
        'tsurusato', 'nonami'],
      tease: { from: [35.1713, 136.8839], to: [35.172, 136.891], label: '今池へ · 1989', labelAt: [35.1755, 136.8870] } },
    { id: 's-west', name: '桜通線 太閤通', line: '桜通線', opensIn: 4, trust: 1,
      anchors: ['taiko-dori'] },
    // The ring (spec 01 §3.3): clockwise from 大曽根 through 本山 and 八事, and
    // the last entry is 名城線's own far end, so finishing the corridor means
    // CLOSING the line into a loop rather than reaching one more stop.
    { id: 'm-loop', name: '名城線 環状化', line: '名城線', opensIn: 4, trust: 8, closeLoop: true,
      anchors: ['nagoya-dome-mae-yada', 'sunadabashi', 'chayagasaka', 'jiyugaoka', 'motoyama', 'nagoya-daigaku',
        'yagoto-nisseki', 'yagoto', 'sogo-rehabili-center', 'mizuho-undojo-higashi', 'aratamabashi'] },
    { id: 'k-line', name: '上飯田線', line: '上飯田線', opensIn: 4, trust: 2, project: 'kamiiida',
      anchors: ['heian-dori', 'kamiiida'] },
    { id: 's-south', name: '桜通線 徳重へ', line: '桜通線', opensIn: 5, trust: 2,
      anchors: ['narukokita', 'aioiyama', 'kamisawa', 'tokushige'],
      tease: { from: [35.1024, 136.9555], to: [35.103, 136.962], label: '徳重へ · 2011', labelAt: [35.1060, 136.9640] } },
  ],
  // Gates are the original game's (🎮), to be measured (spec 02 §1).
  eras: [
    { year: 1957, key: '1957', color: C.higashiyama },
    { year: 1965, key: '1965', color: C.meijo, pk: 5, delivered: 20000 },
    { year: 1971, key: '1971', color: C.meijo, pk: 12, delivered: 80000 },
    { year: 1977, key: '1977', color: C.tsurumai, pk: 25, delivered: 230000 },
    { year: 1989, key: '1989', color: C.sakuradori, pk: 50, delivered: 440000 },
    { year: 2011, key: '2011', color: C.kamiiida, pk: 90, delivered: 780000 },
  ],
  // Every seed has one existing end (栄・金山・伏見・名古屋・平安通), so no
  // charter opens as an orphan the way Stockholm's red line does.
  projects: [
    { id: 'meijo', era: 1, pk: 5, seed: ['sakae', 'hisaya-odori'], gift: 1 },
    { id: 'meiko', era: 2, pk: 8, seed: ['kanayama', 'hibino'], gift: 1 },
    { id: 'tsurumai', era: 3, pk: 12, seed: ['fushimi', 'osu-kannon'], gift: 1 },
    { id: 'sakuradori', era: 4, pk: 16, seed: ['nagoya', 'kokusai-center'], gift: 1 },
    { id: 'kamiiida', era: 4, pk: 3, seed: ['heian-dori', 'kamiiida'], gift: 1 },
  ],
  // Rough rectangles, the original game's habit (spec 02 §6). What matters is
  // that no anchor sits inside one; _dev/smoke-pack.mjs checks it.
  water: [
    { label: '堀川（北）', ring: [[35.190, 136.8905], [35.190, 136.8935], [35.150, 136.8935], [35.150, 136.8905]] },
    { label: '堀川（中）', ring: [[35.150, 136.8945], [35.150, 136.8985], [35.115, 136.8985], [35.115, 136.8945]] },
    // Narrowed east of the spec's 136.886: 東海通 (136.8873) sits on the
    // west bank and the spec's band drowned it (smoke-pack caught it).
    { label: '堀川（南）', ring: [[35.115, 136.888], [35.115, 136.893], [35.092, 136.893], [35.092, 136.888]] },
    { label: '名古屋港', ring: [[35.0915, 136.84], [35.0915, 136.92], [35.05, 136.92], [35.05, 136.84]] },
    { label: '庄内川・新川', ring: [[35.233, 136.902], [35.208, 136.858], [35.204, 136.862], [35.229, 136.906]] },
    { label: '天白川', ring: [[35.110, 136.959], [35.110, 136.963], [35.095, 136.963], [35.095, 136.959]] },
  ],
  nobuild: [
    { label: '名古屋城', ring: [[35.1895, 136.896], [35.1895, 136.905], [35.183, 136.905], [35.183, 136.896]] },
    { label: '熱田神宮', ring: [[35.131, 136.9075], [35.131, 136.912], [35.125, 136.912], [35.125, 136.9075]] },
    { label: '東山動植物園', ring: [[35.159, 136.975], [35.159, 136.988], [35.148, 136.988], [35.148, 136.975]] },
  ],
  // Hand-placed for M0 (spec 02 §7); the census mesh replaces them later.
  districts: [
    { name: '中区', geo: [35.168, 136.908], rKm: 1.3, w: 0.95 },
    { name: '名駅', geo: [35.170, 136.882], rKm: 1.2, w: 0.90 },
    { name: '東区', geo: [35.178, 136.920], rKm: 1.0, w: 0.80 },
    { name: '千種区', geo: [35.168, 136.945], rKm: 1.3, w: 0.85 },
    { name: '昭和区', geo: [35.150, 136.935], rKm: 1.2, w: 0.80 },
    { name: '北区', geo: [35.198, 136.915], rKm: 1.3, w: 0.70 },
    { name: '西区', geo: [35.196, 136.888], rKm: 1.3, w: 0.65 },
    { name: '瑞穂区', geo: [35.130, 136.935], rKm: 1.2, w: 0.70 },
    { name: '熱田区', geo: [35.125, 136.905], rKm: 1.0, w: 0.65 },
    { name: '中川区', geo: [35.145, 136.860], rKm: 1.5, w: 0.60 },
    { name: '港区', geo: [35.105, 136.885], rKm: 1.3, w: 0.55 },
    { name: '南区', geo: [35.105, 136.935], rKm: 1.3, w: 0.60 },
    { name: '守山区', geo: [35.205, 136.965], rKm: 1.5, w: 0.50 },
    { name: '緑区', geo: [35.095, 136.985], rKm: 1.6, w: 0.60 },
    { name: '名東区', geo: [35.170, 137.000], rKm: 1.4, w: 0.65 },
    { name: '天白区', geo: [35.125, 136.990], rKm: 1.4, w: 0.60 },
    { name: '金山', geo: [35.143, 136.902], rKm: 0.7, w: 0.80 },
    { name: '大曽根', geo: [35.192, 136.937], rKm: 0.8, w: 0.70 },
    { name: '本山', geo: [35.160, 136.965], rKm: 0.9, w: 0.65 },
    { name: '八事', geo: [35.137, 136.964], rKm: 0.8, w: 0.60 },
    { name: '星ヶ丘', geo: [35.163, 136.985], rKm: 0.8, w: 0.60 },
    { name: '藤が丘', geo: [35.182, 137.021], rKm: 0.9, w: 0.55 },
    { name: '名古屋港', geo: [35.095, 136.882], rKm: 0.8, w: 0.50 },
    { name: '日進', geo: [35.118, 137.025], rKm: 1.0, w: 0.45 },
    { name: '長久手', geo: [35.180, 137.045], rKm: 1.0, w: 0.40 },
    { name: '清須', geo: [35.228, 136.870], rKm: 1.0, w: 0.45 },
    { name: '小牧方面', geo: [35.215, 136.930], rKm: 0.9, w: 0.40 },
  ],
  // 直通運転 (spec 02 §8): the termini where Meitetsu and Linimo hand their
  // riders over. `toward` points the map stub out past the terminus.
  portals: [
    { id: 'portal-toyota', anchor: 'akaike', name: '名鉄豊田線', label: '豊田市へ', era: 3, demand: 0.6, reachKm: 0.6,
      cost: { pk: 4 }, toward: [35.105, 137.060] },       // 1979-07-29
    { id: 'portal-inuyama', anchor: 'kami-otai', name: '名鉄犬山線', label: '犬山へ', era: 3, demand: 0.6, reachKm: 0.6,
      cost: { pk: 4 }, toward: [35.250, 136.905] },       // 1993-08-12
    { id: 'portal-komaki', anchor: 'kamiiida', name: '名鉄小牧線', label: '小牧へ', era: 4, demand: 0.5, reachKm: 0.6,
      cost: { pk: 2 }, toward: [35.225, 136.935] },       // 2003-03-27
    { id: 'portal-linimo', anchor: 'fujigaoka', name: 'リニモ', label: '万博会場へ', era: 4, demand: 0.4, reachKm: 0.6,
      cost: { kr: 60000 }, toward: [35.175, 137.060] },   // 2005-03-06
  ],
  lines: {
    // Free lines' colours keep clear of the six official ones (spec 02 §3).
    palette: ['#35a86b', '#4f8fd4', '#8fae4a', '#6fd6b0', '#c8a040', '#d77a3c'],
    identities: {
      meijo: { name: '名城線', number: 2, color: C.meijo },
      // 名港線 is 名城線's purple with a white stripe (spec 02 §3.1).
      meiko: { name: '名港線', number: 2, color: C.meijo, stripe: '#ffffff' },
      tsurumai: { name: '鶴舞線', number: 3, color: C.tsurumai },
      sakuradori: { name: '桜通線', number: 6, color: C.sakuradori },
      kamiiida: { name: '上飯田線', number: 7, color: C.kamiiida },
    },
    reserved: [C.meijo, C.tsurumai, C.sakuradori, C.kamiiida],
    historic: ['東山線', '名城線', '名港線', '鶴舞線', '桜通線', '上飯田線'],
    // The real numbers run 1 to 7 (4 went into 名城線, 5 was never built).
    foundedName: (n) => n + '号線',
    foundedFrom: 8,
  },
  rules: {
    hubEra: 1,        // ターミナル from 1965: 栄 becomes an interchange that year (🎮)
    incidentEra: 2,   // signal failures from 1971, the third era as in the original
    loops: true,
    infill: false,
    sandboxLines: 16,
    // Six historic lines plus room for two of the player's own before the
    // sandbox; the original's cap was its palette, and this city needs more.
    maxLines: 8,
    maxStations: 120,
    balance: {},
  },
  diagram: { unitKm: 0.8, originAnchor: 2 },
  facts: FACTS,
  eggs: EGGS,
  // 黄電 rides 東山線 at night, as Silverpilen rode the green line.
  ghostTrain: { id: 'kiden', line: '東山線', color: '#f2b000' },
  names: NAMES,
  naming: { freeSpotBase: '駅', freeSpotSuffix: ['', ' 2', ' 3', ' 4', ' 5', ' 6', ' 7', ' 8', ' 9', ' 10'] },
  strings: { ja: STRINGS_JA },
  achievements: [
    { id: 'higashiyama-koen', name: '東山公園', hint: '1957 年の線を東山公園まで',
      check: (g, h) => h.planDone('h-east-1'), reward: { kr: 2500 } },
    { id: 'fujigaoka', name: '藤が丘', hint: '東山線を藤が丘へ',
      check: (g, h) => h.used('fujigaoka'), mult: { fare: 1.02 } },
    { id: 'takabata', name: '高畑', hint: '東山線を高畑へ。全通',
      check: (g, h) => h.used('takabata') },
    { id: 'meijo', name: '名城線', hint: '名城線をチャーターする',
      check: (g, h) => h.owned('meijo') },
    { id: 'ozone', name: '大曽根', hint: '名城線を大曽根へ',
      check: (g, h) => h.used('ozone') },
    { id: 'kanayama', name: '金山', hint: '名城線を金山へ',
      check: (g, h) => h.used('kanayama'), reward: { pk: 2 } },
    { id: 'nagoyako', name: '名古屋港', hint: '名港線を港へ',
      check: (g, h) => h.planDone('e-port'), mult: { fare: 1.03 } },
    { id: 'aratamabashi', name: '新瑞橋', hint: '4 号線、熱田の下を新瑞橋へ',
      check: (g, h) => h.planDone('m-south-2') },
    { id: 'tsurumai', name: '鶴舞線', hint: '鶴舞線をチャーターする',
      check: (g, h) => h.owned('tsurumai') },
    { id: 'akaike', name: '市外へ', hint: '赤池に着く。名古屋市の外',
      check: (g, h) => h.used('akaike'), mult: { fare: 1.03 } },
    { id: 'kami-otai', name: '上小田井', hint: '鶴舞線を全通させる',
      check: (g, h) => h.planDone('t-north') },
    { id: 'sakuradori', name: '桜通線', hint: '桜通線をチャーターする',
      check: (g, h) => h.owned('sakuradori') },
    { id: 'nonami', name: '野並', hint: '桜通線を野並へ',
      check: (g, h) => h.used('nonami') },
    { id: 'loop-closed', name: '環状', hint: '名城線を輪にする',
      check: (g, h) => h.loop('名城線'), mult: { fare: 1.05 }, reward: { pk: 3 } },
    { id: 'kamiiida', name: '日本一短い', hint: '上飯田線をつなぐ',
      check: (g, h) => h.planDone('k-line') },
    { id: 'tokushige', name: '徳重', hint: '桜通線を徳重へ',
      check: (g, h) => h.used('tokushige') },
    { id: 'all-charters', name: '五つの免許', hint: '全てのチャーターを取る',
      check: (g, h) => ['meijo', 'meiko', 'tsurumai', 'sakuradori', 'kamiiida'].every((p) => h.owned(p)) },
  ],
  // Era indices match the base catalog already (spec 02 §13); the city adds
  // its last rolling stock as a sandbox money sink.
  catalog: {
    driftcentral: { unlock: { anchorId: 'nagoya' } },
    stockE: { base: 40000, growth: 1, max: 1, era: 5, mult: { speed: 0.93 }, after: 'c14stock' },
  },
  council: {},
  credits: { basedOn: 'Tunnelbana by Matthew MacLaine (MIT)', author: '', feedback: null },
  test: {
    firstCorridor: 'h-east-1',
    firstProject: 'meijo',
    waterSample: [35.07, 136.88],
    drySample: [35.00, 137.10],
    farSample: [35.30, 136.90],
    loopLine: '名城線',
    loopCloseAnchor: 'aratamabashi',
  },
};
