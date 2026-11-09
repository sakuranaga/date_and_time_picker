# CHANGE_LOG

## 2026-11-09

### DP-0009 TimePicker.destroy() がイベントリスナーと overlay を外さない

- `TimePicker.destroy()` で、input（click・keydown）と document（click・focusin）のリスナーを外すようにした。
  開いていれば閉じる。最後の TimePicker を破棄したときは共有の overlay も削除する（新しい TimePicker を作るとまた作られる）。
- 今までは破棄後も入力欄のキー操作で overlay が表示され、ページが操作できなくなることがあった。

### DP-0008 時刻の列のキーボード操作

- 時・分の列をキーボードで操作できるようにした（DateTimePicker の time / datetime、TimePicker）。↑↓ で前後の時刻（移るとすぐ値が変わる）、
  Home / End で先頭・末尾、→ / ← で時と分の列の切り替え、Enter / Esc で閉じて入力欄に戻る。
- 各列で選択中の項目だけを Tab で止まれるようにした（roving tabindex）。time モードと TimePicker は、開くと選択中の「時」にフォーカスが移る。
  datetime ではフォーカストラップの対象に時・分が入り、カレンダー → 時 → 分と Tab で移動できる。
- TimePicker は、ポップアップの外の要素にフォーカスが移ると閉じる（Tab で外へ、Shift+Tab で入力欄へ）。ウィンドウの切り替えなどで
  フォーカスが文書の外に出るだけでは閉じない。ポップアップを非モーダル（`aria-modal` なし）にし、`tabindex="-1"` を付けた。
- 設計書: `docs/20261109-0942-time-keyboard.md`

### DP-0007 入力済みの値の読み込み

- DatePicker と DateTimePicker（date / datetime）が、生成時と開くときに input の値を読み、format どおりの日付ならその日を選択状態にして、
  その月を表示するようにした。HTML の `value` 属性で初期値を設定できる。datetime は「日付」と「日付 + HH:mm」の両方を読む。
- datetime で値が入っていても日付が未選択のままで、時刻を選んでも値が変わらなかった問題が直る（開いたときに日付と時刻で書き直す）。
- 形が違う値・存在しない日付は読まず、値もそのまま残す。値が選択中の日と同じなら何もしない（月を移動して開き直したときの表示は今までどおり）。
  YYYY・MM・DD のどれかがない format では読み込まない。
- README の TODO「初期値設定（data-value 属性）」を、input の value で設定する説明に置き換えた。
- 設計書: `docs/20261109-0927-read-input-value.md`

### DP-0006 datetime モードの format と README

- datetime モードで `format`（`data-format`）が日付部分に効くようにした。値は「format の日付 + 半角スペース + HH:mm」
  （例: `data-format="YYYY-MM-DD"` → `2026-01-20 14:30`）。既定は今までどおり `2026/01/20 14:30`。time モードには効かない。
- datetime で開いたときの時刻の読み取りを、値が「format の日付 + 半角スペース + HH:mm」の形のときだけにした。
  コロンを含む format で日付の末尾を時刻と誤読することがなくなる。秒付きや別の形の値からは時刻を読まず、現在時刻付近を選ぶ
  （今までは末尾の HH:mm をどこからでも読み、秒付きでは時を 30 などにしていた）。
- README に DateTimePicker の使い方・属性・モードごとの振る舞いを追加。デモの節を `demo/` の今のファイルに更新。
- 設計書: `docs/20261109-0920-datetime-format.md`

### DP-0005 minuteStep を検証しておらず負の値・0 で無限ループになる

- 分の刻み（`data-minute-step`、`minuteStep` オプション）は、60 を割り切る正の整数（1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60）だけを受け付け、
  それ以外は 30 にするようにした。今までは -15 や 0 で分の項目を作るループが終わらず、ページが固まっていた。
  7 のような 60 を割り切らない値で、存在しない分（"03" など）が入力されることもなくなる。
- `data-minute-step` は値全体を数値として読む（`"1.5"` や `"15abc"` は 30。今までは `parseInt` で 1 や 15 になっていた）。

### DP-0004 datetime モードで日付選択後にフォーカスが消え Esc で閉じられない

- datetime モードで日付を選ぶと、作り直したカレンダーの選んだ日にフォーカスを戻すようにした。Esc・Tab（フォーカストラップ）・
  矢印キーが、日付を選んだ後も効く。他の月のマスを選んだときは、その月を表示してその日にフォーカスする。

### DP-0003 矢印キー・PageUp/Down で月をまたぐと日付が飛ぶ

- カレンダーのキー操作を、有効なボタンの並び順ではなく日付で計算するようにした。←→ は1日、↑↓ は1週、PageUp/PageDown は
  前月・翌月の同じ日（ない日は月末）、Home/End は表示中の月の最初・最後の有効日。月をまたぐと表示も切り替わる。
- 選択できる範囲の外への移動は、フォーカスをそのままにする。
- 内部メソッド `focusDayByIndex()`・`getEnabledDayCount()` を削除（日付で移動するため不要になった）。

### DP-0002 分を丸めたときに時が繰り上がらない

- 時刻ピッカーを開いたときの初期値で、分を切り上げて 60 になるとき時を繰り上げるようにした（10:50・30分刻み → 11:00、23:50 → 00:00）。
  今までは 10:00 のように同じ時のまま分だけ 00 になっていた。

### DP-0001 時刻ピッカーを開いたときの振る舞いとクリアボタン

- TimePicker は focus では開かなくなった（クリック・Enter・↑↓で開く）。Tab でフォームを通過しても時刻欄に値が入らない。
- 時刻ピッカーを開いたときの書き込みと change を1回にした（今までは時と分で2回、途中の値も一瞬入っていた）。
  開いたときに現在時刻付近（入力済みならその時刻）を入れる挙動は変えていない。
- DateTimePicker の time モードと TimePicker に「クリア」ボタンを追加。押すと空にして change を発火し、閉じる。
- 設計書: `docs/20261109-0850-time-open-behavior.md`

### DP-0010 3つのピッカーのコード共通化

- DatePicker と DateTimePicker の本体を `core/picker-core.js` にまとめ、時・分の列を `core/time-columns.js` で TimePicker と共有した。
  日付・時刻の計算、祝日 CSV の読み込み、自動初期化も `core/` の関数に切り出した。
- 振る舞い・DOM・公開 API（クラス名、IIFE のグローバル、static `instances`、data 属性、CSS）は変えていない
  （既知のバグもそのまま。各課題で直す）。今の実装で作った振る舞いの記録（`tests/fixtures/golden/`）との比較、
  配布物（IIFE）のテスト、公開 API のテスト、切り出した関数の単体テストを追加。
- 設計書: `docs/20261109-0823-unify-pickers.md`

### DP-0015 テスト基盤と Docker 開発環境

- Docker 開発環境を追加（`Dockerfile`、`compose.yaml`）。install・テスト・ビルドはコンテナ内だけで行う。
  `install` は `npm audit --audit-level=high` が通ったときだけ `npm ci` する。テストとビルドはネットワークなし。
- node:test と jsdom のテスト基盤を追加（`tests/`、`npm test`）。3つのピッカーの今の振る舞いを固定する特性テストを追加。
- 依存の更新: `npm audit fix`（lockfile のみ）、`@rollup/plugin-terser` を ^1.0.2 に（serialize-javascript の high を解消）、
  `jsdom` ^30.1.3 を追加。npm audit の high は 8件 → 0件（deepmerge の low 2件は、修正が node-resolve のダウングレードになるため見送り）。
- `dist/` は依存の更新後もバイト単位で同じ（ビルド結果に変化なし）。
- 設計書: `docs/20261109-0810-test-infra.md`
