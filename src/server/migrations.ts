import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Database } from './database.ts';

export async function migrate(db: Database): Promise<string[]> {
  const directory = path.join(process.cwd(), 'database/migrations');
  const files = (await readdir(directory)).filter(name => /^\d+_[a-z_]+\.sql$/.test(name)).sort();
  return db.transaction(async sql => {
    await sql.exec('CREATE SCHEMA IF NOT EXISTS talentlink');
    await sql.query('SELECT pg_advisory_xact_lock(7843219)');
    await sql.exec(`CREATE TABLE IF NOT EXISTS talentlink.schema_migration (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const applied: string[] = [];
    for (const name of files) {
      const content = await readFile(path.join(directory, name), 'utf8');
      const checksum = createHash('sha256').update(content).digest('hex');
      const previous = await sql.query<{ checksum: string }>('SELECT checksum FROM talentlink.schema_migration WHERE name=$1', [name]);
      if (previous[0]) {
        if (previous[0].checksum !== checksum) throw new Error(`Migration modified after application: ${name}`);
        continue;
      }
      // Legacy 001 includes transaction markers; the runner owns the enclosing transaction.
      await sql.exec(content.replace(/^\s*(?:BEGIN|COMMIT);\s*$/gmi, ''));
      await sql.query('INSERT INTO talentlink.schema_migration(name,checksum) VALUES($1,$2)', [name, checksum]);
      applied.push(name);
    }
    return applied;
  });
}
