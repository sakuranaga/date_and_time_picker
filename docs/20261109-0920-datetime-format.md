# datetime モードの format と DateTimePicker の README（DP-0006）

- ステータス: Implemented
- 課題: LAP DP-0006「datetime モードが format を無視し README に DateTimePicker の記載がない」
- 作成: 2026-11-09

## 1. 仕様（2026-11-09 ユーザーと決定）

- `format`（`data-format`）は**日付部分だけ**に効く。トークンは今と同じ `YYYY`・`MM`・`DD`。
- datetime モードの値は「format で整形した日付 + 半角スペース + `HH:mm`」。時刻がまだ選ばれていなければ日付だけ（今と同じ）。
  - 例: `data-format="YYYY-MM-DD"` → `2026-01-20 14:30`
  - 既定（format なし）は `YYYY/MM/DD` なので、今の出力 `2026/01/20 14:30` は変わらない。
- time モードは format と無関係（`HH:mm` のまま）。date モードは今のまま。
- README に DateTimePicker の使い方を書く（読み込み方、`data-mode`、`data-minute-step`、`data-format` の効き方、
  `data-min-date` / `data-max-date`、モードごとの振る舞い、クリアボタン）。属性は `.date-picker-wrapper` に付けること、
  `data-mode` を省くと `date` になることも明記する。あわせて、README の「デモ」の節が古いファイル名
  （`index.html`、`multi-time-picker.html`）のままなので、`demo/` の今のファイルに直す。

## 2. 設計

- `core/picker-core.js` の `setInputValue()` の datetime の分岐で、日付部分を `formatDate(selectedDate, 'YYYY/MM/DD')` から
  `formatDate(selectedDate, this.config.format)` に変える。時刻部分の付け方は変えない。
- 開いたときの時刻の読み取り（`matchTimeValue(value, 'datetime')`）は、今は末尾の `(\d{2}):(\d{2})$` を読む。
  時刻が未選択のときの値は日付だけなので、format がコロンを含むと（例: `YYYY/MM:DD` → `2026/01:30`、`YYYY MM:DD` → `2026 01:30`）
  日付の末尾を時刻と誤読する。空白を条件にしても `YYYY MM:DD` では防げない。
- そこで datetime の時刻は、**値が「format どおりの日付 + 半角スペース + HH:mm」の形のときだけ**読む。
  - `core/date-utils.js` に `datePattern(format)` を追加する。`formatDate` と同じく最初の `YYYY`・`MM`・`DD` をそれぞれ
    `(\d+)`・`(\d{2})`・`(\d{2})` にし（年は `formatDate` がゼロ埋めしないので桁数を限らない）、それ以外の文字は正規表現としてエスケープした文字列を返す（DP-0007 で日付の読み取りにも使う）。
  - `core/time-utils.js` の datetime の読み取りを `matchDateTimeTime(value, format)` に置き換える:
    `^${datePattern(format)} (\d{2}):(\d{2})$` に一致したときだけ時・分を返す。time モードの `matchTimeValue(value, 'time')`
    （最初の `HH:mm`）は変えない。
  - このピッカーが書く時刻付きの値は必ずこの形なので、今まで読めていた値は読める（既定の format の `2026/01/20 14:30` など）。
  - 振る舞いの変化: この形に合わない値（別の format の日付、`2026/01/07 08:30:00` のような秒付き、日付だけ）は時刻を読まず、
    現在時刻付近を選ぶ。今までは末尾の `HH:mm` をどこからでも読んでいた（秒付きでは `30:00` を読み、時を 30 にしていた）。
- 変更は `setInputValue()` の datetime の分岐と、datetime の時刻の読み取り。DatePicker・TimePicker・time モードには影響しない。

## 3. テスト方針

- **先に書いて失敗を確かめるテスト**（`tests/datetime-format.test.js`）:
  - datetime + `data-format="YYYY-MM-DD"`: 日付を選ぶと `2026-01-20 10:00`、時を選ぶと `2026-01-20 14:00`。
  - datetime + `data-format="DD.MM.YYYY"`: `20.01.2026 10:00`。
  - 開き直したとき、整形済みの値の末尾の時刻（14:00）が選択表示になる（format を変えても時刻の読み取りが壊れない）。
  - コロンを含む format（`YYYY/MM:DD`）: 日付だけの値（`2026/01:30`）を入れて開くと、日付の `01:30` を時刻と読まず現在時刻付近（10:00）を選ぶ。
    時刻付きの値（`2026/01:30 14:00`）なら末尾の 14:00 を選ぶ。
  - `YYYY MM:DD`（空白とコロンを含む format）でも、日付だけの `2026 01:30` は時刻と読まず、`2026 01:30 14:00` は 14:00 を読む。
  - 単体テスト: `datePattern`（エスケープ、トークンの置き換えは最初の1回だけ）、`matchDateTimeTime`
    （`('2026/01/20 14:30', 'YYYY/MM/DD')` → 14:30、`('2026/01:30', 'YYYY/MM:DD')` → null、`('2026 01:30 14:00', 'YYYY MM:DD')` → 14:00、
    `('2026-01-20 14:30', 'YYYY/MM/DD')` → null、`('2026/01/07 08:30:00', 'YYYY/MM/DD')` → null）。
  - 境界の年: `formatDate` で整形した 999年・10000年の日付に ` 14:30` を付けた値から、`matchDateTimeTime` が 14:30 を読めること。
  - JS の `format` オプションでも同じ。
- **変わらないことのテスト**（今も通る）: datetime の既定は `2026/01/20 10:00`、time モードは `data-format` があっても `HH:mm`、
  date モードの format は今どおり、日付未選択の datetime は書き込まない。
- 既存の特性テスト: 変更なし。`matchTimeValue` の既存の単体テストのうち datetime の部分は、`matchDateTimeTime` のテストに
  置き換える（`'08:30:00'` → 30:00 だった期待値は null になる。理由をレビュー記録に書く）。
- golden: datetime の記録のうち `"2026/01/07 08:30:00"` で開くステップは、時の誤読がなくなる分だけ変わる見込み。作り直して差分を確かめる。
- **最後に**: ビルド → テスト全体。README は Markdown の表・コード例を目で確認する。画面の振る舞いは format の文字列以外変わらないので、
  画面確認は datetime のデモで値の表示を1回見る程度にする。

## 4. 影響

- 変更: `core/picker-core.js`、`core/date-utils.js`、`core/time-utils.js`、`dist/*.js`、`README.md`、`CHANGE_LOG.md`、
  `tests/core/time-utils.test.js`（datetime の読み取りのテストの置き換え）、`tests/core/date-utils.test.js`、
  `tests/fixtures/golden/datetimepicker-datetime.json`（作り直し）
- 追加: `tests/datetime-format.test.js`

## 実装時の差異

- `matchTimeValue` は time モード専用になったので、引数を値1つにした（`mode` 引数を削除。呼び出し側は time モードだけ）。
- README には設計の範囲に加えて、DatePicker と DateTimePicker を同じページで読み込まない注意を書いた
  （両方が `.date-picker-wrapper` を自動初期化するため。この衝突自体は DP-0011 で扱う）。
- golden: `datetimepicker-datetime` だけ作り直し。変わったのは秒付きの値（`2026/01/07 08:30:00`）で開くステップとその直後の DOM だけ。
- 結果: ビルド → テスト全体で 160件すべて成功。画面確認（Chrome、datetime のデモ）: 既定の format で `2026/11/20 09:30` が入り、
  開いたまま選んだ日にフォーカスがある。

## レビュー記録

### 第1回（Codex、設計書）

| # | 指摘 | 重大度 | 採否 | 理由 |
|---|---|---|---|---|
| 1 | 時刻未選択の値は日付だけなので「日付の後に必ず HH:mm が続く」は誤り。コロンを含む format では日付の末尾を時刻と誤読する | major | 採用 | datetime の時刻の読み取りを「直前に空白がある末尾の HH:mm」に変える設計を 2 に追加。振る舞いの変化と、テスト（日付だけ／時刻付き、単体テスト）を 3 に追加 |
| 補足 | README で属性を付ける場所（`.date-picker-wrapper`）と `data-mode` の既定（date）を明示する | （指摘外の提案） | 採用 | 1 の README の範囲に追記 |

### 第2回（Codex、設計書の再レビュー）

| # | 指摘 | 重大度 | 採否 | 理由 |
|---|---|---|---|---|
| 1 | 空白を条件にしても、format が `YYYY MM:DD` だと日付だけの `2026 01:30` を時刻と誤読する | major | 採用 | format から日付部分の正規表現を作り、「format どおりの日付 + 空白 + HH:mm」の値のときだけ時刻を読む設計に変更（2）。`datePattern` は DP-0007 の日付の読み取りにも使える。テストを追加（3） |
| 2 | 影響ファイルの一覧に time-utils.js、その単体テスト、golden が抜けている | minor | 採用 | 4 に追記 |

### 第3回（Codex、設計書の再レビュー）

| # | 指摘 | 重大度 | 採否 | 理由 |
|---|---|---|---|---|
| 1 | `YYYY` を `\d{4}` にすると、`formatDate` がゼロ埋めしない4桁未満の年（999年など）で自分が書いた値の時刻を読めない | minor | 採用 | 年のパターンを `(\d+)` にし、境界の年のテストを 3 に追加 |

第2回の2件への対応は妥当と確認。blocker / major なし。

### 第4回（Codex、コードレビュー）

指摘なし（blocker / major なし）。
