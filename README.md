# 日付時間ピッカー

カスタム日付ピッカーと時刻ピッカーのJavaScript実装です。

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

## デモ

### 開発版（ESモジュール）
- `index.html` - 日付ピッカーのデモ
- `multi-time-picker.html` - 時刻ピッカーのデモ（複数設置対応）

**注意:** これらのファイルはESモジュールを使用しているため、ローカルサーバー経由で開く必要があります。

```bash
# ローカルサーバーを起動
python3 -m http.server 8000
# ブラウザで http://localhost:8000/index.html を開く
```

### 本番版（バンドル済み）
- `index.prod.html` - 日付ピッカーのデモ（本番版）
- `multi-time-picker.prod.html` - 時刻ピッカーのデモ（本番版）

**メリット:** ファイルをダブルクリックするだけで動作します（サーバー不要）。

## ビルド方法

このプロジェクトはRollupを使用してESモジュールをバンドルします。

```bash
# 依存関係のインストール（初回のみ）
npm install

# ビルド実行
npm run build

# 開発モード（ファイル監視）
npm run dev
```

ビルドすると `dist/` ディレクトリに以下のファイルが生成されます：
- `dist/datepicker.js` (12KB) - 日付ピッカー（CSS込み）
- `dist/timepicker.js` (11KB) - 時刻ピッカー（CSS込み）

## 機能詳細

### 日付ピッカー (`datepicker.js` / `datepicker.css`)

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
- 前月・翌月の日付もグレーで表示
- 選択中の日付をハイライト
- 外側クリックで自動的に閉じる
- 1ページに複数設置可能

### 時刻ピッカー (`multi-time-picker.html`)

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

## 使い方

### 本番環境（バンドル版）- 推奨

ビルド済みのファイルを使用する方法です。サーバー不要でファイルを直接開けます。

**スクリプトを読み込むだけで自動的に初期化されます！**

#### 日付ピッカー

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

    <!-- これだけで動作！ -->
    <script src="dist/datepicker.js"></script>
</body>
</html>
```

#### 時刻ピッカー

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>時刻ピッカー</title>
</head>
<body>
    <div class="tp-wrapper">
        <input type="text" class="tp-input" placeholder="--:--" readonly>
        <svg class="tp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
        </svg>
    </div>

    <!-- これだけで動作！ -->
    <script src="dist/timepicker.js"></script>
</body>
</html>
```

### 開発環境（ESモジュール版）

開発時やカスタマイズする場合は、ESモジュール版を使用します。

#### 日付ピッカー

```html
<link rel="stylesheet" href="datepicker.css">

<div class="date-picker-wrapper">
    <input type="text" class="date-input" placeholder="年/月/日" readonly>
</div>

<script type="module">
    import { DatePicker } from './datepicker.js';
    
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.date-picker-wrapper').forEach(wrapper => {
            new DatePicker(wrapper);
        });
    });
</script>
```

#### 時刻ピッカー

```html
<link rel="stylesheet" href="timepicker.css">

<div class="tp-wrapper">
    <input type="text" class="tp-input" placeholder="--:--" readonly>
    <svg class="tp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
    </svg>
</div>

<script type="module">
    import { TimePicker } from './timepicker.js';
    
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.tp-input').forEach(input => {
            new TimePicker(input, { minuteStep: 30 });
        });
    });
</script>
```

### プログラムからの操作

```javascript
// バンドル版
const instance = TimePicker.TimePicker.instances[0];
instance.setValue('09:00');
const value = instance.getValue(); // "09:00"

// ESモジュール版
const instance = TimePicker.instances[0];
instance.setValue('09:00');
const value = instance.getValue(); // "09:00"

## ブラウザ対応

モダンブラウザ全般で動作します：
- Chrome / Edge
- Firefox
- Safari
- iOS Safari
- Android Chrome

## ライセンス

MIT
