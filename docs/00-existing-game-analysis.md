# 00 · 既存ゲーム「Tunnelbana · Build Stockholm」の分析

対象: このリポジトリの fork 元 [MMacLaine/tunnelbana](https://github.com/MMacLaine/tunnelbana)（v0.16.1、MIT ライセンス）。
目的: 東京／名古屋版を作るために「何がゲームの本体で、何がストックホルム固有なのか」を切り分ける。
読者: 仕様書（01〜03）を読む人、および実装を担当する AI／開発者。

関連文書: [01 エンジン共通化と日本版共通仕様](01-spec-engine-city-pack.md) ／ [02 名古屋パック](02-spec-nagoya-pack.md) ／ [03 東京パック](03-spec-tokyo-pack.md)

---

## 1. ゲームの要約

- **ジャンル**: 地図の上で地下鉄網を育てる「有限のインクリメンタル（放置）ゲーム」。ブラウザで動く静的サイト（依存ライブラリは地図描画の MapLibre GL のみ、vendor 同梱）。
- **舞台**: ストックホルム地下鉄。1950 年の最初のトンネル（Slussen–Hökarängen）から始め、5 つの「時代」（1950 / 1952 / 1957 / 1964 / 1975）を経て、2000 年の「サンドボックス」で制約が外れる。
- **コンセプト**: 「地図そのものが進捗バー」。街は暗いベールに覆われており、駅を建てた周囲だけが明るくなる。地図が小さく・醜くなる操作は存在しない。
- **終わりがある**: 最終時代に到達し、用意された全駅（59 駅）を接続するとエンディング（「SLUTSTATION」= 終点）。ただし列車は走り続ける。プレステージ（リセット）無し、ゲームオーバー無し。
- **放置と能動の両立**: 運転士を雇うと自動運行になり、オフライン収入が入る。しかし建設は手動で、約 20 時間（作者測定ではもっと短い）の能動プレイが設計上の弧。
- **三つの資源**:
  1. **お金（kr）**: 運賃で得て、建設・列車・アップグレードに使う。
  2. **信頼（trust、内部名 pk = political capital）**: 「地域カバー率」に比例して少しずつ貯まる。買えない。時代の進行、路線の新設（チャーター）、ハブ化、市議会の決定に使う。上限は「次の時代が要求する量の 2 倍」。
  3. **輸送人員（riders delivered）**: 累計。時代進行の条件。

## 2. コアループ

```
ベルを鳴らす（発車）→ 運賃が入る → 路線の端を引っ張って延伸（杭=次の実在駅へ）
→ 2 本目の列車 → 運転士（自動運行）→ 駅のアップグレード（出入口／改札／商業）
→ 路線計画（コリドー）を完成 → 信頼と乗客数が溜まる → 時代を進める
→ 新しい路線のチャーター（信頼で購入）→ 新コリドーの杭が地図に現れる → 繰り返し
→ 2000 年: 路線数・建設範囲の制約が解除 → 全駅接続でエンディング
```

時代の進行条件は 3 つ: (a) 累計乗客数、(b) 信頼、(c) **その時代までに開いた全コリドーが現在完成していること**（取り壊すと「要修復」として再び塞ぐ）。

## 3. アーキテクチャ

| ファイル | 行数 | 役割 |
|---|---|---|
| `src/sim.js` | 4650 | シミュレーション全体。DOM 非依存・決定論的。Node でそのまま走る（テストが import する）。 |
| `src/render.js` | 1273 | Canvas 描画（路線、列車、駅、ベール、杭、イースターエッグ、金の列車、事故マーカー）。sim を読むだけ、書かない。 |
| `src/main.js` | 3744 | DOM・入力・メニュー・ショップ・パネル・セーブ・地図（MapLibre）初期化。ブラウザに触る唯一のファイル。 |
| `src/data.js` | 307 | **ストックホルムのデータ**: 59 駅アンカー、コリドー、水域、人口密度ブロブ、幾何ユーティリティ。 |
| `src/facts.js` | 86 | **ストックホルムの豆知識 35 件、イースターエッグ 6 件、通勤客の名前 40 件。** |
| `src/diagram.js` | 137 | 路線図（ホーム壁の路線図風 SVG）。 |
| `src/sound.js` | 204 | 合成効果音（ベル、実績、時代、運賃、事故）＋ CC0 音楽 4 曲の再生。 |
| `index.html` | 1066 | HUD、メニュー、ヘルプ、About、設定、アイコン template。 |
| `tokens*.css`, `ui*.css` | — | デザイントークンと UI。時代ごとの色トークン（`--tb-era-1950` …）。 |
| `basemap/tunnelbana-night.json` | — | MapLibre の夜用スタイル（OpenFreeMap のベクタタイル。ラベル層なし＝都市非依存）。 |
| `_dev/` | — | `smoke.mjs`（シナリオ回帰テスト 1784 行）、`value-gate.mjs`（全購入の価値検証）、`probe-*.mjs`（ペーシング・コスト等の計測）、`serve.mjs`、`build-itch.mjs`、`deploy-to-site.mjs`、`shoot*.mjs`（スクリーンショット）。 |
| `updates.json` | — | ゲーム内更新履歴（incrementaldb.com のフィードも兼ねる）。 |

設計ルール（README より、すべて「バグで学んだ」もの）:

- ランタイム依存ゼロ（MapLibre のみ vendor 同梱）。
- **sim が真実を持ち、renderer はピクセルを持つ**。画面上の数は全て sim 状態から読む。
- **集計フロー、エージェントなし**。乗客は駅間を動く「量」。59 駅でも 3 駅でもフレーム負荷はほぼ同じ。
- エンティティのコンストラクタは一つ（`sim.addTrain()` 等）。テストはリテラルで作らない（lint で検出）。
- **全ての購入は測定可能に収益を上げること**（`value-gate.mjs` が検証、1% 未満は THIN と警告）。
- バランス変更は議論ではなく計測（`probe-*.mjs` と結果コメントが残る）。

### 3.1 データの流れ

- `main.js` が `sim.tick(g, 0.05)` を固定ステップで回し、`g.events` に積まれたイベント（payout / extend / era / achievement / …）を読んでフロート文字・トースト・新聞を出す。
- 描画は MapLibre の custom layer 内で `render.draw(g)` を呼び、2D キャンバスをテクスチャとして GL フレームに載せる（別キャンバスだと「パン中に駅が泳ぐ」ため）。
- セーブ: `localStorage`、`TBSAVE1:<crc32>:<json>` 形式、5 秒ごと＋タブ非表示時。3 スロット、3 世代バックアップ、エクスポート（.tbsave）／インポート。`saveVersion` 8。マイグレーションは前方のみ。壊れたセーブは「触らずに自動保存を止める」。

## 4. シミュレーション詳細（sim.js）

### 4.1 需要（demand）

- **需要源（SOURCES）** = 全アンカー（重み 1、ハブは 1.5、到達 0.6 km）＋ 人口密度ブロブ `DISTRICTS`（重み w、半径 rKm）。
- 各物理駅は、半径内の需要源から「集客力 catchment（tier と出入口 ent で増える）× 距離減衰」に応じた**分配**を受ける。分配の合計は源の予算を超えない（`CLAIM_SOFTNESS` で未分配分=徒歩・車が残る）。駅の `mult`（需要倍率）はここから算出され、保存されない（ロード時に再計算）。
- **街の成長（growCity）**: サービスされ混雑していない源は、人口が上限（×2.5、市議会で +20%）まで時定数 240 秒で成長する。「ABC 都市」のループ。
- **アクセシビリティ（accF）**: 駅からの一般化所要時間で届く先の需要質量が多いほど、その駅の発生トリップが増える（0.35〜2.0 倍）。環状やジャンクションが「触れていない駅の収入も上げる」仕組み。

### 4.2 経路選択とネットワーク

- 物理駅（アンカー index または geo 文字列でキー）を頂点にしたグラフ。路線内の隣接駅間は走行時間、同じ物理駅上の別路線エントリ間は乗換コスト `transferPenalty / transfer倍率`。
- 各起点からダイクストラ。目的地の重みは重力モデル（`mult / (km + 乗換回数 × transferKmEq)^1.4`）。朝ピークはハブ向き、夕ピークはハブ発を強める。
- ネットワーク構造が変わると再計算（キャッシュ）。需要倍率の変化は 5 秒おきに variants を更新。
- 乗換客は乗換駅で降り、その駅の他路線の待ち行列に（その駅の分布で）再投入される（近似として明記）。

### 4.3 乗客の発生と行列

- 駅ごと毎秒 `spawnPerSec(1.6) × mult × 需要ボーナス × 時間帯係数 × 方向別シェア × accF`。
- **一日 240 秒**: 朝ラッシュ（1.4 倍、ハブ向き）/ 昼 / 夕ラッシュ（1.3 倍）/ 夜（0.35 倍、夜間運行で 2 倍）。時計表示は 06:00 起点。
- 駅の待ち上限 `stationCapBase(80) × mult`。混雑率 25% 超から二乗で離脱（abandon）。離脱者は「見捨てられた」として記録され、ラッシュの採点の分母になる。
- **サージ**: 120 秒ごとに 1 駅が 25 秒間 3 倍スポーン・1.5 倍運賃。**ラッシュ採点**: 各ピークの「運んだ／(運んだ＋見捨てた)」で A〜E、A/B は少量の信頼。

### 4.4 列車

- 列車は `{id, name, line, at, run, mothballed, readyAt}`。走行は加速 0.04 km/s²・巡航 0.12 km/s（車両アップグレードで速く）。短い区間は巡航に届かない=実駅間隔が自然にコストになる。
- 停車（dwell）= 固定時間（tier で短縮）＋ 乗車人数 ÷ 改札速度（gates で向上）。
- 発車は**終点からのみ**（head/tail）。ベル（手動）か運転士（自動、最低ヘッドウェイ 8 秒、時刻表購入で等間隔）。折返し 2.5 秒。ATC 購入で団子運転抑制。
- 運賃は**乗車時に人キロで支払われる**（6 kr/人km）。降車は終点で一掃。
- 急行パターン（Trafikledning 購入後）: 駅ごとに「急行通過」を設定、各駅/急行が交互発車。
- 維持費: 列車ごと 1.2 kr/s だが、**稼働台数が「無料枠（4 + 2×時代）」を超えると対数で割増**。赤字が 20 秒続くと自動で 1 両を休車（mothball、維持費 20%）。駅も tier とアップグレード段数で維持費。
- 車庫（depot）購入で夜間の維持費減、運行司令所（driftcentral）で全体 30% 減。
- 列車の配置: 「路線ごとの目標台数」を設定でき、停車中の列車が自動で移る（移動手数料 100 kr）。目標未設定なら最も少ない路線へ。
- **列車インスペクタ**（0.15）: 列車をクリックすると状態・乗車率・降車予定（マニフェスト）・改名・送り先・休車が見える。

### 4.5 建設ルール

- **アンカー（実在駅）**: `ANCHORS[]`。コリドーに沿って**次の 1 駅だけ**が「杭（stake）」として地図に現れる（one-ahead reveal）。杭に線端をドラッグ（または杭クリック）で建設。杭は所属路線の色で描かれ、前駅からの破線で結ばれる。
- **コリドー（CORRIDORS）**: `ANCHORS` の連続 index 範囲 `[start, end)` と「開く時代」`opensIn`。時代が来るとコリドーの最初の杭が出る。完成すると一度だけ `trust` が付与される（時代ごとの合計 = その時代のチャーター価格）。**その時代までに開いた全コリドーが完成しないと次の時代へ進めない**（プランゲート）。最初のコリドー完成まで自由建設は不可。
- **自由駅（free spot）**: 1950 線完成後、任意の地点に建設可。需要は `densityAt` でブロブから決まり、名前は地区名＋ローマ数字（Södermalm II）。地図上は灰色の丸。
- **コスト**: 駅 = `1100 × 1.32^(その路線の駅数−2) × 建設割引`（**路線ごとに指数が伸びる**、新路線は安く始まる）。線路 = 520 kr/km、**水域横断で 2 倍**（市議会で 45% 減）。最小駅間 0.35 km（同一路線）。**建設半径 13 km**（T-Centralen 中心、Regionplanen で +4/+4 km）。駅数上限 90。
- **ジャンクション**: 他路線の tier 2 以上の駅に線端を落とすと共有（物理的に同じ駅、線路代のみ）。tier 1 だと「tier 2 が必要」と拒否。
- **中間挿入**: 線分の中点にゴースト駅（＋）、クリックで駅のみの価格で挿入（自由駅扱い）。**中間駅の撤去**もパネルから可（150 kr）。
- **取り壊し**: 線端を右クリック（150 kr）。2 駅以下の路線は路線ごと消える（列車は他路線へ無料で）。T-Centralen（anchor 0）は絶対に壊せない。
- **路線の新設**: tier 3（Knutpunkt/ハブ）の駅から「Found a new line」（2500 kr + 3 信頼）。サンドボックス前は 6 路線まで（色パレット数）、以後 16。
- **チャーター（メガプロジェクト）**: ショップの `westline / redline / blueline` を信頼で購入すると、所定の 2 駅で路線が生まれ、列車が 1 両付く。`PROJECT_SEEDS` が [from, to] の anchor index を返す（red は孤立した 2 駅で生まれる＝歴史通り「分断された開業」）。
- **路線の名前と色**: 歴史的路線（Gröna/Röda/Blå）は色固定、自由路線は改名・色変更可。駅名は自由駅のみ改名可（実在駅は実名を守る、README のルール）。

### 4.6 時代（ERAS）とカタログ

```js
ERAS = [ {year:1950}, {1952, pk:5, delivered:20000}, {1957, 12, 80000},
         {1964, 25, 230000}, {1975, 50, 440000}, {2000, 90, 780000} ]
```

- 各時代は「1 本の実在路線の物語」。1952 西線、1957 中心貫通（ハブ tier 3 解禁、信号故障イベント開始）、1964 赤線、1975 青線、2000 サンドボックス（「Hela Stockholm」）。
- 時代は年号で表示され、ショップのアイテムは `era: 1957` のように**年で**ゲートされる（`eraVisible` は `item.era <= eraYear(g)`）。
- **CATALOG**（28 項目）: 列車、運転士、時刻表、増結、台車整備、改札、統計室、パターン運行、Regionplanen、エスカレーター、ホーム延長、車庫、運行司令所、駅係員、広告、工務部（一括アップグレード）、3 つのチャーター、追加出入口、直通運転（through）、1957 車両・C4・C14 車両、ゾーン運賃、ATC、駅の芸術、CBTC、夜間運行。効果は全て**名前付きモディファイア**（`mult.speed`, `add.demand` …）として合成される。
- **市議会（COUNCIL）**: 信頼で買う永久の「決定」8 件、4 ティア（時代 1〜4 で開く）。郊外補助、工事許可、水域工事、保守契約、再開発、乗換一体化、自動運転、車両量産。
- **実績（ACHIEVEMENTS）**: 117 件、8 カテゴリ（history / building / riders / money / trust / service / night / endgame）。効果は小さく（全体で ×1.3 程度）、多くは認定のみ。history 系は Stockholm 固有（Hökarängen 到達、Fruängen、Hjulsta、Järvafältet …）。
- **駅のアップグレード**: tier 1→2（1500 kr）→3（6000 kr + 信頼 8×1.7^既存ハブ数、1957 以降）。3 軸（出入口 ent / 改札 gates / 商業 shop）各 8 段、tier と時代で上限（`upgMaxByTier`, `upgMaxByEra`）。商業は「運賃に依らない家賃」。

### 4.7 その他のシステム

- **信号故障（incident）**: 1957 以降、240 秒おきに 1 駅が 45 秒乗車停止。修理クルーは「粗収入 25 秒分（最低 400 kr）」。
- **金の列車（gold train）**: 420 秒おきに 1 路線を 20 秒で走り抜ける。クリックで信頼 +1 か運賃 2 倍 60 秒（交互）。
- **イースターエッグ（EGGS）**: 近隣が建つと現れる紫のひし形。クリックで豆知識＋実績。「Silverpilen」は夜に緑線を走る銀色の幽霊列車（render 側で位置を決める）。
- **街のメモ（city notes）**: 120 秒おきに「豆知識」と「通勤客の絵葉書（実際の経路から生成、名前は NAMES から）」を交互にトースト。設定で記録を読み返せる。
- **新聞（era front page）**: 時代が進むと一面記事が出る。見出し・日付・リード文・「次に動くもの」が時代ごとにデータ化（`ERA_NEWS`）。数字（乗客数・駅数・総収入）はプレイヤーの実データ。エンディングも同じ型（SLUTSTATION）。
- **路線図（diagram）**: 時代 1 を越えると地図の隅に「DIAGRAM」トグル。アンカーの手書き `dia[x,y]`（グリッド座標）を使って描く。自由駅はアフィン変換で近似。
- **統計室**: 乗客/分と kr/s の 2 時間分グラフ、路線別台帳、記録。
- **オフライン**: 直近 60 秒の実測レートを割引 0.7 で最大 8 時間分、閉形式で加算（運転士が必要）。
- **アクセシビリティ**（0.16）: UI サイズ 3 段階（キャンバスのラベル・当たり判定も拡大）、文字コントラスト、ダーク／ライトテーマ、数値の短縮表記。
- **コーチ**: 最初の 2 分の手取り（ベルが光る→線端に「ここを引っ張る」→ 2 両目のカードが光る）、チャーター後のコーチ、「次の目標」ストリップ（`aimText()` が sim 状態から文を組み立てる）。

## 5. UI の構成（index.html / main.js）

- **左上**: ブランド、所持金と収支（運賃 / 維持費 / 家賃 / 純）、乗客数（累計と /分）、駅数・路線数、街の規模、列車（待機/稼働/休車）、信頼バー（x.x / 上限、+/分）、カバー率と時計、ラッシュ採点チップ、休車/復帰ボタン、車庫バー。
- **右のレール（shop rail）**: ショップ（カテゴリ別カード、×1/×10/MAX）、時代パネル（「1952 へ進む · 5 trust」ボタンと必要条件の文）。折り畳み可。
- **ネットワークパネル**: 路線ごとに色チップ・名前（クリックで地図が飛ぶ）・改名・運転間隔・稼働台数・目標台数（−/数/+）・移動待ちチップ、工務部の一括発注。
- **駅パネル**: 需要・待ち・混雑・維持費・主な行き先、tier アップ/ダウン、3 軸のアップグレード、路線新設、チャーター、急行通過、修理、中間駅撤去、見捨てられ人数。
- **列車パネル**（インスペクタ）。
- **ベル**（AVGÅNG）: 大きなボタン、Space キー。
- **目標ストリップ**、**実績トースト**、**街のメモ トースト**、**away レポート**。
- **オーバーレイ**: 市議会（カードとワイヤ）、統計室。ドラッグ移動・リサイズ・位置記憶。
- **メニュー**: 続ける / 設定 / 遊び方 / 実績 / About / 更新履歴 / セーブスロット / 記録（メモ・マイルストーン）。音楽の曲送り。
- **地図操作**: 線端ドラッグ、杭クリック（複数候補ならピッカー）、右クリック取り壊し、駅クリック（中心核が優先）、列車クリック、中間ゴースト、エッグ、金の列車。タッチは pointer events で動くが右クリックに相当する操作が無い。
- **テーマ**: 夜（自作スタイル、ラベル無し）／昼（OpenFreeMap positron、ラベルあり）。

## 6. テストと計測ハーネス（_dev/）

- `smoke.mjs`: 約 70 のシナリオブロック。水域にアンカーが無いこと、配置ルール、one-ahead reveal、プランゲート、ラッシュ採点、ジャンクション、保存往復、最大編成、路線撤去、インスペクタ、`trunkOffsets` …。**ストックホルムの座標や anchor index（3, 5, 13, 27 …）が直書き**。
- `value-gate.mjs`: 各カタログ項目を「効くべき条件」で買い、収入が増えるかを測る。`WEST_FIRST` と `westline` でシナリオを組む。
- `probe-arc.mjs`: 「有能な通常プレイヤー」ボットが 20 分〜数時間プレイし、購入間隔・デッドゾーン・時代到達時刻を報告する。コリドーを順に建てる（汎用）。
- `probe-costs.mjs`, `probe-campaign-pacing.mjs`, `probe-timetable.mjs`, `probe-swim.mjs`（描画同期）, `probe-pan.mjs`, `probe-console.mjs`（Playwright でコンソール例外を監視）, `shoot*.mjs`（スクリーンショット）。
- 実行: `node _dev/smoke.mjs`、`node _dev/value-gate.mjs`。

## 7. 都市固有要素の棚卸し（移植で触る場所）

「★」= データとして丸ごと差し替える。「△」= 文字列／定数を差し替える。「◇」= 構造の変更が必要。

### 7.1 `src/data.js` ★
- `LINE`（最初の路線の色・開業年）、`START_BUILT`（3）、`ANCHORS`（59 駅: name / geo / dia / hub）、`WEST_FIRST`、`CORRIDORS`（7、index 範囲＋ tease の座標とスウェーデン語ラベル）、`WATER`（13 の矩形帯）、`DISTRICTS`（32 ブロブ）。
- 汎用: `densityAt`, `kmBetween`, `inRing`, `crossesWater`（→ `src/geo.js` へ分離可能）。

### 7.2 `src/facts.js` ★
- `FACTS` 35 件、`EGGS` 6 件（`needs` が anchor index を直書き: 55/56, 17/18, 0/1, 9, 38）、`NAMES` 40 件。Silverpilen は render 側で「夜に line 0 を走る」特別扱い。

### 7.3 `src/sim.js`
- △ `BAL.tier3Era: 1957`, `BAL.incidentEra: 1957`, `BAL.buildRadiusKm: 13`, `BAL.maxStations: 90`, `BAL.stationGrowth: 1.32`（都市規模で再調整）。
- ★ `ERAS`（年・ゲート値）、`ERA_GOALS_PRE_014`（移行用、新都市では不要）。
- ◇ `ACHIEVEMENTS`: 名前がスウェーデン語／英語、history 系は anchor index（13, 35, 52, 0）や `planDone['green-west']` 等の id を直書き。汎用（数値系）と都市固有（history）を分離する必要。
- ★ `CATALOG`: `era` が西暦年、`westline/redline/blueline` の id、`unlock: { anchor: 0 }`（driftcentral はハブが建っていること）。
- △ `COUNCIL_TIERS`（時代 index）、`COUNCIL`（英文）。
- △ `LINE_COLORS`（パレット）、`LINE_IDENTITY`（チャーター→路線名と色）、`RESERVED`、`HISTORIC_NAME0`（色を変えられない路線名）、`newLine()` の既定名 `'Gröna linjen' / 'Linje N'`、`givenLineName`、`foundedColor`、`recolorChoices`（Västerortsbanan の特例）。
- ★ `PROJECT_SEEDS`（チャーターの起点・終点 anchor index、`CORRIDORS.find(id)`）。
- △ `canDemolish` / `canRemoveStation`: `anchor === 0` を保護。`buildRadiusNow` / `placementProblem`: `ANCHORS[0].geo` を中心に半径を測る。`upgradeCost`: 生まれつきハブ（`ANCHORS[i].hub`）を数えない。
- △ `validStation`: 緯度 59.0–59.6、経度 17.5–18.6 の範囲チェック（セーブの検証）。
- △ `freeSpotName` / `givenStationName`: 地区名＋ローマ数字。`cleanName` 40 文字上限（日本語は OK）。
- △ `SAVE_KEY 'tunnelbana_save'`, `VERSION`。`serialize` に都市 id が無い（別都市のセーブを読んでしまう危険 → 追加必要）。
- △ `HUB_MULT`, `REGION_POP`（アンカー数に依存、自動）。
- ◇ 路線は常に線形（head/tail、`extendTo` は自路線上のアンカーを拒否）。**環状線は作れない**。コリドーは連続 index 範囲のみで、既存アンカーを「経由」できない。

### 7.4 `src/render.js`
- △ `FB`（フォールバック投影の緯度経度範囲）、`COS_LAT`（59.29°）、`pxPerKm()` のサンプル点 `[59.29, 18.08]`。
- △ キャンバス直書きのラベル: `'Build here'`, `'Drag this end to the pulsing ring'`, `'RUSH HOUR'`, `'SIGNALFEL'`, `'×' + denom`。
- △ `silverpilenPos`（line 0 を夜に走る幽霊列車）、`drawDepots`（各路線の head に車庫の絵）。
- 色テーマ（THEMES）は都市非依存。

### 7.5 `src/main.js`
- ★ `STR`（約 300 の UI 文字列、スウェーデン語の看板語 AVGÅNG / SLUTSTATION / SIGNALFEL / Knutpunkt / Rulltrappor … を含む）、`STR.shop`（28 カードの名前と説明、BAL から数値を補間）、`STR.eras`、`STR.ending`。
- ★ `ERA_NEWS`（新聞 6 紙）、`newsMotif`。
- △ `PROJECT_OF_CORRIDOR`（コリドー id → チャーター id）。
- △ 地図: `center: [18.0640, 59.3230]`, `zoom 12`, `minZoom 10.3`, `maxZoom 14.5`, `maxBounds`, `NIGHT_STYLE`, `LIGHT_STYLE`、`homeCamera()`。
- △ 数値: `toLocaleString('sv-SE')`（千区切り）、`kr()`、`numHTML(n, ' kr')`、`SUFFIX K/M/B`。
- △ `localStorage` のキー `tunnelbana_*`（slot, save, bak, theme, ui_scale, contrast, numfmt, rail, status, pulse, vol, notes, factidx, note_history, milestone_history, aims, charter_coached, warns, float_*）。
- △ `FEEDBACK_TO`, `FEEDBACK_URL`, `PULSE_URL`（作者のサーバー。fork では無効化か差し替え必須）。
- △ 直書きの英文: `'Left behind: '`, `'BUILD WITH'`, ピッカーのツールチップ, チャーターコーチ文, `'CITY NOTES'`, `'City note 01'`, `'Odd corner'`, `'Keep building and looking around Stockholm.'`, `'Journeys'`, `'Opening day'`, `'Hela Stockholm'`, `'Era ' + year`（記録の正規表現 `/^Era (1952|…)$/`）、`SLOT_ERA_WORD`, `relTime`, `'Extra large' / 'Large' / 'Standard' / 'High' / 'Default'`, `'automatic, local · persistent'`, `ICON_KEY`, `SHOP_META.cat`（Fleet / Staff …）, `bonusText` の `' train slots'`, `'ACHIEVEMENT'` 等。
- △ `renderSlots` の `STR.slotName 'Stockholm'`。

### 7.6 `src/diagram.js` △
- `geoToDia` のアフィン定数（T-Centralen 起点、×68.5 / ×161.7）。アンカーに `dia` が無い都市では自動フィットが必要。

### 7.7 `index.html` ★
- `<title>`、meta description / og / twitter / canonical（maclaine.se）、`Loading Stockholm…`、ブランドロゴ（アーチの SVG）と `TUNNELBANA / Build Stockholm`、HUD のラベル（`kr`, `fares`, `upkeep`, `riders carried` …）、メニュー文、**遊び方（HOW TO PLAY）の長文**、About（クレジット）、設定ラベル、`lang="en"` 相当、フォント（IBM Plex Mono / Libre Caslon: **日本語グリフ無し**）、CSS のキャッシュバスター `?v=`。

### 7.8 CSS △
- `ui-moments.css`: `--tb-era-1950 … --tb-era-2000`（時代色）。`tokens.css`: `--tb-net-green/red/blue/commuter/tram/future`（路線色の語彙）。フォントファミリ。

### 7.9 `_dev/` ◇
- `smoke.mjs`: ストックホルム座標・index・駅名を前提にした断言が大量。
- `value-gate.mjs`: `WEST_FIRST`, `westline` を前提。
- `probe-arc.mjs` 等は `CORRIDORS` 走査で汎用的だが、`ANCHORS[0]` 等の前提あり。
- `build-itch.mjs`（zip 名 tunnelbana.zip、`incrementaldb.txt` 同梱）、`deploy-to-site.mjs`（作者のローカルパス）、`shoot*.mjs`（URL）。

### 7.10 その他
- `README.md`、`updates.json`（更新履歴）、`incrementaldb.txt`（作者の所有証明、**削除すべき**）、`og.jpg`、`favicon.svg`、`v0.16-plan.md`、`audio/`（CC0、流用可）、`fonts/`（OFL、流用可だが日本語フォント追加が必要）。
- ライセンス: コードは MIT。**名前「Tunnelbana · Build Stockholm」、ロゴ、アートワークは対象外**（新しい名前が必要）。「based on Tunnelbana by Matthew MacLaine」のクレジットが望まれている。

## 8. 強みと、移植にあたっての注意

**残すべき強み**
- 「一つの時代 = 一本の実在路線の物語」「次の杭だけ見せる」「プランゲート」の三点セットが、学習曲線と歴史の追体験を同時に作っている。
- 需要・経路・アクセシビリティのモデルは環状線やジャンクションが本当に「効く」。名古屋の環状化や東京の乗換網と相性が良い。
- 価値ゲート／ペーシング計測の文化。数値を変えたら必ず `_dev` で測る。

**構造的な制約（日本版で問題になるもの）**
1. 路線は線形のみ。名城線（環状）と大江戸線（6 の字）が表現できない。
2. コリドーは連続 index 範囲で、既存駅の「経由」ができない。日本の地下鉄は既存駅を貫いて延びる区間が多い（桜通線が久屋大通・今池・御器所・新瑞橋を通る等）。
3. ハブは `ANCHORS[0]` 一つ（開始駅・建設半径の中心・撤去保護・チャーター起点）を兼ねる。東京には「全路線が集まる駅」は無い。
4. 途中駅の後年開業（東京: 溜池山王 1997、西新宿 1996、妙典 2000、虎ノ門ヒルズ 2020）を表現する「アンカーの中間挿入」が無い。
5. 文字列が `STR` に集約されているが、約 40 箇所の直書き英文と、キャンバスの直書きラベルがある。フォントに日本語が無い。
6. セーブに都市 id が無い。
7. 建設・経済の指数（`stationGrowth 1.32` など）は 13〜17 駅の路線向け。東京の 25〜38 駅路線では最後の駅が数千万 kr になる。

これらをどう解決するかは [01 エンジン共通化と日本版共通仕様](01-spec-engine-city-pack.md) に書く。
