import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "server", "sea-tarragona.db");
const db = new Database(dbPath);

// =========================================================
// CREAR TABLAS BASE
// =========================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quick_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    area TEXT NOT NULL,
    mode TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS techs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    blocked INTEGER NOT NULL DEFAULT 0,
    currentJobId INTEGER,
    competencies TEXT NOT NULL DEFAULT '{}',
    priorities TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area TEXT NOT NULL,
    plate TEXT NOT NULL,
    urgent INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    assignedNames TEXT NOT NULL DEFAULT '[]',
    reason TEXT NOT NULL,
    createdAtMs INTEGER NOT NULL,
    startedAtMs INTEGER,
    closedAtMs INTEGER,
    template TEXT,
    quickEntryLabel TEXT,
    quickEntryMode TEXT,
    actualMinutes INTEGER
  );

  CREATE TABLE IF NOT EXISTS job_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jobId INTEGER NOT NULL,
    techName TEXT NOT NULL,
    role TEXT NOT NULL,
    FOREIGN KEY(jobId) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS logs (
    id REAL PRIMARY KEY,
    time TEXT NOT NULL,
    text TEXT NOT NULL
  );
`);

// =========================================================
// MIGRACIONES DE COLUMNAS
// =========================================================

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  const exists = columns.some((c) => c.name === column);

  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    console.log(`Columna añadida: ${table}.${column}`);
  }
}

// quick_templates
ensureColumn("quick_templates", "allowedTechs", "TEXT");
ensureColumn("quick_templates", "priorityOrder", "TEXT");

// techs
ensureColumn("techs", "avatar", "TEXT");

// jobs y techs legacy safety
ensureColumn("jobs", "assignedNames", "TEXT NOT NULL DEFAULT '[]'");
ensureColumn("techs", "competencies", "TEXT NOT NULL DEFAULT '{}'");
ensureColumn("techs", "priorities", "TEXT NOT NULL DEFAULT '{}'");
ensureColumn("jobs", "workedAccumulatedMinutes", "INTEGER");
ensureColumn("jobs", "pausedAccumulatedMinutes", "INTEGER");
ensureColumn("jobs", "pausedAtMs", "INTEGER");
export default db;