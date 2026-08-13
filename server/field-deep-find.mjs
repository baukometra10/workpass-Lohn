/**
 * Deep-scan platform JSON for known HR/payroll fields (SV, KK, hours, hourly rate).
 */

function isPlainObject(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function asText(v) {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    const s = String(v).trim();
    return s;
  }
  if (isPlainObject(v)) {
    return String(
      v.name || v.label || v.title || v.value || v.number || v.nr || v.code || ""
    ).trim();
  }
  return "";
}

/**
 * Breadth-first search for the first string/number whose key matches a regex.
 */
export function deepFindByKey(root, keyRe, { maxDepth = 7, maxNodes = 400 } = {}) {
  if (root == null) return "";
  const queue = [{ node: root, depth: 0 }];
  let seen = 0;
  while (queue.length && seen < maxNodes) {
    const { node, depth } = queue.shift();
    seen += 1;
    if (Array.isArray(node)) {
      if (depth >= maxDepth) continue;
      for (const item of node) {
        if (item && typeof item === "object") queue.push({ node: item, depth: depth + 1 });
      }
      continue;
    }
    if (!isPlainObject(node)) continue;
    for (const [key, val] of Object.entries(node)) {
      if (keyRe.test(String(key))) {
        const text = asText(val);
        if (text) return text;
      }
      if (depth < maxDepth && val && typeof val === "object") {
        queue.push({ node: val, depth: depth + 1 });
      }
    }
  }
  return "";
}

export function deepFindNumberByKey(root, keyRe, opts = {}) {
  const raw = deepFindByKey(root, keyRe, opts);
  if (!raw) return 0;
  const n = Number(String(raw).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Collect shallow+nested key names for diagnostics (no values). */
export function collectKeyPaths(root, { maxDepth = 3, maxPaths = 80 } = {}) {
  const out = [];
  const walk = (node, prefix, depth) => {
    if (!node || typeof node !== "object" || out.length >= maxPaths) return;
    if (Array.isArray(node)) {
      if (node[0] && typeof node[0] === "object") walk(node[0], `${prefix}[]`, depth + 1);
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${k}` : k;
      out.push(path);
      if (out.length >= maxPaths) return;
      if (depth < maxDepth && v && typeof v === "object") walk(v, path, depth + 1);
    }
  };
  walk(root, "", 0);
  return out;
}

export const KEY_RE = {
  insuranceNo: /sv_?nr|svnr|svnumber|insurance_?no|insurance_?number|social_?security|sozialversicher|versicherungsnummer|rv_?nr|kv_?nr/i,
  healthFund: /krankenkasse|health_?fund|health_?insurance|kk_?name|krankenversicherung|gesetzliche_?kv|^kk$/i,
  hourlyRate: /stundenlohn|hourly_?rate|hour_?rate|rate_?per_?hour|lohn_?pro_?stunde|wage_?rate|hourwage/i,
  monthHours: /^(hours|stunden|worked_?hours|total_?hours|attendance_?hours|month_?hours|stundenzahl)$/i,
  workDays: /^(days|arbeitstage|work_?days|attendance_?days)$/i,
};
