import pg from "pg";

let _pool: pg.Pool | null = null;

/** Called once during server startup after the DB connection is established. */
export function setPool(pool: pg.Pool) {
  _pool = pool;
}

/** Returns the shared pg.Pool. Throws if called before setPool(). */
export function getPool(): pg.Pool {
  if (!_pool) throw new Error("DB pool not initialized — call setPool() first");
  return _pool;
}
