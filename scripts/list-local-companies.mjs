import { sqliteAll, getSqlitePath } from "./server/db/sqlite.mjs";

process.env.WORKPASS_SQLITE_PATH = process.env.WORKPASS_SQLITE_PATH || "C:/data/workpass-local.sqlite";
console.log("db", getSqlitePath());
const tables = sqliteAll("SELECT name FROM sqlite_master WHERE type='table'");
console.log("tables", tables.map((t) => t.name));
for (const name of ["companies", "company", "tenants"]) {
  if (tables.some((t) => t.name === name)) {
    try {
      console.log(name, sqliteAll(`SELECT * FROM ${name} LIMIT 10`));
    } catch (e) {
      console.log(name, e.message);
    }
  }
}
