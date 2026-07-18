# おもち先生と学ぶ 漢検9級チャレンジ

Cloudflare Pages対応の、小学2年生向け漢検9級学習ゲームです。

## Ver.2.1-① リファイン版

- 単一HTMLから `index.html` / `style.css` / `app.js` へ分割
- 埋め込み画像を `assets/images` に分離・重複排除
- 既存のLocalStorageキーと学習データを維持
- GitHub + Cloudflare Pagesの自動デプロイに対応

## 公開方法

このフォルダ内のファイルと `assets` フォルダを、GitHubリポジトリのルートへアップロードしてください。
Cloudflare PagesのFramework presetは `None`、Build commandは空欄、Build output directoryは `/` のままで動作します。
