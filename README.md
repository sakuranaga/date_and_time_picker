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

- `index.html` - 日付ピッカーのデモ
- `multi-time-picker.html` - 時刻ピッカーのデモ（複数設置対応）

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

### 日付ピッカー

```html
<link rel="stylesheet" href="datepicker.css">

<div class="date-picker-wrapper">
    <input type="text" class="date-input" placeholder="年/月/日" readonly>
</div>

<script src="datepicker.js"></script>
```

### 時刻ピッカー

```html
<div class="custom-time-input-wrapper">
    <input type="text" class="custom-time-input" placeholder="--:--" readonly>
</div>

<script>
// 自動初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeTimeInputs();
});

// プログラムから値を設定
const instance = CustomTimeInput.instances[0];
instance.setValue('09:00');

// 値を取得
const value = instance.getValue(); // "09:00"
</script>
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
