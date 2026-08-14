/**
 * Admin ops health: sqlite, backups, webhook, pipeline, quarantine files.
 */
import { existsSync, readdirSync, statSync } from "fs";
import path from "path";
import { getSqlitePath, sqliteFileIntegrityOk } from "./db/sqlite.mjs";
import { listBackups, getBackupDir } from "./backup/backup.mjs";
import { getLastWebhookStatus } from "./notify.mjs";
import { autoPipelineStatus } from "./auto-pipeline.mjs";
import { syncHealth } from "./db/repository.mjs";
import { resolveDataDir } from "./paths.mjs";
import { humanFinalPublicInfo } from "./policy/human-final.mjs";

export function buildOpsHealth() {
  const sqlitePath = getSqlitePath();
  let integrityOk = null;
  try {
    if (existsSync(sqlitePath)) {
      integrityOk = sqliteFileIntegrityOk(sqlitePath);
    } else {
      integrityOk = false;
    }
  } catch {
    integrityOk = null;
  }

  const dataDir = (() => {
    try { return resolveDataDir(); } catch { return path.dirname(sqlitePath); }
  })();

  let quarantine = [];
  try {
    quarantine = readdirSync(dataDir)
      .filter((f) => /\.corrupt-|pre-restore-|\.bad-/.test(f))
      .map((f) => {
        const full = path.join(dataDir, f);
        let size = 0;
        try { size = statSync(full).size; } catch { /* */ }
        return { name: f, size };
      })
      .slice(0, 20);
  } catch { /* */ }

  const backups = listBackups();
  const webhook = getLastWebhookStatus();
  const pipeline = autoPipelineStatus();
  const storage = syncHealth();

  const issues = [];
  if (integrityOk === false) issues.push("SQLite integrity_check fehlgeschlagen oder Datei fehlt");
  if (integrityOk == null) issues.push("SQLite integrity konnte nicht geprüft werden (Datei gesperrt?)");
  if (!backups.length) issues.push("Keine .wpbak Backups");
  if (webhook && webhook.ok === false) issues.push("Platform-Webhook zuletzt fehlgeschlagen");
  if (quarantine.length) issues.push(`${quarantine.length} Quarantäne-/Backup-Restdatei(en)`);

  return {
    ok: issues.length === 0,
    kind: "admin.ops_health.v1",
    at: new Date().toISOString(),
    sqlite: {
      path: sqlitePath,
      exists: existsSync(sqlitePath),
      integrityOk,
    },
    backups: {
      dir: getBackupDir(),
      count: backups.length,
      newest: backups[0]
        ? { fileName: backups[0].fileName, mtime: backups[0].mtime, meta: backups[0].meta }
        : null,
    },
    webhook,
    autoPipeline: {
      enabled: pipeline.enabled,
      running: pipeline.running,
      lastTickAt: pipeline.lastTickAt,
      lastSuccessAt: pipeline.lastSuccessAt,
    },
    storage,
    quarantine,
    issues,
    policy: humanFinalPublicInfo(),
    hints: [
      "Bei SQLite-Korruption: Auto-Restore aus .wpbak oder WORKPASS_RESET_CORRUPT_DB=1 (Datenverlust).",
      "Backup-Scheduler: WORKPASS_BACKUP_INTERVAL_HOURS=24",
      "KI darf keine Steuerwerte setzen – Ops bleiben menschlich.",
    ],
  };
}
