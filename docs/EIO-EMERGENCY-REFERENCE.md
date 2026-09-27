# EIOエラー緊急リファレンス

**現在EIOエラーでターミナルが入力不可状態ですか？**このドキュメントでは、即座にできる対応を記載しています。

---

## 最速対応（1秒で試す）

### 方法1: キーボード操作のみ（見えなくても動作）

```
1. Ctrl+C を3回押す
2. Enter キーを押す
3. stty sane と盲目的に入力
4. Enter キーを押す
```

**結果：** プロンプトが復活する可能性が高い

---

### 方法2: 別ウィンドウから即座に強制終了

```
1. Cmd + N で新しいTerminalウィンドウを開く
2. 以下をコピペで実行:

ps aux | grep node
```

**表示例：**
```
user  12345  0.5  1.2  123456  89012 s000  S+ 10:30AM   0:05.23 node src/index.ts
```

3. PID（この例では12345）を特定したら：

```bash
kill -9 12345
```

---

## デバイス固有のショートカット

### macOS 完全フリーズの場合

| キー操作 | 効果 |
|---------|------|
| **Cmd + Option + Esc** | Force Quit ダイアログを開く |
| **Cmd + Option + Power** | システムを強制再起動 |

---

## スクリプト使用方法

### 別ウィンドウで復旧スクリプトを実行

```bash
# 新規ウィンドウで実行（自動で問題を修復）
bash scripts/terminal-recovery.sh recover

# プロセスを確認
bash scripts/terminal-recovery.sh check-node

# ポート8432のプロセスを強制終了
bash scripts/terminal-recovery.sh kill-port 8432

# 全リセット
bash scripts/terminal-recovery.sh full-reset
```

---

## よくあるシナリオ別対応

### シナリオ1: Node.jsプロセスが異常終了してEIO発生

**症状:**
- プロンプトが返ってこない
- 文字が見えない
- Ctrl+Cが効かない

**対応:**
```bash
# 別ウィンドウから
lsof -i :8432          # プロセス確認
kill -9 <PID>          # 強制終了
bash scripts/terminal-recovery.sh recover
```

---

### シナリオ2: ターミナルアプリ自体が凍結

**症状:**
- 新ウィンドウ作成もできない
- マウスも反応しない

**対応:**
```
1. Cmd + Option + Esc で Force Quit ダイアログ
2. Terminal を選択
3. 強制終了ボタンをクリック
4. 新しいTerminalを開く
```

---

### シナリオ3: 両方のプロセス（frontend + backend）が異常

**対応:**
```bash
# 別ウィンドウで両方を強制終了
killall -9 node

# または個別に
bash scripts/terminal-recovery.sh kill-port 3247
bash scripts/terminal-recovery.sh kill-port 8432
```

---

## エスカレーション フロー

```
問題発生
   ↓
試す: Ctrl+C × 3 + stty sane
   ├─ 成功 ✓ → 完了
   └─ 失敗 → 次へ

別ウィンドウを開く
   ↓
試す: bash scripts/terminal-recovery.sh check-node
   ├─ プロセス表示 → kill -9 <PID>
   └─ 失敗 → 次へ

Activity Monitor で強制終了
   ↓
試す: Cmd + Space → Activity Monitor
   ├─ Terminal 選択 → 強制終了
   └─ 新規ウィンドウで再開

最終手段: システム再起動
   ↓
Cmd + Option + Power キーを長押し
   → macOSが再起動
```

---

## 予防策（次回以降用）

### シェル設定を追加

```bash
bash scripts/shell-config.sh

# または手動で以下をコピーして ~/.zshrc に追加:
alias trestart='stty sane'
alias killnode='killall -9 node'
```

### package.json に復旧スクリプト追加

既存の`backend/package.json`と`frontend/package.json`に以下を追加：

```json
{
  "scripts": {
    "recovery:reset": "stty sane || true",
    "recovery:full": "bash ../scripts/terminal-recovery.sh full-reset",
    "kill:all": "killall -9 node || true",
    "kill:port": "bash ../scripts/terminal-recovery.sh kill-port"
  }
}
```

使用例：
```bash
npm run recovery:reset
npm run kill:all
```

---

## コマンドチートシート

### 最小限（3つだけ覚える）

| コマンド | 意味 |
|---------|------|
| `ps aux \| grep node` | 実行中のNode.js確認 |
| `kill -9 <PID>` | プロセス強制終了 |
| `stty sane` | ターミナルリセット |

### ポート別確認

```bash
# フロントエンド確認
lsof -i :3247

# バックエンド確認
lsof -i :8432

# 使用中全ポート確認
lsof -i
```

### 一括強制終了

```bash
# 全Node.js終了
killall -9 node

# または安全版
killall node 2>/dev/null || true
```

---

## よくある質問

**Q: 文字が見えなくても盲目的にコマンド実行可能？**

A: はい。TTYの状態が破損していても、入力は処理されます。Enterキーを押してから反応を待ってください。

---

**Q: どのコマンドが最も安全？**

A: `stty sane` が最も安全で、ほとんど副作用がありません。

---

**Q: プロセス強制終了で問題は起きない？**

A: Node.js開発中であれば問題ありません。本番環境では避けてください。

---

**Q: いつになったら元のウィンドウで復旧する？**

A: 多くの場合、`stty sane`で即座に復旧します。それ以外はターミナルを再起動する必要があります。

---

## 関連ドキュメント

詳細な情報は以下を参照してください：

| ドキュメント | 説明 |
|-----------|------|
| [EIO-ERROR-RECOVERY-GUIDE.md](./EIO-ERROR-RECOVERY-GUIDE.md) | 詳細な回復方法（8章構成） |
| [PACKAGE-JSON-SCRIPTS-GUIDE.md](./PACKAGE-JSON-SCRIPTS-GUIDE.md) | npm scriptsの設定ガイド |
| ✓ **このファイル** | 緊急時の即座対応 |

---

## 最後に

EIOエラーは **完全に回復可能** です。

最初の対応は焦らずに：
1. **落ち着く**
2. **別ウィンドウを開く**（最も効果的）
3. **スクリプトを実行**
4. **再開**

通常、30秒以内に復旧できます。
