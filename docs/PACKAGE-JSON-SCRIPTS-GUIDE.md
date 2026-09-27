# package.json スクリプト設定ガイド

EIOエラー対応とプロセス管理用のnpm scriptsを追加する方法を説明します。

## 概要

開発環境にターミナル復旧機能を統合するために、package.jsonに専用スクリプトを追加します。

## バックエンド（backend/package.json）用設定

### 推奨設定

```json
{
  "scripts": {
    "dev": "node --watch src/index.ts",
    "dev:safe": "node src/index.ts 2>&1 | tee logs/dev.log",
    "dev:pm2": "pm2 start src/index.ts --name ec-backend --watch",
    "start": "node dist/index.js",
    "build": "tsc",
    "test": "jest",
    "check:node": "node ../scripts/check-processes.js",
    "kill:all": "killall -9 node || true",
    "kill:port": "node ../scripts/kill-port.js 8432",
    "kill:frontend": "node ../scripts/kill-port.js 3247",
    "recovery:reset": "stty sane || true",
    "recovery:full": "bash ../scripts/terminal-recovery.sh full-reset",
    "logs:view": "tail -f logs/dev.log",
    "clean": "rm -rf dist node_modules .next"
  }
}
```

## フロントエンド（frontend/package.json）用設定

### 推奨設定

```json
{
  "scripts": {
    "dev": "vite",
    "dev:safe": "vite 2>&1 | tee logs/dev.log",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "check:node": "node ../scripts/check-processes.js",
    "kill:all": "killall -9 node || true",
    "kill:port": "node ../scripts/kill-port.js 3247",
    "kill:backend": "node ../scripts/kill-port.js 8432",
    "recovery:reset": "stty sane || true",
    "recovery:full": "bash ../scripts/terminal-recovery.sh full-reset",
    "logs:view": "tail -f logs/dev.log",
    "clean": "rm -rf dist node_modules .next"
  }
}
```

## スクリプト使用例

### 開発環境での実行

```bash
# フロントエンド（3247）のみ起動
cd frontend
npm run dev

# 別ウィンドウでバックエンド（8432）起動
cd backend
npm run dev

# ログをファイルに記録しながら実行（推奨）
npm run dev:safe
```

### プロセス確認・管理

```bash
# Node.jsプロセスを確認
npm run check:node

# ポート3247（フロントエンド）のプロセスを確認
npm run kill:frontend --dry-run

# ポート8432（バックエンド）を強制終了
npm run kill:backend

# 全Node.jsプロセスを強制終了
npm run kill:all
```

### 緊急復旧

```bash
# ターミナルの状態をリセット
npm run recovery:reset

# 完全リセット（全プロセス + キャッシュ）
npm run recovery:full
```

## ヘルパースクリプト作成

### scripts/check-processes.js

```javascript
#!/usr/bin/env node

/**
 * Check running Node.js processes and port usage
 */

const { execSync } = require('child_process');
const os = require('os');

const PORTS = {
  frontend: 3247,
  backend: 8432,
};

function checkPort(port, name) {
  try {
    const output = execSync(`lsof -i :${port} 2>/dev/null`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (output) {
      const lines = output.trim().split('\n');
      const processLine = lines[lines.length - 1];
      const parts = processLine.split(/\s+/);
      const pid = parts[1];
      const cmd = parts[8];

      console.log(`${name} (port ${port}): PID ${pid} - ${cmd}`);
      return true;
    } else {
      console.log(`${name} (port ${port}): NOT RUNNING`);
      return false;
    }
  } catch (err) {
    console.log(`${name} (port ${port}): NOT RUNNING`);
    return false;
  }
}

function checkNodeProcesses() {
  try {
    const output = execSync('ps aux | grep node | grep -v grep', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (output) {
      console.log('\nAll Node.js processes:');
      output.split('\n').forEach((line) => {
        if (line) {
          const parts = line.split(/\s+/);
          console.log(`  PID ${parts[1]}: ${parts[10]}`);
        }
      });
    } else {
      console.log('\nNo Node.js processes running');
    }
  } catch (err) {
    console.log('\nNo Node.js processes running');
  }
}

console.log('=================================');
console.log('Node.js Process Check');
console.log('=================================\n');

console.log('Port Status:');
checkPort(PORTS.frontend, 'Frontend');
checkPort(PORTS.backend, 'Backend');

checkNodeProcesses();

console.log('\n=================================');
```

### scripts/kill-port.js

```javascript
#!/usr/bin/env node

/**
 * Kill process running on specific port
 * Usage: node scripts/kill-port.js <port>
 */

const { execSync } = require('child_process');
const port = process.argv[2];

if (!port) {
  console.error('Usage: node scripts/kill-port.js <port>');
  process.exit(1);
}

try {
  // ポート使用中のプロセスを検索
  const lsofOutput = execSync(`lsof -i :${port} 2>/dev/null`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (!lsofOutput) {
    console.log(`Port ${port} is not in use`);
    process.exit(0);
  }

  const lines = lsofOutput.trim().split('\n');
  const processLine = lines[lines.length - 1];
  const parts = processLine.split(/\s+/);
  const pid = parts[1];

  console.log(`Found process on port ${port}: PID ${pid}`);
  console.log(`Killing PID ${pid}...`);

  // プロセス強制終了
  execSync(`kill -9 ${pid}`);

  console.log(`✓ Successfully killed PID ${pid}`);
  process.exit(0);
} catch (err) {
  if (err.status === 1) {
    console.log(`Port ${port} is not in use`);
    process.exit(0);
  }
  console.error('Error:', err.message);
  process.exit(1);
}
```

## Makefile 統合（オプション）

プロジェクトルートに `Makefile` を作成して、さらに簡単に実行できます：

```makefile
.PHONY: dev dev-frontend dev-backend check kill kill-all clean

# Development
dev: dev-frontend dev-backend

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && npm run dev

# Process Management
check:
	npm run check:node

kill-frontend:
	npm run kill:frontend

kill-backend:
	npm run kill:backend

kill-all:
	npm run kill:all

# Recovery
recovery:
	bash scripts/terminal-recovery.sh recover

recovery-full:
	bash scripts/terminal-recovery.sh full-reset

# Cleanup
clean:
	rm -rf node_modules
	cd frontend && rm -rf node_modules dist
	cd backend && rm -rf node_modules dist
	npm cache clean --force

# Help
help:
	@echo "Available commands:"
	@echo "  make dev              - Start both frontend and backend"
	@echo "  make dev-frontend     - Start frontend only"
	@echo "  make dev-backend      - Start backend only"
	@echo "  make check            - Check running processes"
	@echo "  make kill-frontend    - Kill frontend process"
	@echo "  make kill-backend     - Kill backend process"
	@echo "  make kill-all         - Kill all Node.js processes"
	@echo "  make recovery         - Run interactive recovery"
	@echo "  make recovery-full    - Full environment reset"
	@echo "  make clean            - Clean node_modules and caches"
```

使用例：
```bash
# フロントエンドを確認
make check

# バックエンドを終了
make kill-backend

# 全リセット
make recovery-full
```

## pm2 統合（オプション）

pm2を使用するとプロセス管理がより簡単になります：

```bash
# インストール
npm install -g pm2

# エコシステム設定ファイル (ecosystem.config.js)を作成
pm2 init

# バックエンドを開始
pm2 start backend/src/index.ts --name ec-backend --watch

# フロントエンドを開始
pm2 start "cd frontend && npm run dev" --name ec-frontend

# ログ確認
pm2 logs

# プロセス再起動
pm2 restart all

# 全プロセス停止
pm2 stop all

# 全プロセス削除
pm2 kill
```

ecosystem.config.jsの例：
```javascript
module.exports = {
  apps: [
    {
      name: 'ec-backend',
      script: './backend/src/index.ts',
      env: {
        NODE_ENV: 'development'
      },
      watch: true,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      error_file: './logs/error.log',
      out_file: './logs/out.log',
    },
    {
      name: 'ec-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './frontend',
      env: {
        VITE_API_URL: 'http://localhost:8432'
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
    }
  ]
};
```

## トラブルシューティング

### npm scriptsが見つからない場合

```bash
# package.jsonの場所確認
cat package.json | grep '"scripts"' -A 20

# 正しいディレクトリで実行
cd backend
npm run check:node

cd ../frontend
npm run check:node
```

### パーミッション問題

```bash
# スクリプトに実行権限を付与
chmod +x scripts/*.sh
chmod +x scripts/*.js
```

### 権限エラー（sudo が必要な場合）

```bash
# Node.jsを非rootで実行（推奨）
npm run dev

# やむを得ずsudoが必要な場合
sudo npm run dev
```

## まとめ

| コマンド | 目的 | 実行時間 |
|--------|------|--------|
| `npm run dev` | 開発開始 | 即座 |
| `npm run check:node` | プロセス確認 | <1秒 |
| `npm run kill:all` | 全プロセス終了 | <1秒 |
| `npm run recovery:reset` | TTYリセット | <1秒 |
| `npm run recovery:full` | 完全リセット | 5-10秒 |

これらのスクリプトを活用することで、EIOエラーからの復旧が格段に簡単になります。
