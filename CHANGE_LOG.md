# CHANGE_LOG

## 2026-11-09

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
