import fs from "fs";
import path from "path";
import db, { initDb } from "./db.ts";

const BACKUP_DIR = path.join(process.cwd(), "backups-postgres");

type BackupData = {
  createdAt: string;
  tables: Record<string, any[]>;
};

function getBackupFileFromArgs() {
  const filename = process.argv[2];

  if (!filename) {
    throw new Error(
      "Falta el nombre del archivo. Ejemplo: npm run restore:postgres -- sea-tarragona-postgres-2026-04-30T10-43-13.json"
    );
  }

  const filepath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(`No existe el archivo de backup: ${filepath}`);
  }

  return filepath;
}

async function restoreTable(table: string, rows: any[]) {
  if (!rows || rows.length === 0) {
    console.log(`Tabla ${table}: sin datos`);
    return;
  }

  for (const row of rows) {
    const columns = Object.keys(row);
    const values = Object.values(row);

    const columnSql = columns
      .map((column) => `"${column}"`)
      .join(", ");

    const valueSql = columns
      .map((_, index) => `$${index + 1}`)
      .join(", ");

    const updateSql = columns
      .filter((column) => column !== "id")
      .map((column) => `"${column}" = EXCLUDED."${column}"`)
      .join(", ");

    await db.query(
      `
        INSERT INTO ${table} (${columnSql})
        VALUES (${valueSql})
        ON CONFLICT (id) DO UPDATE SET
        ${updateSql}
      `,
      values
    );
  }

  console.log(`Tabla ${table}: ${rows.length} filas restauradas`);
}

async function restore() {
  await initDb();

  const filepath = getBackupFileFromArgs();
  const raw = fs.readFileSync(filepath, "utf-8");
  const backup = JSON.parse(raw) as BackupData;

  console.log(`Restaurando backup: ${filepath}`);
  console.log(`Backup creado en: ${backup.createdAt}`);

  const tablesOrder = [
    "rules",
    "quick_templates",
    "techs",
    "jobs",
    "job_assignments",
    "logs",
  ];

  for (const table of tablesOrder) {
    await restoreTable(table, backup.tables[table] ?? []);
  }

  console.log("Restauración completada correctamente");

  await db.end();
}

restore().catch(async (error) => {
  console.error("Error restaurando backup:", error);

  try {
    await db.end();
  } catch {}

  process.exit(1);
});