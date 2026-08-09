const IDB_NAME = "md-viewer-sqlite";
const IDB_STORE = "sqlite-db";
const IDB_KEY = "database";

let idbPromise: Promise<Awaited<ReturnType<typeof import("idb").openDB>>> | null = null;

async function getIdb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!idbPromise) {
    const { openDB } = await import("idb");
    idbPromise = openDB(IDB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      },
    });
  }
  return idbPromise;
}

async function saveToIndexedDB(db: import("sql.js").Database): Promise<void> {
  const data = db.export();
  const idb = await getIdb();
  await idb.put(IDB_STORE, data, IDB_KEY);
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 300;

function debouncedSave(db: import("sql.js").Database): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    void saveToIndexedDB(db);
  }, SAVE_DEBOUNCE_MS);
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    workspaceId TEXT NOT NULL DEFAULT 'default',
    folderId TEXT
  );
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    workspaceId TEXT NOT NULL,
    parentFolderId TEXT,
    name TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

let dbPromise: Promise<import("sql.js").Database> | null = null;

export async function getSqliteDb(): Promise<import("sql.js").Database> {
  if (typeof window === "undefined") {
    throw new Error("SQLite is only available in the browser");
  }
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    // Open IndexedDB first so md-viewer-sqlite appears in DevTools even if WASM fails
    const idb = await getIdb();
    const initSqlJs = (await import("sql.js")).default;
    const SQL = await initSqlJs({
      locateFile: (file) => `/${file}`,
    });

    const savedData = (await idb.get(IDB_STORE, IDB_KEY)) ?? null;
    const db = savedData ? new SQL.Database(savedData as Uint8Array) : new SQL.Database();
    db.run(SCHEMA);

    // Migrate existing documents table (add workspaceId, folderId if missing)
    try {
      db.run("ALTER TABLE documents ADD COLUMN workspaceId TEXT NOT NULL DEFAULT 'default'");
    } catch {
      /* column exists */
    }
    try {
      db.run("ALTER TABLE documents ADD COLUMN folderId TEXT");
    } catch {
      /* column exists */
    }

    // Ensure default workspace exists
    db.run(
      "INSERT OR IGNORE INTO workspaces (id, name, createdAt) VALUES ('default', 'Default', ?)",
      [Date.now()]
    );
    debouncedSave(db);

    return db;
  })();

  return dbPromise;
}

export async function sqlExec(
  db: import("sql.js").Database,
  sql: string,
  params: (string | number)[] = []
): Promise<void> {
  db.run(sql, params);
  debouncedSave(db);
}

export async function sqlQuery<T>(
  db: import("sql.js").Database,
  sql: string,
  params: (string | number)[] = []
): Promise<T[]> {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export async function saveSqliteDb(db: import("sql.js").Database): Promise<void> {
  await saveToIndexedDB(db);
}

/** Flush debounced IndexedDB write immediately (e.g. before a full page reload). */
export async function flushPendingSqliteSave(): Promise<void> {
  if (typeof window === "undefined") return;
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (!dbPromise) return;
  const db = await dbPromise;
  await saveToIndexedDB(db);
}
