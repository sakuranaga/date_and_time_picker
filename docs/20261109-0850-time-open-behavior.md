# 時刻ピッカーを開いたときの振る舞いとクリアボタン（DP-0001）

- ステータス: Reviewed
- 課題: LAP DP-0001「時刻ピッカーを開いただけで値が入り change が発火する（Tab 通過でも入力される）」
- 作成: 2026-11-09
- 前提: DP-0010（共通化）がマージ済み。時刻まわりは `core/picker-core.js`（DateTimePicker の time / datetime）と
  `timepicker.js`（TimePicker）、共通部品 `core/time-columns.js`

## 1. 仕様（2026-11-09 ユーザーと決定）

1. **開いたときに現在時刻付近（または入力済みの値）を選んで input に書き込む挙動は残す**（f253abc で入れた挙動）。
2. **TimePicker は focus では開かない**。開くのはクリックと、キー操作（Enter・↑・↓。今のまま）だけ。
   Tab でフォームを通過しても、時刻欄に値が入らなくなる。
3. **開いたときの change は1回**にする。今は時と分を別々に選ぶため、書き込みと change が2回起きる（途中の値も一瞬入る）。
   開いた結果の値を1回だけ書き込み、change も1回だけ発火する。書き込みが起きない場合（datetime で日付が未選択など）は今のまま発火しない。
   時・分の項目をクリックしたときの change（1クリックで1回）は変えない。
4. **クリアボタンを足す**: DateTimePicker の time モードと、TimePicker の両方。押すと input を空にし、change を1回発火し、
   時・分の選択表示を消し、ピッカーを閉じて input にフォーカスを戻す（日付モードのクリアボタンと同じ）。

変えないこと: date / datetime モードの振る舞い（datetime のクリアボタンの状態のずれは DP-0013 で扱う）、
丸めの計算（DP-0002）、時刻のキーボード操作（DP-0008）。

## 2. 設計

### 2.1 開いたときの書き込みを1回にする

- `core/picker-core.js`: `_initTimeOnShow()` は、選ぶ時・分を決めたあと、`selectHour()`・`selectMinute()` を順に呼ぶ代わりに、
  新しい内部メソッド `_applyTime(hour, minute)` を呼ぶ。`_applyTime` は `selectedHour`・`selectedMinute` と選択表示
  （`timeColumns.select`）を両方更新してから、`setInputValue()` を1回だけ呼ぶ。
  `selectHour()`・`selectMinute()`（クリック時）は今のまま。
- `timepicker.js`: `openPicker()` も同じく、選ぶ値を決めてから `_applyTime(hour, minute)` で1回だけ `updateInputValue()` を呼ぶ。
  入力済みの値の解釈（`splitTimeValue`。取れた方だけを選ぶ）は今のまま。取れなかった側は今の選択状態のまま残る
  （今の挙動。値の解釈の改善は範囲外）。`_applyTime` は `hour`・`minute` のうち `undefined` / 空の側を変えない。
  **時・分のどちらも適用しなかったとき（値が `:` など）は書き込まない**（今も書き込みも change も起きない。残っている選択状態から
  値を書き戻してはいけない）。

### 2.2 TimePicker が focus で開かない

- `timepicker.js` の `setupEventListeners()` から、input の `focus` で `openPicker()` を呼ぶリスナーを削除する。
- Escape の処理は `closePicker(); input.focus()` のまま。focus で開かなくなるので、Esc の後に開き直すこともない。

### 2.3 クリアボタン

DateTimePicker の time モード（`core/picker-core.js`）:

```html
<div class="date-picker dp-time-only" ...>
  <div class="date-picker-controls dp-time-controls">
    <button type="button" class="clear-button" disabled>クリア</button>
  </div>
  <div class="dp-time-container">...</div>
</div>
```

- 日付モードと同じ `.date-picker-controls`・`.clear-button` を使い、見た目をそろえる。`dp-time-controls` は time モード用の
  余白調整のためのクラス（`datetimepicker.css` に追加。`margin-bottom` を小さくする程度）。
- クリアの処理は今の日付・datetime 用のハンドラーを全モードで使う形にまとめる: 状態を null にし、input を空にして change、
  カレンダーがあれば再描画、時刻の列があれば選択表示を消す、閉じる、input にフォーカス。
- 有効・無効: 開いたときの時刻の初期化の後で `clearButton.disabled = (selectedHour === null)` にする
  （time モードは開くと必ず値が入るので、開いている間は有効）。

TimePicker（`timepicker.js`、`timepicker.css`）:

```html
<div class="tp-popup" ...>
  <div class="tp-controls">
    <button type="button" class="tp-clear-button">クリア</button>
  </div>
  <div class="tp-container">...</div>
</div>
```

- 見た目は日付ピッカーのクリアボタンに合わせ、色は `--tp-primary-color` を使う（`timepicker.css` に `.tp-controls`・`.tp-clear-button` を追加）。
- 押すと: `selectedHour`・`selectedMinute` を null、input を空にして change、`timeColumns.clearSelection()`、`closePicker()`、input にフォーカス。
- popup 内のクリックは今も伝播を止めているので、document のクリック処理には影響しない。

### 2.4 互換性

- 振る舞いの変更は 1 の 2〜4 だけ。公開 API（クラス、メソッド、グローバル）は変えない。
- DOM が増える（クリアボタン）。日付・datetime モードの DOM は変えない。
- TimePicker を focus で開く使い方をしていたページでは、クリックかキー操作が必要になる（README のキーボード操作の表を更新）。

## 3. テスト方針

- **先に書いて失敗を確かめるテスト**（`tests/time-open.test.js`）:
  - TimePicker: `input.focus()` だけでは開かず、値も入らない。Tab で通過しても値が入らない。
  - 開いたときの change が1回: DateTimePicker の time モード（空の値、入力済みの値）、datetime モード（日付を選んだ後に開き直す）、
    TimePicker（空の値、入力済みの値）。いずれも書き込まれる値は今と同じ（10:00 など）。
  - datetime で日付が未選択のまま開いたときは、今と同じく change が発火しない。
  - TimePicker で値が `:`（時・分のどちらも取れない）のまま開いたときは、既存の選択があってもなくても、書き込みも change も起きない。
  - change の検証では、change のリスナーの中で input の値と時・分の選択表示（`.selected` の値）を記録し、通知が最終状態で1回だけ
    起きていることを確かめる（途中の値で通知してから書き換える誤りを見逃さないため）。
  - 時・分の項目のクリック（仕様で変えない部分）も、1クリックで change 1回、通知時の値がクリック後の値であることを明示的に確かめる。
  - クリアボタン（DateTimePicker の time モード、TimePicker）: 存在し、開いた後は有効。押すと値が空・change 1回・選択表示なし・閉じる・
    input にフォーカス。もう一度開くと今と同じく現在時刻付近が入る。
- **振る舞いの記録（golden）**: 時刻まわりの記録（`datetimepicker-time`・`datetimepicker-datetime`・`timepicker`）は
  開いたときの change の回数・focus での開閉・クリアボタンの DOM が変わるので作り直す。差分が上の仕様の範囲だけであることを、
  作り直す前後の記録の比較で確かめる（値・開閉の状態の変化、change の回数）。日付の記録（`datepicker`・`datetimepicker-date`）は変わらないこと。
- **既存の特性テスト**: そのまま通ること（期待値は緩めない）。
- **最後に**: ビルド → テスト全体 → 画面確認（time モードと TimePicker のクリアボタンの見た目と動作、ダークテーマ）。

## 4. 影響

- 変更: `core/picker-core.js`、`timepicker.js`、`datetimepicker.css`、`timepicker.css`、`dist/*.js`、`README.md`（キーボード操作・機能一覧）、
  `CHANGE_LOG.md`、`tests/fixtures/golden/`（時刻まわり）
- 追加: `tests/time-open.test.js`

## レビュー記録

### 第1回（Codex、設計書）

| # | 指摘 | 重大度 | 採否 | 理由 |
|---|---|---|---|---|
| 1 | TimePicker で値が `:` のとき、無条件に書き込むと残っている選択状態から値を書き戻してしまう | minor | 採用 | 今は書き込みも change も起きない。少なくとも一方を適用したときだけ書き込むと 2.1 に明記し、回帰テストを追加 |
| 2 | change の回数と最終値だけでは、途中の値で通知する誤りを検出できない。クリック時の change も明示的に検証していない | minor | 採用 | change のリスナー内で値と選択表示を記録する方針と、クリック時の change のテストを 3 に追加 |

### 第2回（Codex、設計書の再レビュー）

指摘なし。第1回の2件への対応は妥当と確認（blocker / major なし）。
