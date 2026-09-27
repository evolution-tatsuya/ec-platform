# EIOエラー後のターミナル入力不可状態からの回復ガイド

## 概要

macOS上でNode.jsやプロセス実行中にEIOエラーが発生した後、ターミナルが入力不可状態になる問題の回復方法を網羅的に記載します。

**EIO = Input/Output Error（入出力エラー）**

このエラーは、プロセスが既に閉じられたターミナルに出力しようとしたときに発生することが多いです。

---

## 1. 即座の回復方法（キーボード操作のみ）

### 1.1 最初に試すべき操作（順序重要）

| 操作 | 効果 | 見えるか |
|------|------|---------|
| **Ctrl+C** | プロセス中断、プロンプト復帰 | 見えない可能性 |
| **Ctrl+U** | 入力行を全削除 | 見えない可能性 |
| **Ctrl+L** | 画面クリア（入力は保持） | 見えない可能性 |
| **Return** | 行を送信 | 見えない可能性 |

**文字が見えない状態での対処：**
```
1. Ctrl+C を押す
2. 何も反応がなければ Ctrl+U を押す
3. その後 Ctrl+L を押す
4. Return キーを押す
```

これらの操作は、キーボード入力が無効でも裏側で実行される可能性があります。

---

## 2. ターミナルリセットコマンド

### 2.1 `stty sane` - 最も効果的な復旧方法

**文字が見えない状態でも実行可能です：**

```bash
# 見えなくても以下を盲目的に入力
stty sane
```

**何が起こるか：**
- TTY（ターミナル）の状態をリセット
- エコー機能（画面への出力）を復元
- 制御文字をデフォルトに戻す

**実行後の結果：**
```
# 入力後、プロンプトが復活する可能性が高い
$ stty sane
$  <- プロンプトが見える状態に戻る
```

### 2.2 `reset` コマンド

```bash
reset
```

**特徴：**
- より包括的なリセット
- ターミナルの色設定も初期化
- `stty sane`より時間がかかる可能性

**使い分け：**
- `stty sane` - 軽度の入出力状態問題
- `reset` - `stty sane`が効かない場合

### 2.3 詳細な `stty` 設定確認

```bash
# 現在のTTY状態を確認
stty -a

# よくある不正な状態の例
# - icanon off （行編集無効）
# - echo off （画面出力無効）
# - isig off （Ctrl+Cが効かない）
```

---

## 3. TTY状態の詳細な復元方法

入力が全く反応しない場合の個別設定修正：

```bash
# 画面出力を有効化（最重要）
stty echo

# 行編集を有効化（Backspaceなど）
stty icanon

# Ctrl+C / Ctrl+Z など制御文字を有効化
stty isig

# まとめて実行（最も効果的）
stty echo icanon isig
```

**段階的な復旧流れ：**

```bash
# ステップ1: 最小限の復旧
stty echo icanon

# ステップ2: 失敗したら強制リセット
stty sane

# ステップ3: 全リセット
reset
```

---

## 4. プロセス強制終了方法

### 4.1 Activity Monitorを使用（UI方式）

**ステップ：**
1. **Cmd + Space** → Spotlight検索
2. 「Activity Monitor」と入力 → Return
3. 「Node.js」または対象プロセスを検索
4. 選択して「強制終了」ボタンをクリック

**メリット：**
- マウス操作で確実
- どのプロセスを終了しているか視覚的に確認可能

### 4.2 別ターミナルウィンドウから強制終了

**新しいターミナルを開く：**
1. **Cmd + N** （新しいウィンドウを開く）
   または
2. **Cmd + T** （新しいタブを開く）

**プロセス確認・終了：**
```bash
# 実行中のNode.jsプロセスを全て確認
ps aux | grep node

# 特定のポート（例: 8432）を使用しているプロセスを確認
lsof -i :8432

# PIDが分かったら強制終了
kill -9 <PID>

# または全てのNode.jsプロセスを強制終了（注意！）
killall -9 node
```

### 4.3 ポート別プロセス確認・終了

```bash
# フロントエンド（ポート 3247）を使用しているプロセス
lsof -i :3247
# 出力例:
# COMMAND   PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node    12345  user   14u  IPv4  xxxxx      0t0  TCP localhost:3247 (LISTEN)

kill -9 12345

# バックエンド（ポート 8432）を使用しているプロセス
lsof -i :8432
kill -9 <PID>
```

### 4.4 全ターミナルセッションのプロセスを確認

```bash
# 現在のシェルのプロセスツリーを確認
ps aux | head -20

# 特定ユーザーのNode.jsプロセスのみ表示
ps aux | grep node | grep -v grep

# 最も負荷が高いプロセスを表示
ps aux --sort=-%cpu | head -10
```

---

## 5. ターミナル再起動以外の完全な復旧流れ

### 5.1 推奨される復旧手順（ステップバイステップ）

**フェーズ1: 現在のターミナルからの復旧試行**

```
1. Ctrl+C を3回押す
   └─ 反応なし → フェーズ2へ

2. 10秒待つ
   └─ 何か出力が出るか様子見

3. stty sane を盲目的に入力（見えなくても）
   └─ 改善なし → フェーズ2へ
```

**フェーズ2: 別ターミナルからの確認・強制終了**

```
1. 新しいターミナルウィンドウを開く
   └─ Cmd + N または Cmd + T

2. プロセス確認
   ps aux | grep node
   lsof -i :8432
   lsof -i :3247

3. 必要に応じて強制終了
   kill -9 <PID>
   または
   killall -9 node

4. 10秒待つ
```

**フェーズ3: 元のターミナルをテスト**

```
1. 元のターミナルウィンドウをクリック
   └─ フォーカスを戻す

2. Ctrl+C を押す
   └─ プロンプトが戻るか確認

3. ls を入力して Return
   └─ コマンドが実行されるか確認

4. stty -a で確認
   └─ echo on / icanon on であることを確認
```

**フェーズ4: ターミナルが完全に応答しない場合**

```
1. Activity Monitorで対象プロセスを強制終了
   └─ Cmd + Space → Activity Monitor

2. Cmd + W でターミナルタブを閉じる
   └─ プロセスツリーも自動終了

3. 新しいターミナルを開く
   └─ Cmd + N で新規ウィンドウ
```

---

## 6. 予防策（次回以降の発生を防ぐ）

### 6.1 Node.js実行時の安全な実装

**エラーハンドリングの強化：**

```typescript
// backend/src/index.ts
import process from 'process';

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// 未処理のPromise拒否をキャッチ
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

### 6.2 バックグラウンドプロセスの安全な実行

**ダイレクト実行（非推奨）：**
```bash
# 危険: プロセスがゾンビ化する可能性
node index.js &
```

**ファイルリダイレクト（改善）：**
```bash
# ログファイルに出力
node index.js > logs/app.log 2>&1 &

# 終了時はプロセスIDを記録して kill
kill <PID>
```

**プロセスマネージャー使用（推奨）：**
```bash
# pm2をインストール
npm install -g pm2

# プロセス管理で実行
pm2 start src/index.ts --name "ec-backend"

# ログ確認
pm2 logs ec-backend

# 強制終了が必要な場合
pm2 kill
```

### 6.3 開発環境での安全な構成

**package.json の scripts セクション：**

```json
{
  "scripts": {
    "dev": "node --watch src/index.ts",
    "dev:safe": "node src/index.ts 2>&1 | tee logs/dev.log",
    "dev:pm2": "pm2 start src/index.ts --name dev-backend --watch",
    "kill:all": "killall -9 node || true",
    "kill:port": "lsof -i :8432 | grep -v COMMAND | awk '{print $2}' | xargs kill -9"
  }
}
```

**使用例：**
```bash
# 開発モード（通常）
npm run dev

# EIO発生時の緊急リセット
npm run kill:all

# 特定ポートのプロセスを終了
npm run kill:port
```

### 6.4 macOS固有の設定

**ターミナルの自動設定スクリプト：**

```bash
# ~/.zshrc または ~/.bash_profile に追加

# ターミナル初期化関数
function term-reset() {
  stty sane
  echo "Terminal reset complete"
}

# Node.jsプロセス確認関数
function check-node() {
  echo "=== Node.js processes ==="
  ps aux | grep node | grep -v grep
  echo ""
  echo "=== Ports in use ==="
  lsof -i :3247
  lsof -i :8432
}

# 全プロセス強制終了関数
function kill-node() {
  echo "Killing all Node.js processes..."
  killall -9 node
  sleep 1
  echo "Done. Verifying..."
  check-node
}

# エイリアス設定
alias trestart='term-reset'
alias checknode='check-node'
alias killnode='kill-node'
```

**使用方法：**
```bash
# ターミナルをリセット
trestart

# Node.jsプロセスを確認
checknode

# 全プロセスを強制終了
killnode
```

### 6.5 EIO発生時の対応フロー図

```
┌─────────────────────────────────────┐
│ EIOエラー発生                         │
│ 入力が効かない状態                    │
└──────────┬──────────────────────────┘
           │
      ┌────▼─────┐
      │ Ctrl+C   │
      └────┬─────┘
           │
      ┌────▼────────┐ YES
      │ 復帰した？   ├────────────► 通常通り使用可能
      └────┬────────┘
           │ NO
      ┌────▼──────────────┐
      │ stty sane 実行     │
      └────┬──────────────┘
           │
      ┌────▼────────┐ YES
      │ 復帰した？   ├────────────► 通常通り使用可能
      └────┬────────┘
           │ NO
      ┌────▼──────────────────┐
      │ 新ウィンドウで確認     │
      │ check-node / ps aux   │
      └────┬──────────────────┘
           │
      ┌────▼──────────────┐
      │ プロセス確認      │
      └────┬──────────────┘
           │
      ┌────▼──────────────┐
      │ kill -9 <PID>     │
      └────┬──────────────┘
           │
      ┌────▼────────┐ YES
      │ 復帰した？   ├────────────► 完全回復
      └────┬────────┘
           │ NO
      ┌────▼──────────────────┐
      │ Activity Monitor      │
      │ で強制終了            │
      └────┬──────────────────┘
           │
      ┌────▼────────┐
      │ 新ウィンドウ │
      │ 使用開始     │
      └──────────────┘
```

---

## 7. トラブルシューティング

### 7.1 `stty sane` を実行しても効かない場合

```bash
# より強力なリセット
reset

# それでもダメな場合、詳細確認
stty -a

# 特定の設定を強制
stty echo icanon isig rows 24 cols 80
```

### 7.2 プロセスを kill -9 しても終了しない場合

```bash
# ゾンビプロセスの確認
ps aux | grep Z

# キャッシュをクリア
sudo dscacheutil -flushcache

# macOSを再起動（最終手段）
sudo reboot
```

### 7.3 ターミナルアプリ自体が応答しない場合

**方法1: Activity Monitorから強制終了**
- Cmd + Space → Activity Monitor
- Terminal を検索
- 「強制終了」をクリック

**方法2: killall コマンド（別ウィンドウから）**
```bash
killall Terminal
# または
killall iTerm2
```

**方法3: ショートカットで再起動**
- Cmd + Option + Esc
- Terminal を選択
- 「強制終了」をクリック
- 新しいTerminalウィンドウを開く

---

## 8. 参考資料

### 8.1 関連コマンド一覧

| コマンド | 説明 |
|--------|------|
| `stty sane` | TTY状態を初期化 |
| `reset` | ターミナルを完全リセット |
| `stty -a` | TTY設定を確認 |
| `ps aux` | 全プロセスを表示 |
| `ps aux \| grep node` | Node.jsプロセスを表示 |
| `lsof -i :PORT` | 特定ポートを使用中のプロセス確認 |
| `kill -9 PID` | プロセスを強制終了 |
| `killall node` | 全Node.jsプロセスを終了 |
| `Ctrl+C` | プロセス中断 |
| `Ctrl+U` | 入力行削除 |
| `Ctrl+L` | 画面クリア |
| `Cmd + N` | 新しいTerminalウィンドウ |
| `Cmd + T` | 新しいTerminalタブ |

### 8.2 シェル設定ファイル

- **Zsh（デフォルト）**: `~/.zshrc`
- **Bash**: `~/.bash_profile` または `~/.bashrc`

上記で紹介した関数をこれらのファイルに追加して、シェルを再起動します：

```bash
# ファイルを編集
nano ~/.zshrc

# 変更を反映
source ~/.zshrc
```

---

## 9. サマリー - 最も効果的な対処法

| 状況 | 対処法 | 実行可能性 |
|------|------|---------|
| 軽度（少し遅い） | Ctrl+C を3回 | 見えなくても実行可能 |
| 中度（全く反応しない） | stty sane | 見えなくても実行可能 |
| 重度（コマンド入力不可） | 新ウィンドウから kill -9 | 確実に実行可能 |
| 極度（ターミナルアプリ凍結） | Activity Monitorで強制終了 | UI操作で確実 |
| 完全復旧 | 新ウィンドウで開発再開 | 即座に実行可能 |

---

## 更新履歴

- **2025-05-28**: 初版作成
  - EIOエラーの原因と回復方法を網羅
  - macOS固有の操作方法を記載
  - 予防策とベストプラクティス追加
