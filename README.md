# オセロ PWA

スマホで遊びやすい、HTML/CSS/JavaScript だけで作ったオセロゲームです。

ブラウザでそのまま遊べます。iPhone では「ホーム画面に追加」すると、アプリのように起動できます。

## できること

- 8×8 オセロ
- 二人対戦
- コンピュータ対戦
- かんたん、ふつう、つよい の3段階
- 自動パス
- 勝敗判定
- PWA 対応
- オフライン起動

## フォルダ構成

```text
/
  index.html
  style.css
  script.js
  ai.js
  manifest.json
  service-worker.js
  icons/
  README.md
```

## ローカル実行方法

このプロジェクトは静的ファイルだけで動きます。

### 方法1: VS Code の Live Server

1. プロジェクトフォルダを VS Code で開きます。
2. `index.html` を Live Server で開きます。

### 方法2: 簡易ローカルサーバー

Python が使える場合は、プロジェクトフォルダで次のように起動できます。

```bash
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開いてください。

## GitHub Pages 公開方法

1. このフォルダを GitHub リポジトリに push します。
2. GitHub のリポジトリ設定を開きます。
3. `Pages` を選びます。
4. `Branch` を `main`、フォルダを `/ (root)` にします。
5. 保存すると、公開 URL が発行されます。

## iPhone でホーム画面に追加する方法

1. Safari で公開 URL を開きます。
2. 画面下の共有ボタンを押します。
3. 「ホーム画面に追加」を選びます。
4. 追加すると、アプリのように起動できます。

## PWA について

PWA は、ブラウザ上の Web アプリを「インストールしたように」使える仕組みです。

このプロジェクトでは、次の設定を入れています。

- `manifest.json`
- `service-worker.js`
- `apple-mobile-web-app-capable`
- `theme-color`
- `apple-touch-icon`

そのため、対応ブラウザではホーム画面追加やオフライン起動ができます。

## 補足

- 外部ライブラリは使っていません。
- サーバー API も不要です。
- GitHub Pages にそのまま置ける構成です。
