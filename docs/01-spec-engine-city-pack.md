# 01 · エンジン共通化と日本版共通仕様（City Pack 仕様）

前提: [00 既存ゲーム分析](00-existing-game-analysis.md) を読んでいること。
この文書は「ストックホルム固有のゲーム」を「都市パック（city pack）を差し替えれば別の都市になるエンジン」にするための仕様と、日本版（東京・名古屋）で共通に使う決め事、そして UI 改善提案をまとめる。
都市ごとのデータは [02 名古屋パック](02-spec-nagoya-pack.md) と [03 東京パック](03-spec-tokyo-pack.md) にある。

実装者への注意: この文書は「何を・なぜ」を決める。「どう書くか」は既存コードの流儀（コメントで理由を残す、エンティティはコンストラクタ経由、数値は `_dev` で測る）に従うこと。既存の `node _dev/smoke.mjs` と `node _dev/value-gate.mjs` を常に緑に保つ。

---

## 0. 目的・範囲・方針

### 0.1 目的
1. 基本的なゲーム性（地図＝進捗バー、時代＝一本の実在路線の物語、杭、プランゲート、信頼、サンドボックス、エンディング）を**そのまま**保つ。
2. 都市固有データ（駅・コリドー・水域・人口・豆知識・新聞・文字列）を `src/city/<id>/` に閉じ込め、エンジンから都市名を消す。
3. 日本の地下鉄に必要な 3 つの構造追加を行う: **環状線**、**既存駅を経由するコリドー**、**複数のハブ**。任意で **直通運転（portal）** と **途中駅の後年挿入（infill）**。
4. UI を日本語化し、通貨・数値・フォント・看板語を日本の文脈に合わせる。

### 0.2 範囲外
- ゲーム経済の再設計。数値は「まず同じ」で始め、`_dev/probe-arc.mjs` 等で測ってから直す。
- マルチプレイ、モバイル専用 UI、サーバー。

### 0.3 推奨順序（結論）
**名古屋パックを最初に作り、東京は第二パックにする。**（オーナー決定 2026-10-20: 名古屋先行、表示言語は日本語のみ、通貨は万円表示。）理由:
- 規模（87 駅・6 路線・6 時代）が元ゲーム（59 駅・3 路線・6 時代）の調整済み経済に近く、ペーシング計測ツールがそのまま使える。
- 事業者が一つ（名古屋市交通局）で、「一時代＝一路線」の物語が元ゲームと同じ型にはまる（1957 東山線 → 1965 名城線 → 1971 名港線 → 1977 鶴舞線 → 1989 桜通線 → 2011 サンドボックス）。
- 名古屋に必要なエンジン追加（環状線・経由コリドー）は、東京（大江戸線・乗換網）でもそのまま使う。
- 東京は 215 駅以上・13 路線・2 事業者で、経済の指数や時代数（7）を変えねばならず、計測しながらの調整工数が大きい。パックの抽象化を名古屋で証明してから取り組むのが安全。

リポジトリ名は `Metros_Tokyo` だが、`src/city/` に複数パックを置く前提で「Metros」シリーズとして扱うことを提案する（タイトル案は §6）。

### 0.4 ライセンス上の義務
- コードは MIT。`LICENSE` の著作権表示を残す。
- 「Tunnelbana · Build Stockholm」の名前・ロゴ・アートワークは使えない。**新しいゲーム名・ロゴ**が必要。
- About に「based on Tunnelbana by Matthew MacLaine」を入れる（作者の希望）。
- `incrementaldb.txt` は作者の所有証明。**削除する。** `FEEDBACK_URL` / `PULSE_URL`（maclaine.se）は作者のサーバーに送る。**無効化する**（設定行ごと隠す）。
- 地図タイル OpenFreeMap、MapLibre、フォント OFL、音楽 TAD（CC0）は流用可。クレジット表記を維持。

---

## 1. リポジトリ構成（提案）

```
src/
  sim.js            エンジン（都市名なし）
  render.js         描画（都市名なし、文字列は i18n 経由）
  main.js           DOM（都市名なし）
  diagram.js
  sound.js
  geo.js            kmBetween / inRing / crossesWater / densityAt（data.js から分離）
  i18n/
    ja.js           共通 UI 文字列（日本語）  ← 既定
    en.js           共通 UI 文字列（英語、任意）
  city/
    index.js        現在の都市パックを 1 行で re-export（`export { default } from './nagoya/index.js'`）
    nagoya/
      index.js      パック本体（§2 のスキーマ）。下のファイルを束ねる
      anchors.js    駅アンカー
      corridors.js  コリドー・チャーター・時代
      geo.js        水域・建設禁止・人口ブロブ・地図設定
      facts.js      豆知識・エッグ・名前
      strings.ja.js 都市固有の文字列（路線名、ショップの車両名、新聞、時代の文、エンディング）
      achievements.js 歴史系の実績
    tokyo/          同じ構成
    stockholm/      元データをパック化したもの（任意だが推奨: 回帰テストの基準になる）
_dev/
  smoke.mjs         エンジン共通のシナリオ（パックの `test` 情報を使う）
  smoke-pack.mjs    現在のパックの不変条件（§5.1）
  value-gate.mjs    パラメータ化
  probe-*.mjs       同上
index.html          現在の都市のタイトル/メタ/ヘルプ（当面は名古屋固定。東京追加時にテンプレ化、§1.2）
```

### 1.1 都市の切り替え
- M0 では**ビルド時固定**（`src/city/index.js` の 1 行と `index.html` の head）。ゲームは都市ごとに別ページとして配布する（itch の別プロジェクト、または `/nagoya/`, `/tokyo/` のパス）。
- セーブは都市ごとに別キー（§3.9）。同じページで都市を切り替える UI は作らない（スロットやセーブ互換が複雑になるだけで利点が無い）。

### 1.2 東京追加時
- `index.html` を `index.template.html` にし、`_dev/build.mjs --city tokyo` が `dist/tokyo/` に head（title / description / og）とヘルプの都市固有段落を埋めた HTML を出力する。ヘルプの共通部分は `src/i18n/ja.js` に移し、JS で描画してもよい（その場合テンプレは head のみ）。

---

## 2. 都市パックのスキーマ

`src/city/<id>/index.js` は以下の形のオブジェクトを default export する。型は TypeScript 風に書くが、実装は JS（JSDoc）でよい。「必須」でないものは省略可。

```ts
type CityPack = {
  id: 'nagoya' | 'tokyo' | 'stockholm';       // セーブキー・localStorage 接頭辞・解析用
  name: { ja: string; en?: string };          // 「名古屋」
  gameTitle: { ja: string; en?: string };     // タイトル画面の語（§6）
  locale: 'ja' | 'en';                        // 既定の表示言語
  currency: {                                 // §3.10
    unit: string;        // '円'
    scale: number;       // 内部 1 = 表示 scale（名古屋・東京: 1000）
    locale: string;      // 'ja-JP'
    shortForm: 'wan' | 'kmb';   // 万/億/兆 か K/M/B か
  };
  map: {
    center: [lon, lat]; zoom: number; minZoom: number; maxZoom: number;
    maxBounds: [[lon, lat], [lon, lat]];
    fallback: { latMax: number; latMin: number; lonMin: number };  // render.js FB
    nightStyle: string; lightStyle: string;
    saveBounds: { latMin, latMax, lonMin, lonMax };    // validStation の範囲
    buildCenter: number;       // 建設半径の中心にする anchor index
    buildRadiusKm: number;     // BAL.buildRadiusKm の上書き
  };
  start: {
    year: number;              // 表示用（eras[0].year と同じ）
    built: number[];           // ゲーム開始時に建っている anchor index（順序 = 最初の路線の駅順）
    line: { name: string; color: string; number?: number };   // 最初の路線（東山線 / 銀座線）
    trains: number;            // 1
  };
  anchors: Anchor[];
  corridors: Corridor[];
  eras: Era[];                 // 最後が必ずサンドボックス
  projects: Project[];         // チャーター（メガプロジェクト）
  water: Ring[];               // 線路コスト 2 倍 ＋ 駅建設不可
  nobuild: Ring[];             // 駅建設不可のみ（皇居、名古屋城 …）
  districts: District[];       // 人口ブロブ
  portals?: Portal[];          // 直通運転（§3.7、任意）
  lines: {                     // 色と名前の決まり
    palette: string[];         // 自由路線に配る色（公式色は含めない）
    identities: Record<projectId, { name: string; color: string; number?: number }>;
    reserved: string[];        // 歴史路線の色（自由路線には配らない）
    historic: string[];        // 色変更不可の name0
    foundedName: (n: number) => string;   // 「7号線」
    foundedFrom: number;       // 最初の自由路線の番号
  };
  rules: {
    hubEra: number;            // tier 3 解禁の時代 index（元: 1957 = 2）
    incidentEra: number;       // 信号故障開始の時代 index
    loops: boolean;            // 環状線を許すか
    infill: boolean;           // 途中駅挿入アンカーを使うか
    sandboxLines: number;      // 16
    maxStations: number;       // BAL.maxStations
    balance?: Partial<typeof BAL>;   // 経済定数の上書き（最小限に）
  };
  diagram: { unitKm: number; originAnchor: number };   // dia 自動フィットの基準（§3.12）
  facts: string[];
  eggs: Egg[];
  ghostTrain?: { id: string; name: string; line: number; color: string; fact: string };
  names: string[];             // 絵葉書の名前
  strings: { ja: Record<string, any>; en?: Record<string, any> };   // 都市固有文字列（§3.8）
  achievements: HistoryAchievement[];   // §3.11
  catalog?: Record<itemId, Partial<CatalogItem>>;   // era index の上書き等
  council?: { tiers?: { name: string; era: number }[] };
  credits: { basedOn: string; author: string; extra?: string[] };
  test: {                      // _dev が使う
    firstCorridor: string;     // 最初のコリドー id（プランゲートのテスト）
    firstProject: string;      // 最初のチャーター id（value-gate）
    waterSample: [lat, lon];   // 水域内の点
    drySample: [lat, lon];     // 需要床（0.15）の点
    farSample: [lat, lon];     // 建設半径外の乾いた点
  };
};

type Anchor = {
  id: string;                  // 安定 id（駅名の英字 slug: 'sakae'）。index は配列位置
  name: string;                // 表示名（現駅名、日本語）
  nameEn?: string;
  geo: [lat, lon];
  dia?: [x, y];                // 路線図座標（省略時は自動フィット）
  hub?: boolean;               // 生まれつき tier 3
  codes?: string[];            // 駅ナンバリング 'H10', 'M09'
  opened?: string;             // 'YYYY-MM-DD'（表示・史実メモ用。ゲーム進行には使わない）
  formerName?: string;         // 旧名（市役所→名古屋城）
  infill?: { between: [string, string] };   // 途中挿入（§3.6）
};

type Corridor = {
  id: string;
  name: string;                // 表示名（「名城線 北」）
  line: string;                // この杭が属する路線の name0（識別子）。杭の色と「継続する路線」の判定に使う
  opensIn: number;             // 時代 index（年ではない）
  anchors: string[];           // anchor id の配列。既存駅を含んでよい（経由）
  trust: number;               // 完成時の一回限りの信頼
  tease?: { from: [lat, lon]; to: [lat, lon]; label: string; labelAt: [lat, lon] };
  project?: string;            // この路線を始めるチャーターの id（無ければ既存路線を延ばす）
};

type Project = {               // CATALOG に `kind: 'project', currency: 'pk'` として注入される
  id: string;                  // 'meijo', 'meiko' …（CATALOG id と同じ）
  era: number;                 // 時代 index
  pk: number;
  seed: [string, string];      // 生まれる 2 駅（anchor id）。既存駅なら共有（ジャンクション）
  gift: number;                // 付属する列車（1）
};

type Era = {
  year: number;
  pk?: number; delivered?: number;   // 先頭の時代は無し
  key: string;                 // CSS トークンと文字列のキー（'1965'）
  color: string;               // --tb-era-<key>
  slotWord: string;            // セーブスロットの短い語（「名城線の時代」）
  news: { date: string; dateJa: string; kicker: string; edition: string; price: string;
          head: string; lede: string; next: string };
  title: string; blurb: string;   // 時代パネル・新聞の足
};

type Ring = { label: string; ring: [lat, lon][] };
type District = { name: string; geo: [lat, lon]; rKm: number; w: number };
type Egg = { id: string; name: string; geo: [lat, lon] | null; needs: string[] /* anchor ids */; fact: string };
type Portal = { id: string; anchor: string; name: string; era: number; demand: number; reachKm: number; cost: { kr?: number; pk?: number } };
type HistoryAchievement = { id: string; cat: 'history'; hidden?: boolean; tease?: string;
  check: (g, h: Helpers) => boolean; mult?: {}; add?: {}; reward?: {} };
```

**anchor の参照は id で行う。** index 直書き（`used.has(55)`）はパック内に残さない。エンジンは起動時に `anchorIndex(id)` の Map を作る。セーブは従来通り index を保存する（配列順序は不変、追加は末尾のみ、というルールを README に書く）。

---

## 3. エンジン変更（ファイル・関数単位）

### 3.1 `data.js` の解体
- 幾何（`kmBetween`, `inRing`, `crossesWater`, `densityAt`）→ `src/geo.js`。`densityAt(geo, districts)` のように配列を引数で受ける（モジュール定数に依存しない）。
- `ANCHORS`, `CORRIDORS`, `WATER`, `DISTRICTS`, `START_BUILT`, `WEST_FIRST`, `LINE` は**消す**。sim.js は `import CITY from './city/index.js'` して `CITY.anchors` 等を読む。
- `WEST_FIRST` を使う箇所（`_dev/value-gate.mjs`）は `CITY.test.firstProject` の seed から求める。

### 3.2 コリドー: 連続 index 範囲 → anchor id の配列（必須）

現状の `{start, end}` 範囲は「新しい地面だけ」を持ち、既存駅の経由ができない。日本の地下鉄は既存駅を貫いて延びる区間が多い（桜通線は久屋大通・今池・御器所・新瑞橋を通る）。

変更:
- `corridorOf(i)`: その anchor を **新規**として含む（＝それ以前に開くどのコリドーにも含まれない）最初のコリドー。経由駅は「所有」しない。
- `corridorProgress(g, c)`: `c.anchors` のうち `usedAnchorsAll(g)` にあるものの数（経由駅は建っていれば数える）。`corridorComplete`, `planBlockers`, `updatePlanDone` は変更不要。
- `anchorRevealed(g, i)`: 各コリドーの配列を先頭から見て「最初の未建設の anchor」だけを露出。経由駅が既に建っていれば読み飛ばす。コリドーが未着手なら先頭の anchor を `opensIn` 到来後に露出。**複数のコリドーに現れる anchor は、どれか一つのコリドーで露出していれば露出**。
- `nextStakeOf` 同様。
- `stakeLine(g, i)`: 杭の色と「どの路線が続けるか」。優先順: (1) `g.lines` のうち `name0 === corridor.line` の路線、(2) 配列上の直前の anchor を持つ路線、(3) null。
- `drawAnchors`（render）: 破線のリーダーは「配列上の直前の anchor」から引く（経由駅なら、そこから）。
- `PROJECT_OF_CORRIDOR`（main.js）→ `corridor.project` を読む。
- `teaseVisible` 変更なし。
- スモーク不変条件: 各 anchor は「新規」として**ちょうど一つ**のコリドーか `start.built` に属する。経由として現れる anchor は、それより `opensIn` が小さいか等しいコリドー（または start）に新規として属する。配列は空でない。

### 3.3 環状線（名城線・任意で大江戸線）（必須: `rules.loops`）

**データ**: `line.loop: boolean`（既定 false）。セーブに保存。hydrate は `stations.length >= 4` のときだけ true を許す。

**閉じ方**: `extendTo(g, li, end, geo, anchorIdx)` で、`anchorIdx` が同じ路線の**反対側の端**の anchor であり、`L.stations.length >= 4` で、`CITY.rules.loops` のとき、拒否せず **閉環**する: 線路代のみ課金（`extensionCost` は station 分 0）、`L.loop = true`、駅配列は変えない、`g.events.push({type:'loop', name: L.name})`。杭の露出は従来通り（閉じる anchor は配列上は「既に建っている」ので `anchorRevealed` は true を返す。コリドーの最後の要素が既存駅＝閉環点になる）。`placementProblem` は閉環を `'own'` 扱いで拒否しないこと（同路線上の anchor は通常拒否だが、閉環条件に合うなら許す）。

**運行**:
- `advancePhase`: 到着後の次の駅 `k + dir` が配列外なら、`loop` のときは `(k + dir + n) % n` に続ける。`atTerminus` は loop では常に false（終点一掃をしない。乗客の行き先は `dest[k]` で必ず降りる）。
- `dispatchFrom(g, li, end)`: loop では `end` を方向として読む（`'head'` = dir +1 = 右回り、`'tail'` = dir −1 = 左回り）。待機中の列車は **今いる駅** `t.at` から発車する。`L.lastDepart[0|1]` は方向ごとの最終発車時刻。
- `dispatchLine`: loop では各方向の待ち合計で方向を選ぶ（`waitingF` 合計 vs `waitingB` 合計）。
- 運転士（`tick` 内）: loop では `target = cycle / active` を方向別ではなく全体で見る。実装は「待機列車があり、前回発車から `target` 以上経っていれば、少ない方の方向へ」。
- `lineCycleEst`: loop は一周（閉じる区間を含む）＋全駅の停車。線形は従来の往復。
- `lineHeadwayS`: loop は `cycle / active`（線形は `cycle / (2·active)`）。
- 急行パターン: loop では終点が無いので全駅を通過候補にできるが、**少なくとも 2 駅は停車**（`canSetSkip` で検査）。`expressNext` の交互は「index 0 を通過するたびにその列車の `run.express` を反転」に変更。
- 方向の列車位置 `trainPos`: `to = (from + dir + n) % n`。
- `networkCache`: loop の路線に `last ↔ first` の辺を追加。`prefix` による `legKm` は、loop では「短い方の弧」の km。`firstLeg.dir` も短い方の弧の向き。`destMap` の `alightI` は従来通り。
- `board`: 変更なし（`boardDist` のキーは `dir` を含むので両方向が別々に積まれる）。
- `coverage`, `computeDemand`, `physicalStations`: 変更なし。
- **一周して戻る乗客**は存在しない（目的地は最短弧で決まる）。

**撤去**: loop の路線には「端」が無いので右クリック撤去は無効。`canRemoveStation`/`removeStation`（中間撤去）を loop でも許し、撤去したら `loop = false` にし、配列を**撤去点が端になるように回転**（`stations`, `waitingF/B`, `left60`, `leaveAcc`, `lastPassF/B`, `skip`、各列車の `at` / `run.from` / `dest` / `destCont` を同じだけ回転）。走行中の列車は撤去駅に向かっていなければ回転後も有効。`clearDeadIncident`, `shiftSurge` を回転に合わせる。

**描画**: `endHandles` は loop の路線に対して空（延ばせない。延ばしたければ開く）。`drawAllLines` / `trunkOffsets` は閉じる線分を含める。`diagram.js` は `Z` で閉じる。列車インスペクタの「〜方面」は loop では「右回り／左回り」と表示。

**実績**: `loop-closed`（都市パックの history 実績として定義）。

**スモーク**: 4 駅で閉環 → 列車が一周して止まらない／両方向に発車する／乗客が最短弧で降りる／中間撤去で線形に戻り列車 index が壊れない／保存往復で `loop` が残る／`lineHeadwayS` が有限。

### 3.4 複数のハブと建設中心（必須）
- `anchor.hub` を複数許す（既に `anchorStation` は `a.hub ? 3 : 1`）。`upgradeCost(tier)` の「生まれつきハブは数えない」はそのまま。
- `buildRadiusNow` / `placementProblem` / `drawDragPreview` の中心: `ANCHORS[0]` → `CITY.anchors[CITY.map.buildCenter]`。
- `canDemolish` / `canRemoveStation` の保護: `anchor === 0` → **どのコリドーにも新規として属さない anchor**（＝`start.built`）は撤去不可。
- `unlock: { anchor: 0 }`（driftcentral）→ パックの catalog 上書きで `unlock: { anchorId: 'nagoya' }` のように id 指定。`unlockMet` は id を index に解決。

### 3.5 チャーター（projects）
- `PROJECT_SEEDS` → `CITY.projects[].seed`（anchor id）。`buy()` は `stationForAnchor` で既存駅を複製（ジャンクション）し、**複製元が tier 1 なら tier 2 に無償で上げる**（市が乗換駅を整備した、という扱い。元ゲームの tier 2 ルールと矛盾させない）。
- `LINE_IDENTITY` → `CITY.lines.identities[projectId]`。`RESERVED` → `CITY.lines.reserved`。`HISTORIC_NAME0` → `CITY.lines.historic`。
- `recolorChoices` の Västerortsbanan 特例は削除（パックが必要なら `lines.recolorException` で表現）。
- `canBuy` の路線数上限チェックは維持。
- `CATALOG` への注入: 起動時に `CITY.projects` を `{ id, base: pk, growth: 1, max: 1, era, currency: 'pk', kind: 'project' }` としてカタログ配列に挿入（表示順は `era` 順）。`maxFleetEver` は projects の数を読む。

### 3.6 途中駅の後年挿入（infill、任意: `rules.infill`。東京で使う）
- `anchor.infill = { between: [a, b] }`。`anchorRevealed`: コリドーの時代が来ていて、`a` と `b` が**同じ路線上で隣接**していれば露出（杭は両駅の間に描く）。
- `insertAnchor(g, li, seg, anchorIdx)`: `insertStation` と同じ配列操作だが、駅は `anchorStation(anchorIdx)`、価格は `insertCost`。`extendTo` 経由ではなく杭クリックで呼ぶ（main.js の杭クリック分岐で `anchor.infill` を見る）。
- コリドー進捗に含める。名古屋では使わない（久屋大通を 1965 から含める: §02 参照）。

### 3.7 直通運転 portal（任意、推奨。名古屋 M2 で導入）
日本の地下鉄の最大の特徴は私鉄・JR との相互直通。「終点の先から人が湧く」をモデル化する。
- `SOURCES` = anchors ＋ districts ＋ **portals（基礎重み 0）** の順に固定（`srcW` の index 互換のため、portals は末尾）。
- portal の有効重み = `g.owned[portal.project] ? portal.demand : 0`。`growCity` は有効重みを上限の基準にする。`REGION_POP` / `coverage` の分母には有効なものだけ入れる（買っていない直通先はカバー率を下げない）。
- カタログ項目: `{ id: portal.id, kind: 'portal', era, base: cost.kr or cost.pk, max: 1, unlock: { anchorId: portal.anchor } }`。買うと `g.events.push({type:'portal', name})`、以後その anchor の需要源が生きる。
- 描画: 終点から地図外側へ短い破線のスタブと私鉄名ラベル（買う前は薄く、買った後は路線色）。
- value-gate に「portal は anchor が建っている状態で収入を増やす」ケースを追加。

### 3.8 文字列と i18n（必須）
- `STR` を `src/i18n/ja.js`（共通 UI）＋ `CITY.strings.ja`（都市固有）のマージにする。英語版は `en.js` ＋ `CITY.strings.en`。表示言語は設定（`locale`）で切替、既定はパックの `locale`。
- 00 §7.5 に列挙した直書き英文を全て STR に移す。**render.js のキャンバス文字も** `render.setStrings({ buildHere, dragThisEnd, rushHour, incident, times })` で受ける。
- `aimText()` の文の組み立ては語順が言語依存なので、`STR.aims.*` をテンプレート関数（`(k) => \`${k.name} まで延伸 · ${k.corridor} ${k.built}/${k.total}\``）にする。同様に `era-needs`, `news-notice-b`, `showAwayNote`, `bonusText`, `unlockText`, 駅パネルの行。
- **声のルール（日本語版）**: 常体で短く。看板語は実物を使う（発車 / 終点 / 信号故障 / ラッシュ / 回送 / 運転見合わせ）。市議会カードは「〜する。〜になる。」の二文。新聞の見出しは当時の新聞調（体言止め）、本文は常体。英語版は元の voice rule（コロン・セミコロン・ダッシュを使わない）を踏襲。
- 日本語の自由駅名: `freeSpotName` のローマ数字を `CITY.strings.ja.freeSpotSuffix = ['', ' 2', ' 3', …]`（半角スペース＋算用数字）にする。英語は従来のローマ数字。
- 最初のリリースは日本語のみ（オーナー決定）。`en.js` は空でよいが、`STR` のマージ構造は最初から作る。
- 自由路線名: `lines.foundedName(n)`（「7号線」）。

### 3.9 セーブ
- `serialize` に `city: CITY.id` を追加。`hydrate` は `s.city` が無い（旧ストックホルム）か別都市なら `hydrateFallback = true, hydrateWrongCity = s.city || 'stockholm'` を立てて新規ゲームを返す。main.js はヒューズ（自動保存停止）を従来通り働かせ、メモに「このセーブは別の都市（〇〇）のものです」と出す。
- `SAVE_KEY` と全 `localStorage` キーの接頭辞 `tunnelbana_` → `metros_<cityId>_`。`VERSION` は `1.0.0` から振り直し（`updates.json` も新規）。
- `saveVersion` は 9 から（8 以下＝旧ゲームのセーブは都市不一致で拒否されるので移行コードは不要。`ERA_GOALS_PRE_014` と `migratedFrom` の分岐は削除してよい）。
- `validStation` の緯度経度範囲は `CITY.map.saveBounds`。

### 3.10 通貨と数値表記（必須。オーナー決定: 万円表示）
- 内部の数値（BAL）は**変えない**。表示だけ `currency.scale` を掛ける。名古屋・東京は `scale: 1000`、単位「円」。例: 開始資金 900 → 「90万円」、駅 1100 → 「110万円」、運賃 6/人km → 「6,000円」（ゲーム的な抽象値で良い。駅や車両の実コストに近づく）。HUD の大きな数字は「90万」＋小さく「円」、収支は「+1.2万/秒」。
- `fmt` の短縮表記（`shortForm: 'wan'`）: 1万未満は桁区切り、以上は「X.X万」「X億」「X兆」（有効 3 桁）。乗客数も同じ関数。英語ロケールでは K/M/B。
- `grouped()` の `sv-SE` → `currency.locale`。
- `numHTML(n, unit)` の unit は STR から。HUD の「kr/s」→「円/秒」（短く「/秒」）。
- 通貨名のツールチップ: 「円（ゲーム内の抽象値。実際の建設費とは無関係）」。

### 3.11 実績
- エンジンの `ACHIEVEMENTS` から**歴史系**（`cat: 'history'` のうち Stockholm の駅・コリドー・チャーターを参照するもの: `full-1950, red-line, blue-line, vasterort, genom-staden, red-complete, blue-complete, charters, era-1964, era-1975, plan-all, whole-map, slutstation, final-era` 等）を抜き、残り（数値系）は **id だけ**を持ち、名前と hint は `STR.ach[id]` から引く。
- パックの `achievements` を結合する。`check(g, h)` の `h` は `{ used: (id) => bool, planDone: (corridorId) => bool, owned: (projectId) => bool, era: () => number, loop: (lineName0) => bool }`。
- `ACH_META` のカテゴリは共通、history の並びはパック順。
- 数は元と同じ 100 以上を目安（共通 ≈ 95 ＋ 都市固有 15〜20）。

### 3.12 路線図（diagram.js）
- `geoToDia` のアフィン定数 → パックの `diagram.unitKm` と `originAnchor` から計算: `x = (lon − lon0) · 111.32 · cos(lat0) / unitKm`, `y = −(lat − lat0) · 111.32 / unitKm`、0.5 単位にスナップ。
- `dia` を持つ anchor が 2 つ以上あれば、`dia` を持つ anchor からの最小二乗アフィンフィットを優先（手書き座標と自動座標の整合）。
- 自動座標は衝突しうる（02 の自動生成表に衝突を記載）。最終的には全アンカーに `dia` を手書きすることを推奨（M2）。

### 3.13 幽霊列車とエッグ
- `silverpilenPos` → `CITY.ghostTrain`（路線は index か `name0` で指定、色、夜のみ。指定した路線が無い間は走らない）。名古屋は黄電（黄色、東山線）、東京は丸ノ内線 300 形の赤。
- `EGGS[].needs` は anchor id の配列（全部建っていれば現れる）。

### 3.14 時代 index 化
- `CATALOG[].era` と `COUNCIL_TIERS[].era`、`BAL.tier3Era` / `incidentEra`、`upgMaxByEra` を**時代 index** で扱う（年ではない）。`eraVisible` は `item.era <= g.era`。パックの `catalog` 上書きで項目ごとの時代を変える。
- `maxLinesNow`: `g.era === CITY.eras.length − 1` でサンドボックス。
- `STR.eras[key]`, CSS `--tb-era-<key>` はパックの `eras[].key`。`ui-moments.css` の時代色は JS が `document.documentElement.style.setProperty` で注入する（CSS を都市ごとに書かない）。

### 3.15 地図（main.js / render.js）
- `maplibregl.Map` の `center/zoom/minZoom/maxZoom/maxBounds` と `homeCamera` → `CITY.map`。
- `render.js` の `FB`, `COS_LAT`, `pxPerKm` のサンプル点 → `render.setGeoFrame(CITY.map.fallback, center)`。
- 夜スタイル `basemap/tunnelbana-night.json` は都市非依存（OpenFreeMap planet）。名前だけ `night.json` に。**日本の地図は OpenFreeMap で十分に描ける**（道路・水・鉄道の層あり）。昼スタイル positron はラベルが日本語で出る（OSM の name）。
- 地図の縮尺（1 unit ≈ 0.9 km の駅間）はストックホルムと同程度なので zoom 値は流用可。東京は範囲が広い（東西 30 km）ので `minZoom 10.0`。

### 3.16 フォント（必須）
- IBM Plex Mono と Libre Caslon は日本語グリフを持たない。方針: **数字・英字は Plex Mono のまま、日本語は OS のフォントにフォールバック**し、`font-family: "IBM Plex Mono", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif` のスタックを CSS と `render.js` の `mono()` の両方に使う（依存ゼロを保つ）。
- 見た目を揃えたい場合（M2）: Noto Sans JP（OFL）を **使用文字でサブセット**して同梱する（`_dev/subset-fonts.mjs`: パックの全文字列＋駅名＋ UI 文字列から文字集合を作り `pyftsubset` で woff2 化、目安 150〜300 KB）。キャンバス描画前に `document.fonts.load()` で待つ。
- 新聞（Libre Caslon のセリフ）: 日本語は明朝（「Hiragino Mincho ProN」「Yu Mincho」「Noto Serif JP」）。

### 3.17 音
- 効果音は合成なので変更不要。「ベル」は日本の発車ベル／発車メロディ風に短い二音のまま（著作物のメロディは使わない）。
- 音楽は TAD の CC0 4 曲を流用可（クレジット維持）。

### 3.18 テレメトリ・フィードバック
- `PULSE_URL`, `FEEDBACK_URL`, `FEEDBACK_TO` → `CITY.credits.feedback`（既定 null）。null のときフィードバックボタン・設定行・pulse を**完全に無効化**（コードは残してよい）。

### 3.19 残す定数の上書き
`CITY.rules.balance` で `BAL` を浅くマージ（起動時）。名古屋は `maxStations: 120` のみ、東京は `stationGrowth`, `maxStations`, `buildRadiusKm`, `fleetPerEra` 等（03 参照）。**上書きした値は value-gate / probe-arc で測る。**

---

## 4. UI 改善提案（「こっちのほうが良くない？」）

優先度: **A** = 日本版の最初のリリースに入れる / **B** = M2 以降 / **C** = 任意。元ゲームの思想（disabled は情報、画面上の数字は sim から、地図は進捗バー）を壊さないものだけ。

| # | 提案 | 理由 | 優先 |
|---|---|---|---|
| 1 | **駅ナンバリングの表示**（H10, M09）: 路線図のラベル、駅パネルの見出し、杭のラベルに小さく。 | 日本の地下鉄の視覚言語。路線記号で「どの線の杭か」が色以外でも分かる（色弱対応にもなる）。 | A |
| 2 | **公式ラインカラー**を歴史路線に使う（02/03 に HEX）。自由路線には公式色と被らないパレット。 | 「東山線は黄色」は名古屋の常識。元ゲームも実在色に寄せている。 | A |
| 3 | **通貨表示を万／億**にし、内部値×1000 を円で表示（§3.10）。 | 「900 円」で駅を建てる違和感を消す。 | A |
| 4 | **線端の取り壊しを駅パネルにも置く**（現状は右クリックのみ）。 | タッチ端末に右クリックが無く、端の駅を壊せない。既に中間駅には「撤去」ボタンがあるので端にも出す。 | A |
| 5 | **時代の進行条件を HUD 上部に 3 本のミニバー**（乗客 / 信頼 / 路線計画）で常時表示し、ショップレールの時代パネルは詳細に。 | 「何が足りないか」が最も多い質問（作者のフィードバック履歴）。レールを畳むと条件が見えなくなる。 | B |
| 6 | **新聞の日付を元号併記**（「昭和32年11月15日」＋西暦）、発行所は架空名（「名古屋日報」「東京新報」）。 | 時代感。実在紙の名前は使わない。 | A |
| 7 | **環状線のインスペクタ表記**「右回り／左回り」と、ネットワークパネルの路線行に「環状」バッジ。 | §3.3 に伴う必須表示。 | A |
| 8 | **直通運転スタブ**（§3.7）: 終点の先に私鉄名の破線。買うと点灯。 | 「地図が進捗バー」の延長。名古屋なら「名鉄豊田線へ」。 | B |
| 9 | **商業アップグレードを「地下街」と呼ぶ**（名古屋）、東京は「駅ナカ」。 | 栄地下街は地下鉄開業と同時に生まれた。元ゲームの retail の意味をそのまま、言葉だけ土地のものに。 | A |
| 10 | **tier の呼称**: 停留所/駅/ハブ → 「駅」「主要駅」「ターミナル」。 | Knutpunkt の訳語。日本語で「ハブ」より通る。 | A |
| 11 | **「次の目標」ストリップの改行許可と、杭名をクリックで地図が飛ぶ**。 | 日本語は英語より長くなりがち。杭が画面外にあるとき探す手間を減らす。 | B |
| 12 | **路線図（DIAGRAM）に駅ナンバリングと路線記号の丸を描く**（日本の路線図様式）。 | 元の「ホームの壁の路線図」のローカライズ。 | B |
| 13 | **ヘルプの最初に 1 画面の「操作一覧」**（線端ドラッグ／杭クリック／右クリック／Space／Esc）。 | 元ゲームのヘルプは長文のみ。日本語化で更に長くなる。 | B |
| 14 | **言語切替（日本語／English）**を設定に。英語版の文字列は後回しでよいが構造は最初から。 | itch の客層は英語圏が多い。 | B |
| 15 | **列車のクリック優先順位**（0.16 で改善済み）を維持しつつ、**駅ラベルのクリック**でも駅パネルを開く。 | 日本語駅名は長く、ラベルの方が丸より大きい。 | C |
| 16 | セーブスロット行に **都市名と路線色のドット** を表示。 | 将来 2 都市を同じドメインで配るとき、別都市のセーブと混同しない（§3.9 と対）。 | C |
| 17 | **金の列車**は名古屋では「ドニチエコきっぷ列車」のような実在物を避け「金のしゃちほこ列車」、東京は「金の電車」。 | 土地の語彙。実在のキャンペーン名は使わない。 | C |
| 18 | **時代到達時に流れる和音**（`eraSting`）はそのまま。ベル音は「発車サイン音」風に少し高め（G5–E5）。 | 日本の駅の発車音の印象。 | C |

元ゲームの作者が既に v0.16 で入れた改善（UI サイズ、コントラスト、ピッカー、クリック優先）は全て保持する。

名港線のような「縞」の路線色（紫地に白）は identity の `stripe` で表し、地図と路線図で細い白の破線を重ねる（[02 §3.1]）。

---

## 5. テストと受け入れ基準

### 5.1 `_dev/smoke-pack.mjs`（新規、現在のパックの不変条件）
1. どのアンカーも水域リング・建設禁止リングの内側に無い。
2. 全アンカーが `buildCenter` から `buildRadiusKm` 以内。
3. `start.built` の順に隣接距離が `minSpacingKm` 以上。全コリドーの隣接 anchor 間距離が 0.35 km 以上（同路線）。
4. 各 anchor が「新規」としてちょうど一つのコリドーか start に属する。経由 anchor はそれ以前に新規として現れる。
5. コリドーの `opensIn` は昇順でなくてよいが、`eras.length` 未満。`project` があるコリドーの project は存在し、`project.era <= corridor.opensIn`。
6. `projects[].seed` の両 anchor が存在し、距離 ≥ 0.35 km。
7. 時代の `pk`, `delivered` が単調増加。最後の時代がサンドボックス。
8. 各時代について、その時代に開くコリドーの `trust` 合計 ＝ その時代の projects の `pk` 合計（元ゲームの規則。例外は明示的に `trustException` で許す）。
9. `lines.identities` の色が `palette` に含まれない。`reserved` ⊆ identities の色。
10. `facts` は各 140 文字以内（トーストが 2 行で収まる）。`eggs[].needs` の id が存在。
11. anchor の `codes` が路線ごとに一意。`id` が一意。
12. `strings.ja` に `STR` が参照する全キーがある（起動時にも console.warn）。

### 5.2 `_dev/smoke.mjs`（共通）
既存のシナリオを「パックの `test` 情報」で書き直す。座標直書きは `CITY.test.*` と `CITY.anchors[...]` 参照へ。追加: 環状線（§3.3）、経由コリドー、複数ハブ、チャーターの tier 2 昇格、都市不一致セーブの拒否、通貨表示（`fmtMoney(900) === '90万円'`）。

### 5.3 `_dev/value-gate.mjs`
`build()` を「start の路線を最初のコリドーの終わりまで建て、`CITY.test.firstProject` を買って 3 駅延ばす」に一般化。portal を導入したらケースを追加。

### 5.4 `_dev/probe-arc.mjs`
変更不要（CORRIDORS 走査が配列化に追随すれば動く）。**受け入れ基準**: 最初の時代の内容が尽きてから次の時代のゲートまでの待ちが 5 分以内、1 時間のプレイでデッドゾーン（買えるものが無い 120 秒超）が 3 回以内（元ゲームが保っていた水準）。

### 5.5 手動チェックリスト（リリース前）
- 日本語フォントで駅名・パネル・新聞・路線図が崩れない（Windows / macOS / iOS）。
- 杭のラベルが重ならない（都心の密集部）。重なる場合はズーム閾値でラベルを間引く（render の `label` に `minZoom`）。
- 右クリック相当の操作がタッチで可能（提案 4）。
- `node _dev/probe-console.mjs` でコンソール例外ゼロ。
- About のクレジット: MIT、based on Tunnelbana、OpenStreetMap、OpenFreeMap、MapLibre、フォント、音楽。

---

## 6. 名前・言葉の決め事（オーナー判断が必要なもの）

| 項目 | 提案 | 備考 |
|---|---|---|
| ゲーム名 | **「Japan Metros」**（決定 2026-10-20）。都市版の表記は「Japan Metros · 名古屋」、副題「地下鉄をつくる」 | 「Tunnelbana」は使えない。itch.io・アプリストアに同名の作品は見当たらなかった（2026-10-20 の検索）。HTML の `<title>` は「Japan Metros · 名古屋」、`gameTitle.ja` は「Japan Metros」、`gameTitle.en` も同じ |
| 発車ボタン | 「発車」（副題「列車を出す」） | AVGÅNG の訳。Space キーも維持 |
| エンディングの語 | 「終点」 | SLUTSTATION の訳。新聞の最終号の見出しにも |
| 信号故障 | 「信号故障」 | SIGNALFEL。実際の案内は「信号トラブル」もあるが短い方 |
| 信頼 | 「信頼」（議会の信頼） | trust |
| ハブ | 「ターミナル」 | tier 3 |
| 市議会 | 「市議会」（名古屋・東京とも） | council。東京は都議会 |
| コリドー | 「計画区間」 | corridor。「〇〇線 北区間 3/7」 |
| 杭 | 「予定駅」 | stake。「次の予定駅: 新栄町」 |
| 自由駅 | 「独自駅」 | free spot |
| 乗客 | 「乗客」、輸送人員は「延べ乗客数」 | riders delivered |
| 街のメモ | 「街の便り」 | city notes |
| 金の列車 | 「金の列車」 | gold train |

### 6.1 ロゴ（決定: 円環と黄色の横線）
名城線の環（紫の輪）を東山線の黄色い横線が貫く記号。実際の路線図でも東山線は栄で環に入り本山で出るので、輪と線の交点に置いた 2 つの白い点は実在の乗換駅（栄・本山）に当たる。元ゲームのロゴ（トンネルのアーチと一本の緑の線）と同じく「一つの記号に都市の形を込める」。交通局のマークや駅ナンバリングの意匠は使わない。

- ファイル: [`docs/logo/mark.svg`](logo/mark.svg)（48 × 48 の viewBox、favicon と HUD 兼用）、[`docs/logo/mark-mono.svg`](logo/mark-mono.svg)（単色 `currentColor`、輪を線の通る位置で切ってある）、[`docs/logo/wordmark.svg`](logo/wordmark.svg)（横組みロックアップ）、[`docs/logo/preview.html`](logo/preview.html)（ダーク／ライト、16〜160 px の見え方）。
- 幾何（viewBox 48）: 輪は中心 (24, 26) 半径 14 線幅 6、横線は x 1〜47 高さ 7 角丸 3.5 で輪の**上**に描く、点は交点 (10.5, 26) と (37.5, 26) に半径 3 の白。
- 色: 輪 `#B074D6`（名城線 DIC 106）、線 `#FAB123`（東山線 DIC 2534）、点は常に白（ダーク／ライトどちらの背景でも読める）。
- 使う場所: `favicon.svg`（そのまま差し替え）、`index.html` のブランド（34 px、右に「JAPAN METROS」IBM Plex Mono 600・字間 3px、下に「名古屋 · 地下鉄をつくる · v…」）、メニューの見出し、`og.jpg`（1200 × 630、ダーク背景に 240 px のマークとワードマーク、下に夜の名古屋の路線網のスクリーンショット）、itch のカバー（630 × 500）。
- 東京版: 同じ記号で色を銀座線のオレンジ（線）と大江戸線のマゼンタ（輪）に置き換える案。大江戸線は 6 の字なので輪の右上を少し開けてもよい。シリーズとしては「輪＋線」の形が共通言語。
- 単色版は 16 px でも輪と線が分離して読める。カラー版の 16 px では点が潰れるので、favicon は点なしの簡略版を `<svg>` の `media`/サイズで出し分けてもよい（任意）。

---

## 7. マイルストーン

| M | 内容 | 完了条件 |
|---|---|---|
| **M0 パック化** | §3.1, 3.2, 3.4, 3.5, 3.8, 3.9, 3.10, 3.14, 3.15, 3.16（フォールバック）。stockholm パックで既存 smoke / value-gate が緑。名古屋パックのデータ投入（02 の表）。日本語 UI。 | 名古屋で 1957→1965 まで通しで遊べる。`smoke-pack` 緑。 |
| **M1 環状線** | §3.3、名城線の環状化、インスペクタ表示、路線図の閉環。 | 2004 の環状完成が遊べ、smoke の loop シナリオ緑。 |
| **M2 土地の味** | §3.7 直通運転、§3.12 手書き dia、§3.13 幽霊列車（黄電）、§3.16 サブセットフォント、UI 提案 5/8/11/12/13。 | 全エッグ・全豆知識・全新聞が入る。 |
| **M3 計測と調整** | probe-arc / value-gate / probe-costs で時代ゲートと `rules.balance` を調整。実績 100 件以上。 | §5.4 の受け入れ基準。 |
| **M4 東京** | 03 のパック投入、§3.6 infill、7 時代、経済上書き、`index.template.html` とビルド。 | 東京で 1927→2008 通し。 |

---

## 8. 実装者向けの注意（元ゲームの流儀）
- 変更には理由をコメントで残す（元コードの「owner ruling YYYY-MM-DD」の文化）。この文書の節番号を引用してよい（例: `// spec 01 §3.3`）。
- `sim.js` に DOM を入れない。`render.js` は sim を書かない。
- 新しい配列フィールドを路線に足したら、`extendTo` / `demolish` / `insertStation` / `removeStation` / 回転（loop）の**全て**で同じ操作をする（元コードが何度も踏んだバグ）。
- セーブに新フィールドを足したら、`serialize` と `hydrate` と smoke の往復テストに同時に入れる。
- 数値を変えたら `node _dev/value-gate.mjs` と `node _dev/probe-arc.mjs 3600 quiet` を回し、結果をコミットメッセージか `_dev/` のコメントに残す。
