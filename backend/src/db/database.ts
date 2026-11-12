import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

/**
 * 数据库：使用 Node 内建的 SQLite（node:sqlite，需要 Node.js 22.13 以上），不用另外安装。
 * 所有资料都在一个文件里（默认 backend/data/animavox.db）。
 */
export type Database = DatabaseSync;

/** 表结构放在 backend/migrations/ 的 .sql 文件里 */
const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../migrations',
);

/** 打开数据库，并套用还没执行过的表结构变更。filePath 传 ':memory:' 时只存在内存里（测试用） */
export function openDatabase(filePath: string): Database {
  if (filePath !== ':memory:') {
    mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  }
  const db = new DatabaseSync(filePath);
  // 开启外键：删除用户或对话时，底下的资料会跟着删除（ON DELETE CASCADE）
  db.exec('PRAGMA foreign_keys = ON;');
  runMigrations(db);
  return db;
}

/**
 * 表结构变更（迁移）：按文件名顺序执行 migrations/ 里的 .sql，每个文件只执行一次。
 * 执行过的文件名记在 schema_migrations 表里，所以更新代码后重启后端，数据库就会自动升级。
 */
function runMigrations(db: Database): void {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);',
  );
  const applied = db.prepare('SELECT name FROM schema_migrations').all() as { name: string }[];
  const appliedNames = new Set(applied.map((row) => row.name));
  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql') && !appliedNames.has(name))
    .sort();

  for (const name of pending) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
    transaction(db, () => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(
        name,
        new Date().toISOString(),
      );
    });
  }
}

/** 把几个写入包成一个事务：全部成功才生效，中途出错就整批撤销 */
export function transaction(db: Database, work: () => void): void {
  db.exec('BEGIN');
  try {
    work();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
