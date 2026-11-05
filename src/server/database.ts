import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import path from 'node:path';

export interface Sql {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<T[]>;
  exec(text: string): Promise<void>;
}
export interface Database extends Sql {
  transaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
type PoolLike={
  query(text:string,values?:unknown[]):Promise<{rows:unknown[]}>;
  connect():Promise<{query(text:string,values?:unknown[]):Promise<{rows:unknown[]}>;release():void}>;
  end():Promise<void>;
};

export async function embeddedDatabase(directory?: string): Promise<Database> {
  const db = new PGlite(directory);
  await db.exec('SET search_path TO talentlink, public');
  const adapt = (executor: Pick<PGlite, 'query' | 'exec'>): Sql => ({
    async query<T>(text: string, values: unknown[] = []) { return (await executor.query(text, values)).rows as T[]; },
    async exec(text) { await executor.exec(text); },
  });
  return {
    ...adapt(db),
    transaction: fn => db.transaction(tx => fn(adapt(tx))),
    close: () => db.close(),
  };
}

export function postgresDatabase(connectionString: string): Database {
  // No disabled certificate validation. TLS is configured through the connection URL.
  const parsed=new URL(connectionString);
  if(['prefer','require','verify-ca'].includes(parsed.searchParams.get('sslmode')||''))parsed.searchParams.set('sslmode','verify-full');
  if(process.env.NODE_ENV==='production'&&!['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)&&parsed.searchParams.get('sslmode')!=='verify-full')throw new Error('Remote PostgreSQL requires verified TLS in production');
  const pool = new Pool({ connectionString:parsed.toString(), max: 5, connectionTimeoutMillis: 20_000,query_timeout:30_000,
    idleTimeoutMillis: 30_000 });
  pool.on('error', () => console.error('talentlink_database_pool_error'));
  return poolDatabase(pool);
}
export function poolDatabase(pool:PoolLike):Database {
  const database:Database = {
    async query<T>(text: string, values: unknown[] = []) { return database.transaction(sql=>sql.query<T>(text,values)); },
    async exec(text) { await database.transaction(sql=>sql.exec(text)); },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Transaction-scoped settings also work with PgBouncer/Neon pooled URLs.
        await client.query('SET LOCAL search_path TO talentlink, public');
        const value = await fn({
          async query<T>(text: string, values: unknown[] = []) { return (await client.query(text, values)).rows as T[]; },
          async exec(text) { await client.query(text); },
        });
        await client.query('COMMIT');
        return value;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    close: () => pool.end(),
  };
  return database;
}

const singleton = globalThis as typeof globalThis & { talentlinkDb?: Promise<Database> };
export function getDatabase(): Promise<Database> {
  if (!singleton.talentlinkDb) {
    singleton.talentlinkDb = (async () => {
      if (process.env.DB_DRIVER === 'pglite') {
        if (process.env.NODE_ENV === 'production') throw new Error('Embedded database is development-only');
        const directory=path.resolve(process.env.PGLITE_PATH||'.local/pgdata');
        if(!directory.startsWith(path.resolve('.local')+path.sep))throw new Error('Development data must remain inside .local');
        return embeddedDatabase(directory);
      }
      const url = process.env.DATABASE_URL;
      if (!url || !/^postgres(?:ql)?:\/\//.test(url)) throw new Error('PostgreSQL is not configured');
      if(new URL(url).hostname.endsWith('.neon.tech')){
        const {Pool:NeonPool,neonConfig}=await import('@neondatabase/serverless');
        neonConfig.webSocketConstructor=WebSocket;
        neonConfig.useSecureWebSocket=true;
        const pool=new NeonPool({connectionString:url,max:5,connectionTimeoutMillis:20_000,query_timeout:30_000,
          idleTimeoutMillis:30_000});
        pool.on('error',()=>console.error('talentlink_database_pool_error'));
        return poolDatabase(pool);
      }
      return postgresDatabase(url);
    })().catch(error => { singleton.talentlinkDb = undefined; throw error; });
  }
  return singleton.talentlinkDb;
}
