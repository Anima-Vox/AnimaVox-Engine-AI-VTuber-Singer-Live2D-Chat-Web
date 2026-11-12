import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

// 用 require 载入 node:sqlite：部分打包与测试工具（例如 Vitest 2 用的 Vite 5）还不认得这个内置模块
const { DatabaseSync } = createRequire(import.meta.url)(
  'node:sqlite',
) as typeof import('node:sqlite');

/** 迁移文件放在 backend/migrations/，按文件名顺序执行，每个只执行一次 */
const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../migrations',
);

export type Database = DatabaseSyncType;

/**
 * 打开 SQLite 数据库并套用还没执行过的迁移。
 * 使用 Node 内置的 node:sqlite（需要 Node.js 22.13 以上），不需要另外安装套件。
 */
export function openDatabase(filePath: string): Database {
  if (filePath !== ':memory:') {
    mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  }
  const db = new DatabaseSync(filePath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (filePath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  runMigrations(db);
  return db;
}

export function runMigrations(db: Database, dir: string = MIGRATIONS_DIR): string[] {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);',
  );
  const applied = new Set(
    (db.prepare('SELECT name FROM schema_migrations').all() as { name: string }[]).map(
      (row) => row.name,
    ),
  );
  const pending = readdirSync(dir)
    .filter((name) => name.endsWith('.sql') && !applied.has(name))
    .sort();

  for (const name of pending) {
    const sql = readFileSync(path.join(dir, name), 'utf8');
    transaction(db, () => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(
        name,
        new Date().toISOString(),
      );
    });
  }
  return pending;
}

/** 在一个事务里执行；出错时整批撤销 */
export function transaction<T>(db: Database, work: () => T): T {
  db.exec('BEGIN');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
