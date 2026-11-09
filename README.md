# 日付時間ピッカー

scriptタグ1つで使えるカスタム日付ピッカー・時刻ピッカーです。

## なぜカスタムピッカーが必要か

HTML5標準の `<input type="date">` と `<input type="time">` には以下の問題があります：

| 問題点 | HTML5標準 | このカスタムピッカー |
|--------|-----------|---------------------|
| **ブラウザ間の見た目** | バラバラ（Chrome, Safari, Firefoxで全く異なる） | 統一されたデザイン |
| **モバイル対応** | OSネイティブUIが強制表示 | 同じUIを維持 |
| **スタイリング** | CSSでほぼカスタマイズ不可 | 完全にカスタマイズ可能 |
| **時刻の刻み** | 1分単位のみ | 30分刻みなど自由に設定可能 |
| **日本語表示** | ブラウザ/OS依存 | 確実に日本語表示 |
| **土日の色分け** | 不可能 | 対応 |
| **祝日の色分け** | 不可能 | 対応（CSV読み込み） |

## デモ

- `demo/index.html` - デモの一覧
- `demo/date.html` - 日付ピッカーのデモ（テーマ切り替え付き）
- `demo/time.html` - 時刻ピッカーのデモ
- `demo/datetime.html` - 日付・時刻ピッカー（DateTimePicker）のデモ

HTMLファイルをダブルクリックするだけで動作します（祝日の表示には `holiday.csv` の読み込みが必要なので、ローカルの Web サーバー経由で開いてください）。

`demo/date.html` にはデフォルト・ダーク・グリーン・パープル・ウォームの5テーマを切り替えるボタンが付いており、CSS変数によるデザインカスタマイズを実際に確認できます。

## 使い方

### 日付ピッカー

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>日付ピッカー</title>
</head>
<body>
    <div class="date-picker-wrapper">
        <input type="text" class="date-input" placeholder="年/月/日" readonly>
    </div>

    <!-- これだけで動作 -->
    <script src="dist/datepicker.js"></script>
</body>
</html>
```

### 時刻ピッカー

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>時刻ピッカー</title>
</head>
<body>
    <!-- 30分刻み（デフォルト） -->
    <input type="text" class="tp-input" placeholder="--:--" readonly>

    <!-- 15分刻み -->
    <input type="text" class="tp-input" data-minute-step="15" placeholder="--:--" readonly>

    <!-- 5分刻み -->
    <input type="text" class="tp-input" data-minute-step="5" placeholder="--:--" readonly>

    <!-- 1分刻み -->
    <input type="text" class="tp-input" data-minute-step="1" placeholder="--:--" readonly>

    <!-- これだけで動作 -->
    <script src="dist/timepicker.js"></script>
</body>
</html>
```

### 日付・時刻ピッカー（DateTimePicker）

日付だけ・時刻だけ・日付と時刻を、1つのスクリプトで `data-mode` 属性によって切り替えるピッカーです。

```html
<!-- 日付＋時刻（15分刻み） -->
<div class="date-picker-wrapper" data-mode="datetime" data-minute-step="15">
    <input type="text" class="date-input" placeholder="年/月/日 時:分" readonly>
</div>

<!-- 時刻のみ -->
<div class="date-picker-wrapper" data-mode="time">
    <input type="text" class="date-input" placeholder="時:分" readonly>
</div>

<!-- 日付のみ（data-mode を省くと date） -->
<div class="date-picker-wrapper">
    <input type="text" class="date-input" placeholder="年/月/日" readonly>
</div>

<script src="dist/datetimepicker.js"></script>
```

日付ピッカー（`dist/datepicker.js`）と同じクラス名（`.date-picker-wrapper`）を使います。両方を同じページで読み込んでも、
自動初期化では1つのラッパーに先に初期化した方のピッカーだけが付きます（どちらが付くかは決まっていないので、ふつうはどちらか一方だけを読み込んでください）。

## オプション設定

### 日付ピッカー

`data-*` 属性で各インスタンスの動作を設定できます。

```html
<!-- 制限なし -->
<div class="date-picker-wrapper">
    <input type="text" class="date-input" placeholder="年/月/日" readonly>
</div>

<!-- 今日以降のみ選択可能 -->
<div class="date-picker-wrapper" data-min-date="today">
    <input type="text" class="date-input" placeholder="年/月/日" readonly>
</div>

<!-- 特定の範囲のみ選択可能 -->
<div class="date-picker-wrapper" data-min-date="2025-12-01" data-max-date="2025-12-31">
    <input type="text" class="date-input" placeholder="年/月/日" readonly>
</div>

<!-- 出力フォーマットを変更 -->
<div class="date-picker-wrapper" data-format="YYYY-MM-DD">
    <input type="text" class="date-input" placeholder="年-月-日" readonly>
</div>
```

| 属性 | 説明 | 値の例 |
|------|------|--------|
| `data-min-date` | 選択可能な最小日付 | `"today"`, `"2025-12-01"` |
| `data-max-date` | 選択可能な最大日付 | `"today"`, `"2025-12-31"` |
| `data-format` | 出力フォーマット（デフォルト: `YYYY/MM/DD`） | `"YYYY-MM-DD"`, `"YYYY/MM/DD"` |

範囲外の日付はグレーアウトされ、選択できなくなります。

**初期値**: input の `value`（または、スクリプトで設定した値）が `data-format` どおりの日付なら、ピッカーはその日を選択状態にし、
開いたときにその月を表示します（例: `<input class="date-input" value="2025/12/01">`）。形が違う値や存在しない日付は読まず、
値もそのまま残します。DateTimePicker の datetime モードでは「日付」と「日付 + 半角スペース + HH:mm」の両方を読みます。

### 時刻ピッカー

`data-minute-step` 属性で分の刻み幅を設定できます。

```html
<!-- 30分刻み（デフォルト） -->
<input type="text" class="tp-input" placeholder="--:--" readonly>

<!-- 15分刻み -->
<input type="text" class="tp-input" data-minute-step="15" placeholder="--:--" readonly>

<!-- 5分刻み -->
<input type="text" class="tp-input" data-minute-step="5" placeholder="--:--" readonly>

<!-- 1分刻み -->
<input type="text" class="tp-input" data-minute-step="1" placeholder="--:--" readonly>
```

| 属性 | 説明 | 値の例 |
|------|------|--------|
| `data-minute-step` | 分の刻み幅（デフォルト: `30`）。60 を割り切る正の整数。それ以外の値は `30` として扱う | `"1"`, `"5"`, `"10"`, `"15"`, `"30"` |

### 日付・時刻ピッカー（DateTimePicker）

属性はすべて `.date-picker-wrapper` に付けます。

| 属性 | 説明 | 値の例 |
|------|------|--------|
| `data-mode` | `date`（日付のみ）・`time`（時刻のみ）・`datetime`（日付と時刻）。省くと `date` | `"datetime"` |
| `data-minute-step` | 分の刻み幅（time / datetime。デフォルト: `30`）。60 を割り切る正の整数。それ以外の値は `30` として扱う | `"15"` |
| `data-format` | 日付部分の出力フォーマット（date / datetime。デフォルト: `YYYY/MM/DD`）。datetime では、この日付の後に半角スペースと `HH:mm` が付く。time モードには効かない | `"YYYY-MM-DD"` → datetime なら `2026-01-20 14:30` |
| `data-min-date` | 選択可能な最小日付（date / datetime） | `"today"`, `"2025-12-01"` |
| `data-max-date` | 選択可能な最大日付（date / datetime） | `"today"`, `"2025-12-31"` |

モードごとの振る舞い:

- **date**: 日付ピッカーと同じ。日付を選ぶと閉じる。
- **time**: 開くと現在時刻に近い時刻（入力済みならその時刻）を選んで入力する。時・分を選ぶたびに値が変わる。「クリア」で空に戻せる。
- **datetime**: カレンダーと時・分の列が並ぶ。日付を選んでも閉じないので、続けて時刻を選べる（Esc か外側のクリックで閉じる）。
  開いたとき、入力済みの値が「`data-format` の日付 + 半角スペース + `HH:mm`」の形ならその時刻を、そうでなければ現在時刻に近い時刻を選ぶ。
  日付を選ぶまでは値は入らない。「クリア」で日付と時刻を空に戻せる。

値が変わると input の `change` イベントが発火します。祝日の表示（`holiday.csv`）は日付ピッカーと同じです。

## 機能詳細

### 日付ピッカー

**HTML5標準では不可能なこと：**
- 土曜日を青、日曜日を赤で表示
- 前月・翌月の日付をグレーで表示しつつ選択可能
- 「今日」ボタンの設置
- カレンダーのフォント、色、サイズの完全カスタマイズ
- 全ブラウザ・全デバイスで同一のUI

**機能一覧：**
- カレンダー形式の日付選択UI
- 月間移動（前月・翌月ボタン）
- 「今日」ボタンで当日へ即座に移動
- 土曜（青）・日曜（赤）の色分け表示
- 祝日の赤色表示（CSV読み込み）
- 前月・翌月の日付もグレーで表示
- 選択中の日付をハイライト
- 外側クリックで自動的に閉じる
- キーボード操作に完全対応
- 1ページに複数設置可能

### 時刻ピッカー

**HTML5標準では不可能なこと：**
- 分の刻み幅の制限（30分刻み、15分刻みなど）
- スクロール式のモダンなUI
- 時と分を別々のカラムで選択
- 選択肢の制限（業務時間のみ表示など）

**機能一覧：**
- スクロール式の時刻選択UI
- 時（00-23）と分の2カラム選択
- 分の刻み幅を `data-minute-step` 属性で設定可能（1, 5, 10, 15, 30分）
- 開くと現在時刻に近い時刻（入力済みならその時刻）を選んで入力（change は1回）
- 「クリア」ボタンで入力を空に戻せる
- 複数の入力欄が独立して動作
- キーボード操作対応（↑↓キー、Enter、Escape）
- プログラムからの値設定・取得API
- changeイベントの発火

## キーボード操作

### 日付ピッカー

| キー | 動作 |
|------|------|
| `Enter` / `Space` | 入力欄にフォーカス時：ピッカーを開く / 日付にフォーカス時：その日付を選択 |
| `Escape` | ピッカーを閉じる |
| `←` `→` | 前日 / 翌日に移動（月をまたぐ場合は自動で切り替え） |
| `↑` `↓` | 前週 / 翌週に移動（月をまたぐ場合は自動で切り替え） |
| `Home` / `End` | 表示中の月の最初 / 最後の有効日に移動 |
| `PageUp` / `PageDown` | 前月 / 翌月の同じ日に移動（その月にない日は月末） |
| `Tab` | ピッカー内のフォーカス移動（フォーカストラップ） |

選択できる範囲（`data-min-date` / `data-max-date`）の外へは移動しません。

### 時刻ピッカー

入力欄で:

| キー | 動作 |
|------|------|
| `Enter` / `↑` / `↓` | ピッカーを開く（開くと選択中の「時」にフォーカスが移る） |
| `Escape` | ピッカーを閉じる |
| `Tab` | ピッカーを閉じて次の要素へ移動 |

時・分の列で（DateTimePicker の time / datetime モードも同じ）:

| キー | 動作 |
|------|------|
| `↑` / `↓` | 前 / 次の時刻を選ぶ（移るとすぐ値が変わる。端では止まる） |
| `Home` / `End` | 先頭 / 末尾を選ぶ |
| `→` / `←` | 時の列から分の列へ / 分の列から時の列へ（値は変わらない） |
| `Enter` / `Escape` | ピッカーを閉じて入力欄に戻る |
| `Tab` | 時刻ピッカーでは、ポップアップの外へ出ると閉じる。DateTimePicker では、ピッカーの中を順に移動（カレンダー → 時 → 分） |

時刻ピッカーは、入力欄にフォーカスしただけでは開きません（クリックか上のキーで開きます）。Tab でフォームを移動しても値は入りません。

## 祝日表示

[内閣府の「国民の祝日」CSV](https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html) を `dist/holiday.csv` に配置すると、カレンダー上で祝日が日曜日と同じ赤色で表示されます。

```
dist/
  datepicker.js
  holiday.csv    ← ここに配置
```

- CSVは内閣府が公開しているShift_JIS形式のものをそのまま使用できます
- `holiday.csv` が存在しない場合でも正常に動作します（祝日表示なし）

## デザインカスタマイズ

CSS変数を上書きするだけで、ソースコードを編集せずにデザインを変更できます。

### 日付ピッカー

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `--dp-primary-color` | `#0066cc` | 選択日・土曜日の色 |
| `--dp-sunday-color` | `#d63638` | 日曜・祝日の色 |
| `--dp-saturday-color` | `#0066cc` | 土曜日の色 |
| `--dp-bg-color` | `#ffffff` | カレンダーの背景色 |
| `--dp-text-color` | `#333` | テキスト色 |
| `--dp-hover-bg` | `#f0f0f0` | ホバー時の背景色 |
| `--dp-border-radius` | `8px` | カレンダーの角丸 |
| `--dp-shadow` | `0 4px 20px rgba(0,0,0,0.15)` | カレンダーの影 |

### 時刻ピッカー

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `--tp-primary-color` | `#0066cc` | 選択項目の色 |
| `--tp-bg-color` | `#ffffff` | ポップアップの背景色 |
| `--tp-border-color` | `#ccc` | 入力欄の枠線色 |
| `--tp-hover-bg` | `#f0f0f0` | ホバー時の背景色 |
| `--tp-text-color` | `#333` | テキスト色 |
| `--tp-shadow` | `0 10px 30px rgba(0,0,0,0.2)` | ポップアップの影 |

### カスタマイズ例：ダークテーマ

```css
:root {
    --dp-primary-color: #4a9eff;
    --dp-sunday-color: #ff6b6b;
    --dp-saturday-color: #4a9eff;
    --dp-bg-color: #1e1e1e;
    --dp-text-color: #e0e0e0;
    --dp-hover-bg: #333;
    --dp-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);

    --tp-primary-color: #4a9eff;
    --tp-bg-color: #1e1e1e;
    --tp-border-color: #555;
    --tp-hover-bg: #333;
    --tp-text-color: #e0e0e0;
    --tp-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}
```

## プログラムからの操作

```javascript
// 時刻ピッカー
const instance = TimePicker.TimePicker.instances[0];
instance.setValue('09:00');
const value = instance.getValue(); // "09:00"
```

## 開発者向け

ソースコードを編集する場合は、Docker の中で作業します（ホストでは npm を使いません）。

```bash
# 依存関係のインストール（最初と package-lock.json の更新時。npm audit で high 以上があると止まります）
docker compose run --rm install

# ビルド（dist/にminify済みファイルを生成、ネットワークなし）
docker compose run --rm dev npm run build

# テスト（node:test + jsdom、ネットワークなし）。dist のテストも含むので、先にビルドする
docker compose run --rm dev npm test

# 開発モード（ファイル監視）
docker compose run --rm dev npm run dev
```

- `node_modules` は Docker の名前付きボリュームに置かれ、ホストの `node_modules` とは別です。
- テストは `tests/` にあります。時刻は `TZ=Asia/Tokyo` で固定しています。
- 設計書は `docs/`、変更履歴は `CHANGE_LOG.md` にあります。

## ファイル構成

```
dist/
  datepicker.js      - 日付ピッカー（CSS込み、minify済み）
  timepicker.js      - 時刻ピッカー（CSS込み、minify済み）
  datetimepicker.js  - 日付・時刻・日付＋時刻の統合ピッカー（CSS込み、minify済み）
  holiday.csv        - 祝日データ（任意、内閣府CSVを配置）
```

ソース（ビルドの入力は直下の3つの .js）:

```
datepicker.js / timepicker.js / datetimepicker.js  - 各ピッカーの入口（CSS の読み込みと自動初期化）
core/
  picker-core.js   - DatePicker と DateTimePicker の本体（mode: date / time / datetime）
  time-columns.js  - 時・分の列（TimePicker と DateTimePicker で共有）
  date-utils.js    - 日付の計算（範囲判定、月の42マス、整形など）
  time-utils.js    - 時刻の計算（分の刻み、現在時刻からの初期値、値の解釈）
  holidays.js      - holiday.csv の読み込み
  auto-init.js     - .date-picker-wrapper の自動初期化
```

## ブラウザ対応

モダンブラウザ全般で動作します：
- Chrome / Edge
- Firefox
- Safari
- iOS Safari
- Android Chrome

## TODO

- [ ] 「今日」「クリア」ボタンの表示/非表示オプション
- [ ] 日付ピッカーのプログラムAPI（`setValue()`, `getValue()`, `open()`, `close()`）
- [ ] 選択不可曜日の指定（定休日など）
- [ ] 英語README

## ライセンス

MIT
