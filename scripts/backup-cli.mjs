#!/usr/bin/env node
/**
 * CLI: encrypted backup / restore / list
 *
 *   node scripts/backup-cli.mjs create
 *   node scripts/backup-cli.mjs list
 *   node scripts/backup-cli.mjs restore path/to/file.wpbak
 */
import path from "path";
import { fileURLToPath } from "url";
import { createBackup, listBackups, restoreBackup, getBackupDir } from "../server/backup/backup.mjs";
import { initDb } from "../server/db/repository.mjs";

const [, , cmd, arg] = process.argv;

function help() {
  console.log(`
WorkPass encrypted backup

  npm run backup:create
  npm run backup:list
  npm run backup:restore -- <file.wpbak>

Backup dir: ${getBackupDir()}
`);
}

async function main() {
  if (!cmd || cmd === "help" || cmd === "-h") {
    help();
    return;
  }
  if (cmd === "list") {
    console.log(JSON.stringify(listBackups(), null, 2));
    return;
  }
  if (cmd === "restore") {
    if (!arg) {
      console.error("Pfad zur .wpbak Datei erforderlich");
      process.exit(1);
    }
    // Do not open/init DB first – restore must work when SQLite is already corrupt.
    const full = path.resolve(arg);
    const r = restoreBackup(full);
    console.log(JSON.stringify(r, null, 2));
    console.log("Hinweis: Bridge danach neu starten (npm start).");
    return;
  }
  if (cmd === "create") {
    initDb();
    const r = createBackup();
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  help();
  process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
