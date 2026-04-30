import fs from "fs";
import path from "path";
import db, { initDb } from "./db.ts";

const BACKUP_DIR = path.join(process.cwd(), "backups-postgres");

const TABLES = [
  "techs",
  "jobs",
  "logs",
  "rules",
  "quick_templates",
  "job_assignments",
];

function getTimestamp() {
  const now = new Date();

  return now
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "");
}

async function backup() {
  await initDb();

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const data: Record<string, unknown[]> = {};

  for (const table of TABLES) {
    const result = await db.query(`SELECT * FROM ${table} ORDER BY id ASC`);
    data[table] = result.rows;
  }

  const output = {
    createdAt: new Date().toISOString(),
    tables: data,
  };

  const filename = `sea-tarragona-postgres-${getTimestamp()}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`Backup creado correctamente: ${filepath}`);

  await db.end();
}

backup().catch(async (error) => {
  console.error("Error creando backup:", error);

  try {
    await db.end();
  } catch {}

  process.exit(1);
});