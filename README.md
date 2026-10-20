# Japan Metros · 名古屋

名古屋の地下鉄をつくる、終わりのある放置（インクリメンタル）ゲーム。1957 年の東山線、
名古屋・伏見・栄の 3 駅から始め、ベルを鳴らして電車を出し、時代ごとに一本ずつ実在の路線を
延ばしていく。1965 年に名城線、1971 年に名港線、1977 年に鶴舞線、1989 年に桜通線と名城線の
環状化。2011 年からは制約が外れ、地図に残る全 87 駅をつなぐと終点（エンディング）。

**地図が進捗バー。** 街は暗いベールの下にあり、駅を建てたところだけが明るくなる。

> 非公式のファン作品。名古屋市交通局をはじめ、どの交通事業者とも関係ない。
> 駅名と地理は街の事実、それ以外はゲーム。

[Tunnelbana · Build Stockholm](https://github.com/MMacLaine/tunnelbana)（Matthew MacLaine、MIT）を
土台にしている。設計の経緯と仕様は [`docs/`](docs/README.md) にある。

## 遊ぶ

リポジトリのルートで静的サーバーを立てる:

```
node _dev/serve.mjs      # http://localhost:8123
```

ES モジュールは `file://` では読めないので、サーバーが必要。開発サーバーは `no-store` を
返す（古いモジュールのキャッシュで、直したはずのバグを追う午後を無くすため）。

## 中身

| パス | 内容 |
| --- | --- |
| `src/sim.js` | シミュレーション全体。DOM 非依存・決定論的で、テストから import できる。都市名を持たない。 |
| `src/render.js` | キャンバス描画（線・電車・駅・ベール・予定駅）。sim を読むだけ。 |
| `src/main.js` | DOM・入力・メニュー・ショップ。ブラウザに触る唯一のファイル。 |
| `src/city/` | 都市パック。`nagoya/`（出荷）と `stockholm/`（元のゲーム。回帰テストの基準）。`index.js` が都市を選ぶ。 |
| `src/i18n/` | 文字列表。`ja.js`（既定）と `en.js`（元のゲームの英語）。都市パックの `strings` が上に重なる。 |
| `src/format.js` | 数字と通貨の表示（名古屋は内部値 ×1000 の円、万・億・兆）。 |
| `src/geo.js` | 距離・水域・人口密度の幾何。 |
| `basemap/` | 夜の地図スタイル（MapLibre、ラベル無しで都市非依存）。 |
| `_dev/` | テストと計測。 |
| `docs/` | 仕様書と史実の資料、ロゴ。 |

## 都市パック

都市ごとのデータ（駅アンカー、計画区間、時代、チャーター、水域、建設禁止、人口、豆知識、
新聞、実績、文字列）は `src/city/<id>/` に閉じている。形は
[`docs/01-spec-engine-city-pack.md`](docs/01-spec-engine-city-pack.md) §2。

- **アンカーの順序はセーブ形式。** セーブは駅を index で持つので、出荷後のアンカー配列は末尾にしか足さない。
- 計画区間（corridor）は anchor id の配列で、既存の駅を経由してよい。最初に挙げた区間がその駅を「持ち」、
  後の区間は経由する。経由駅は、その区間の路線が実際に停まって初めて完成とみなす。
- `closeLoop: true` の区間は、最後の要素が同じ路線の反対の端で、そこへつなぐと環状線になる。
- セーブのキーは `metros_<都市>_*`。別の都市のセーブは読まずに残す。

## 設計の決まり

元のゲームから受け継いだもの。多くはバグで学んだ。

- **ランタイム依存ゼロ。** 地図描画の MapLibre GL だけを同梱する。和文は Noto Sans JP を使う文字だけにサブセットして同梱する（`node _dev/subset-fonts.mjs <TTF のあるフォルダ>`。和文の文字列を増やしたら作り直す）。
- **sim が真実を持ち、renderer はピクセルを持つ。** 画面の数字は全て sim から読む。
- **集計フローでエージェントは無し。** 乗客は駅間を流れる量。
- **エンティティのコンストラクタは一つ。** ハーネスは `sim.addTrain()` を使い、リテラルを書かない（smoke が検査する）。
- **全ての購入は測れるほど稼ぐこと。** `_dev/value-gate.mjs` が検証する。
- **バランスは議論せず計測する。** `_dev/probe-*.mjs` と結果のコメントを残す。

## テスト

```
node _dev/smoke-pack.mjs                      # 名古屋パックの不変条件（水域・間隔・経由・信頼の配分…）
node _dev/smoke-nagoya.mjs                    # 名古屋の全キャンペーン、環状線の運行、円表示、別都市セーブ
METROS_CITY=stockholm node _dev/smoke.mjs     # 元のゲームのシナリオ一式（ストックホルムパック）
node _dev/value-gate.mjs                      # 全購入の価値（名古屋）。METROS_CITY=stockholm で元の基準
node _dev/probe-arc.mjs 3600 quiet            # 1 時間のペーシング計測
```

どれも失敗すると 0 以外で終わる。

## クレジット

原作 [Tunnelbana](https://github.com/MMacLaine/tunnelbana) by Matthew MacLaine（MIT）。
地図データ © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors、タイル
[OpenFreeMap](https://openfreemap.org)、描画 [MapLibre GL JS](https://maplibre.org)（BSD-3）。
駅の座標は ekidata.jp 由来の公開データ（open-data-jp-railway-stations）。書体 IBM Plex Mono と
Libre Caslon、Noto Sans JP（いずれも SIL OFL、`fonts/OFL*.txt`）。音楽 "Morning Rain"、"Countryside"、"Oceanside"、"Florist" by TAD
（[OpenGameArt](https://opengameart.org/content/lofi-compilation)、CC0）。

## ライセンス

コードは MIT（`LICENSE`）。元の著作権表示はそのまま残している。「Tunnelbana」の名前・ロゴ・
アートワークは MIT の対象外なので使っていない。フォント・地図データ・MapLibre・音楽はそれぞれの
ライセンスに従う。
