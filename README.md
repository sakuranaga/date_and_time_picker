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

- `index.html` - 日付ピッカーのデモ
- `multi-time-picker.html` - 時刻ピッカーのデモ

HTMLファイルをダブルクリックするだけで動作します。

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
    <input type="text" class="tp-input" placeholder="--:--" readonly>

    <!-- これだけで動作 -->
    <script src="dist/timepicker.js"></script>
</body>
</html>
```

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
- 30分刻み（00分と30分のみ）の制限
- スクロール式のモダンなUI
- 時と分を別々のカラムで選択
- 選択肢の制限（業務時間のみ表示など）

**機能一覧：**
- スクロール式の時刻選択UI
- 時（00-23）と分（00, 30）の2カラム選択
- 30分刻みの時刻入力に特化
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
| `Home` / `End` | 月の最初 / 最後の有効日に移動 |
| `PageUp` / `PageDown` | 前月 / 翌月に移動 |
| `Tab` | ピッカー内のフォーカス移動（フォーカストラップ） |

### 時刻ピッカー

| キー | 動作 |
|------|------|
| `Enter` / `↑` / `↓` | ピッカーを開く |
| `Escape` | ピッカーを閉じる |
| `Tab` | ピッカーを閉じて次の要素へ移動 |

## 祝日表示

[内閣府の「国民の祝日」CSV](https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html) を `dist/holiday.csv` に配置すると、カレンダー上で祝日が日曜日と同じ赤色で表示されます。

```
dist/
  datepicker.js
  holiday.csv    ← ここに配置
```

- CSVは内閣府が公開しているShift_JIS形式のものをそのまま使用できます
- `holiday.csv` が存在しない場合でも正常に動作します（祝日表示なし）

## プログラムからの操作

```javascript
// 時刻ピッカー
const instance = TimePicker.TimePicker.instances[0];
instance.setValue('09:00');
const value = instance.getValue(); // "09:00"
```

## 開発者向け

ソースコードを編集する場合：

```bash
# 依存関係のインストール
npm install

# ビルド（dist/にminify済みファイルを生成）
npm run build

# 開発モード（ファイル監視）
npm run dev
```

## ファイル構成

```
dist/
  datepicker.js  - 日付ピッカー（CSS込み、minify済み）
  timepicker.js  - 時刻ピッカー（CSS込み、minify済み）
  holiday.csv    - 祝日データ（任意、内閣府CSVを配置）
```

## ブラウザ対応

モダンブラウザ全般で動作します：
- Chrome / Edge
- Firefox
- Safari
- iOS Safari
- Android Chrome

## ライセンス

MIT
