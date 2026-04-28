const fs = require("fs");
const path = require("path");

const root = process.cwd();
const source = path.join(root, "server", "sea-tarragona.db");
const backupDir = path.join(root, "backups");

function pad(n) {
  return String(n).padStart(2, "0");
}

function timestamp() {
  const d = new Date();
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
  ].join("-") + "_" + [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join("-");
}

if (!fs.existsSync(source)) {
  console.error("No existe la base de datos:", source);
  process.exit(1);
}

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const target = path.join(backupDir, `sea-tarragona-${timestamp()}.db`);
fs.copyFileSync(source, target);

console.log("Copia creada:", target);