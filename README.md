# オセロ PWA

スマホ向けのオセロゲームです。HTML / CSS / JavaScript のみで動作します。

## できること

- 8×8 オセロ
- 二人対戦
- CPU対戦
- CPU レベル 1〜5
- PWA 対応
- オフライン起動
- デバッグモード

## フォルダ構成

```text
/
  index.html
  style.css
  script.js
  ai.js
  ai/
    weights.js
    transposition.js
    openingBook.js
    evaluation.js
    minimax.js
    search.js
  manifest.json
  service-worker.js
  icons/
  README.md
```

## ローカル実行方法

### 方法1: Live Server

VS Code で `index.html` を Live Server で開きます。

### 方法2: 簡易サーバー

```bash
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開きます。

## GitHub Pages 公開方法

1. リポジトリを GitHub に push します。
2. `Settings` を開きます。
3. `Pages` を選びます。
4. `Branch` を `main`、フォルダを `/ (root)` に設定します。
5. 保存後、公開 URL が発行されます。

## iPhone でホーム画面に追加する方法

1. Safari で公開 URL を開きます。
2. 共有ボタンを押します。
3. `ホーム画面に追加` を選びます。
4. 追加後はアプリのように起動できます。

## PWA について

このプロジェクトは PWA として動作します。

主な設定:

- `manifest.json`
- `service-worker.js`
- `apple-mobile-web-app-capable`
- `apple-touch-icon`
- `theme-color`

## AI アルゴリズム

### レベル1

- 合法手からランダム選択

### レベル2

- 返せる石の枚数が最大の手を選択

### レベル3

- 角
- 辺
- X マス回避
- C マス回避
- 返せる石数
- 位置評価

### レベル4: エキスパート

評価関数ベースの αβ探索です。

評価項目:

- 角
- 辺
- 確定石
- Mobility
- Frontier Disc
- 石差
- 盤面重みテーブル
- ゲームフェーズごとの比率変更

探索:

- ミニマックス
- αβ枝刈り
- 深さ 4〜5 手
- 1 秒以内を目標

### レベル5: マスター

レベル4をベースに以下を追加しています。

- Iterative Deepening
- Move Ordering
- Transposition Table
- Zobrist Hash
- Killer Move
- History Heuristic
- 終盤 10 手以下の完全探索
- Opening Book

## デバッグモード

ON にすると、以下を表示します。

- 探索深さ
- 評価値
- 候補手
- 探索ノード数
- 思考時間(ms)
- 採用理由

## 補足

- 外部ライブラリは使っていません。
- API サーバーは不要です。
- GitHub Pages にそのまま置ける構成です。
