# CHANGE_LOG

## 2026-11-09

### DP-0015 テスト基盤と Docker 開発環境

- Docker 開発環境を追加（`Dockerfile`、`compose.yaml`）。install・テスト・ビルドはコンテナ内だけで行う。
  `install` は `npm audit --audit-level=high` が通ったときだけ `npm ci` する。テストとビルドはネットワークなし。
- node:test と jsdom のテスト基盤を追加（`tests/`、`npm test`）。3つのピッカーの今の振る舞いを固定する特性テストを追加。
- 依存の更新: `npm audit fix`（lockfile のみ）、`@rollup/plugin-terser` を ^1.0.2 に（serialize-javascript の high を解消）、
  `jsdom` ^30.1.3 を追加。npm audit の high は 8件 → 0件（deepmerge の low 2件は、修正が node-resolve のダウングレードになるため見送り）。
- `dist/` は依存の更新後もバイト単位で同じ（ビルド結果に変化なし）。
- 設計書: `docs/20261109-0810-test-infra.md`
