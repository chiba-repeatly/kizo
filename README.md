# KIZO

**記録を、成長に変える。**

筋トレ記録・PFC栄養管理・献立提案・コーチングを統合する、日本語対応フィットネスWebアプリ（開発中）。

## Development
- [Product specification](PRODUCT_SPEC.md)
- [Instructions for Codex](CODEX_INSTRUCTIONS.md)

## V1.0 scope
筋トレ記録、食事記録、PFC計算、食品検索（出典を明記）、ルールベースの献立・トレーニング提案。初期版はブラウザ内に保存し、GitHub Pagesで公開できる静的Webアプリを目指します。

**Note:** AIチャットコーチ・クラウド同期は将来の開発予定で、現在実装済みではありません。

## V1.0 implementation

日本語・モバイル優先の静的アプリです。実行時ライブラリ、APIキー、ビルド工程は不要です。

- 日別のkcal/PFC、目標・残量、PFC由来のエネルギー比率
- トレーニングの追加・編集・削除、種目別履歴、最高重量、推定1RM、重量推移、月間カレンダー
- 食事の追加・編集・削除、食事区分、グラム換算、出典付き食品検索・手入力
- 残り目標・肉なし設定・時間・予算を使う献立候補、目標・経験・設備・直近2日の記録・疲労による運動候補
- localStorage保存、検証付きJSON入出力、全データ削除、破損・保存失敗時のエラー表示

### Run locally

Node.js 24 と Python 3 を使用します。`npm install` は不要です。

```sh
npm start
```

HTTPサーバーはポート8000で起動します。ES Modulesを利用するため、HTMLを直接ファイルとして開かずHTTP経由でアクセスしてください。表示・記録日は画面上部で変更できます。記録の「編集」を押すとフォームに読み込まれ、日付も変更可能です。編集後は保存、またはキャンセルを選択します。

### Validation

```sh
npm test
node --check app.js
python3 tests/browser-smoke.py
```

`npm test` はNode標準テストのみで、依存追加は不要です。計算、日付別集計、インポート検証、提案条件を検証します。

ブラウザテストにはPython版PlaywrightとChromiumが必要です（今回のクラウド環境には導入済み）。別環境では `python3 -m pip install playwright` と Chromium のインストールが必要です。テストは `/usr/bin/chromium` を使用し、先にポート8000のサーバーを起動します。トレーニング・食事のCRUD、編集時の日付変更、再読込による保持、目標変更、安全な提案、JSON入出力、不正データ拒否、HTML文字列の安全な表示、リセット、破損データ、390px/1440px表示を検証します。専用ブラウザコンテキストで実行し、利用者の記録は変更しません。スクリーンショットは `/tmp/kizo-mobile.png` と `/tmp/kizo-desktop.png` に生成します。

### GitHub Pages

1. この変更を `main` にマージします。
2. リポジトリの **Settings → Pages → Build and deployment** で **Deploy from a branch** を選択します。
3. ブランチ `main`、フォルダー `/ (root)` を指定して保存します。
4. Pagesのデプロイ完了後、GitHubが表示する公開URLで記録・再読み込みを確認します。

HTML/CSS/JSは相対パスのため、プロジェクト配下のPagesでも動作します。自動デプロイ用の秘密鍵や有料APIは不要です。実際の公開設定変更・本番デプロイはこの実装では行っていません。

### Food data and calculations

限定シードは **USDA FoodData Central, SR Legacy** のパブリックドメインデータから5品のみを掲載しています。[公式データセット](https://fdc.nal.usda.gov/download-datasets/) / [USDAのデータ説明と利用条件](https://fdc.nal.usda.gov/data-documentation.html)。食品は米国の一般食品で、日本の商品・品種・調理条件の実測値ではありません。調理状態と可食部100g当たりの値を明示しています。

| NDB番号 | 食品・状態 | kcal | P g | F g | C g |
| --- | --- | ---: | ---: | ---: | ---: |
| 20045 | Rice, white, long-grain, regular, enriched, cooked | 130 | 2.69 | 0.28 | 28.17 |
| 05064 | Chicken, broilers or fryers, breast, meat only, cooked, roasted | 165 | 31.02 | 3.57 | 0 |
| 01129 | Egg, whole, cooked, hard-boiled | 155 | 12.58 | 10.61 | 1.12 |
| 09040 | Bananas, raw | 89 | 1.09 | 0.33 | 22.84 |
| 11090 | Broccoli, raw | 34 | 2.82 | 0.37 | 6.64 |

値は `100g当たり × 食べた量 ÷ 100` で合計します。画面表示は小数第1位への丸めです。P・Cは4kcal/g、Fは9kcal/gで、比率はこの換算エネルギーの合計を分母とします。ゼロ記録時の比率は0%。食品のkcal欄は出典値を使用するため、PFC換算値とは一致しないことがあります。目標kcalと各マクロ目標は独立して設定できます。出典値を変更した場合は出典欄も更新してください。

献立の順位は各 `abs(max(目標−記録, 0)−候補値) / 目標` をkcal/P/F/Cで合計し、差が小さい順です。献立の価格・時間は参考見積もりで、調味料・加熱による重量変化・地域価格は含みません。運動の推定1RMはEpley式 `重量 × (1 + 回数 / 30)` であり、高回数や自重では特に参考にできません。グラフは重量を記録日順に表示し、日付間隔は等間隔です。

### Privacy and limitations

記録はブラウザの同一オリジン内にのみ保存します。アプリからの外部送信・アクセス解析はありません。外部出典リンクを開く場合やGitHub Pagesの配信におけるアクセスログは各サービスの扱いに従います。localStorageは暗号化された保管庫ではありません。共有端末の利用に注意してください。ブラウザデータの消去・端末やURLの変更では引き継げないため、JSONを定期的に書き出してください。インポートは既存の全記録と目標を置換します。

医療・栄養欠乏の診断やAIチャットは実装していません。提案は小規模なルールベースの候補で、個別の健康状態・アレルギーは評価しません。痛み・体調不良時は運動休止を案内します。アカウント・クラウド同期・AIコーチはV2.0以降の予定です。
