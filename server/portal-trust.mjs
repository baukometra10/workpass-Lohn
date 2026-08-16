/**
 * Portal delivery trust + rule-based anomalies + payroll simulation (no persist/release).
 */
import { listPayrollJobs, loadCompany } from "./db/repository.mjs";
import { listAllDeliveries } from "./delivery-queue.mjs";
import { normalizeCompanyId, normalizeEmployeeId } from "./tenant.mjs";
import { currentPeriod } from "./month-close.mjs";
import { isDemoPayrollJob } from "./demo-detect.mjs";
import { getPayrollCore } from "./engine.mjs";
import { employeeSyncReadiness, monthOverview } from "./portal-service.mjs";
import { assertNotAiApplyingLaw } from "./policy/human-final.mjs";
import { summarizeSyncDeliveries, deriveDeliverySyncStatus } from "./gobd/sync-lifecycle.mjs";

function realJobs(companyId, period) {
  return (listPayrollJobs({ companyId, period }) || []).filter((j) => !isDemoPayrollJob(j));
}

function compactIban(iban) {
  return String(iban || "").replace(/\s+/g, "").toUpperCase();
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}

function pushAnomaly(list, row) {
  list.push({
    severity: "warn",
    recommendedAction: "open_employee",
    ...row,
  });
}

/**
 * Delivery trust with score, gaps, and human next steps.
 */
export function buildDeliveryTrust(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt" };
  const period = String(opts.period || currentPeriod()).trim();
  const jobs = realJobs(cid, period).filter((j) => j.status === "released");
  const allDel = listAllDeliveries({ companyId: cid });
  const deliveries = allDel.filter((d) => {
    if (normalizeCompanyId(d.company?.id) !== cid) return false;
    const p = String(d.period || d.payload?.period || d.payslip?.period || "").slice(0, 7);
    return !period || p === period || !p;
  });
  const syncLifecycle = summarizeSyncDeliveries(deliveries);

  const byJob = new Map();
  const byBadge = new Map();
  for (const d of deliveries) {
    const jid = d.jobId || d.payslip?.jobId || d.payload?.jobId;
    if (jid) byJob.set(String(jid), d);
    const badge = normalizeEmployeeId(
      d.employee?.badgeId || d.employee?.id || d.payslip?.employee?.badgeId || ""
    );
    if (badge) byBadge.set(badge, d);
  }

  const items = jobs.map((j) => {
    const badge = normalizeEmployeeId(j.employee?.badgeId || j.employee?.id || "");
    const d = byJob.get(String(j.jobId)) || (badge ? byBadge.get(badge) : null) || null;
    let trust = "released_local";
    let trustRank = 1;
    if (d?.ackedAt || d?.ackAt) {
      trust = "acked";
      trustRank = 4;
    } else if (d?.webhookPushedAt || d?.webhookReached) {
      trust = "pushed";
      trustRank = 3;
    } else if (d) {
      trust = d.webhookLastError ? "push_failed" : "queued";
      trustRank = d.webhookLastError ? 0 : 2;
    }
    return {
      jobId: j.jobId,
      employee: j.employee,
      net: j.payslip?.totals?.net ?? null,
      releasedAt: j.releasedAt || null,
      deliveryId: d?.deliveryId || null,
      trust,
      trustRank,
      syncStatus: d ? deriveDeliverySyncStatus(d) : null,
      eventId: d?.eventId || d?.deliveryId || null,
      correlationId: d?.correlationId || d?.deliveryId || null,
      idempotencyKey: d?.idempotencyKey || d?.webhookIdempotencyKey || d?.deliveryId || null,
      webhookPushedAt: d?.webhookPushedAt || null,
      webhookLastError: d?.webhookLastError || d?.lastError || null,
      webhookPushCount: d?.webhookPushCount ?? null,
      ackedAt: d?.ackedAt || d?.ackAt || null,
      needsHuman: trust === "released_local" || trust === "push_failed" || trust === "queued"
        || (d && deriveDeliverySyncStatus(d) === "DEAD_LETTER"),
    };
  });

  const counts = items.reduce((acc, it) => {
    acc[it.trust] = (acc[it.trust] || 0) + 1;
    acc.total += 1;
    return acc;
  }, {
    total: 0,
    acked: 0,
    pushed: 0,
    queued: 0,
    released_local: 0,
    push_failed: 0,
  });

  // Score: acked=100, pushed=70, queued=40, released_local=20, push_failed=10
  const weights = { acked: 100, pushed: 70, queued: 40, released_local: 20, push_failed: 10 };
  const score = counts.total
    ? Math.round(
      items.reduce((s, it) => s + (weights[it.trust] ?? 20), 0) / counts.total
    )
    : 100;

  const gaps = [];
  if (counts.push_failed) {
    gaps.push({
      code: "webhook_failed",
      label: `${counts.push_failed} Webhook-Fehler – Mensch prüft Plattform-Endpoint`,
      action: "replay_deliveries",
    });
  }
  if (counts.released_local) {
    gaps.push({
      code: "no_delivery_row",
      label: `${counts.released_local} freigegeben ohne Delivery-Eintrag`,
      action: "deliver_period",
    });
  }
  if (counts.queued) {
    gaps.push({
      code: "queued",
      label: `${counts.queued} in Warteschlange (Plattform pollt oder Webhook)`,
      action: "replay_deliveries",
    });
  }
  if (counts.pushed && !counts.acked) {
    gaps.push({
      code: "awaiting_ack",
      label: "An Plattform gesendet – warte auf Ack",
      action: "wait_or_ping",
    });
  }

  const nextHumanActions = [];
  if (counts.push_failed || counts.queued || counts.released_local) {
    nextHumanActions.push({
      id: "replay_deliveries",
      label: "Zustellung erneut anstoßen (Mensch bestätigt)",
      requiresConfirm: true,
    });
  }
  if (counts.total && score < 100) {
    nextHumanActions.push({
      id: "ping_webhook",
      label: "Webhook prüfen",
      requiresConfirm: false,
    });
  }

  if (syncLifecycle.counts.DEAD_LETTER) {
    gaps.push({
      code: "dead_letter",
      label: `${syncLifecycle.counts.DEAD_LETTER} Dead-Letter – manueller Replay nötig`,
      action: "replay_deliveries",
    });
    nextHumanActions.push({
      id: "replay_dead_letter",
      label: "Dead-Letter Zustellung (Mensch bestätigt)",
      requiresConfirm: true,
    });
  }

  return {
    ok: true,
    kind: "portal.delivery_trust.v2",
    companyId: cid,
    period,
    score,
    grade: score >= 90 ? "A" : score >= 70 ? "B" : score >= 40 ? "C" : "D",
    counts,
    gaps,
    nextHumanActions,
    items,
    syncLifecycle,
    humanFinal: true,
    message: counts.total === 0
      ? "Keine freigegebenen Abrechnungen in diesem Monat."
      : `Vertrauen ${score}/100 (${counts.acked || 0} Ack · ${counts.pushed || 0} Push · ${counts.queued || 0} Queue · ${counts.push_failed || 0} Fehler)`
        + (syncLifecycle.counts.DEAD_LETTER ? ` · ${syncLifecycle.counts.DEAD_LETTER} Dead-Letter` : ""),
  };
}

/**
 * Heuristic anomalies (rules only – not AI). Deeper statistical + data quality checks.
 */
export function detectPayrollAnomalies(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  if (!cid) return { ok: false, error: "companyId fehlt", anomalies: [] };
  const period = String(opts.period || currentPeriod()).trim();
  const jobs = realJobs(cid, period);
  const anomalies = [];

  const hoursList = jobs
    .map((j) => Number(j.state?.workHours || j.payslip?.attendance?.hours || 0))
    .filter((h) => h > 0);
  const avgHours = mean(hoursList);
  const sdHours = stddev(hoursList);

  const netList = jobs
    .map((j) => Number(j.payslip?.totals?.net || 0))
    .filter((n) => n > 0);
  const avgNet = mean(netList);
  const sdNet = stddev(netList);

  const overview = monthOverview(cid, { period, months: 3 });
  const otherMonths = (overview.months || []).filter((m) => m.period !== period);
  const prevPeriod = otherMonths[0]?.period;
  const prevJobs = prevPeriod ? realJobs(cid, prevPeriod) : [];
  const prevNetByEmp = new Map(
    prevJobs.map((j) => [
      normalizeEmployeeId(j.employee?.id || j.employee?.badgeId),
      Number(j.payslip?.totals?.net || 0),
    ])
  );
  const prevHoursByEmp = new Map(
    prevJobs.map((j) => [
      normalizeEmployeeId(j.employee?.id || j.employee?.badgeId),
      Number(j.state?.workHours || j.payslip?.attendance?.hours || 0),
    ])
  );

  const ibanOwners = new Map();
  for (const j of jobs) {
    const iban = compactIban(j.state?.bankIban || j.payslip?.bank?.iban || "");
    if (!iban) continue;
    const name = j.employee?.name || j.jobId;
    if (!ibanOwners.has(iban)) ibanOwners.set(iban, []);
    ibanOwners.get(iban).push(name);
  }
  for (const [iban, names] of ibanOwners) {
    const unique = [...new Set(names)];
    if (unique.length >= 2) {
      pushAnomaly(anomalies, {
        code: "duplicate_iban",
        severity: "action",
        message: `Gleiche IBAN …${iban.slice(-4)} bei: ${unique.slice(0, 4).join(", ")}`,
        recommendedAction: "open_employee",
      });
    }
  }

  for (const j of jobs) {
    const sync = employeeSyncReadiness(j);
    const name = j.employee?.name || j.jobId;
    const hours = Number(j.state?.workHours || j.payslip?.attendance?.hours || 0);
    const net = Number(j.payslip?.totals?.net || 0);
    const gross = Number(j.payslip?.totals?.gross || j.state?.grossSalary || 0);
    const eid = normalizeEmployeeId(j.employee?.id || j.employee?.badgeId);
    const iban = compactIban(j.state?.bankIban || j.payslip?.bank?.iban || "");

    if (sdHours > 0 && hours > 0) {
      const z = (hours - avgHours) / sdHours;
      if (Math.abs(z) >= 2.2) {
        pushAnomaly(anomalies, {
          code: "hours_zscore",
          severity: Math.abs(z) >= 3 ? "action" : "warn",
          jobId: j.jobId,
          employeeName: name,
          message: `Stunden ${hours} (z=${z.toFixed(1)}) weichen vom Firmenschnitt ${avgHours.toFixed(1)} ab.`,
          metrics: { hours, avgHours, z: Number(z.toFixed(2)) },
        });
      }
    } else if (avgHours > 0 && hours > 0 && (hours > avgHours * 1.6 || hours < avgHours * 0.4)) {
      pushAnomaly(anomalies, {
        code: "hours_outlier",
        severity: "warn",
        jobId: j.jobId,
        employeeName: name,
        message: `Stunden ${hours} weichen stark vom Firmenschnitt (${avgHours.toFixed(1)}) ab.`,
      });
    }

    if (sdNet > 0 && net > 0) {
      const z = (net - avgNet) / sdNet;
      if (Math.abs(z) >= 2.5) {
        pushAnomaly(anomalies, {
          code: "net_zscore",
          severity: "warn",
          jobId: j.jobId,
          employeeName: name,
          message: `Netto ${net.toFixed(2)} € (z=${z.toFixed(1)}) ungewöhnlich vs. Firmenschnitt.`,
          metrics: { net, avgNet, z: Number(z.toFixed(2)) },
        });
      }
    }

    const prevNet = prevNetByEmp.get(eid);
    if (prevNet > 0 && net > 0) {
      const delta = Math.abs(net - prevNet) / prevNet;
      if (delta >= 0.25) {
        pushAnomaly(anomalies, {
          code: "net_swing",
          severity: delta >= 0.4 ? "action" : "warn",
          jobId: j.jobId,
          employeeName: name,
          message: `Netto ${net.toFixed(2)} € weicht ${(delta * 100).toFixed(0)}% vom Vormonat (${prevNet.toFixed(2)} €) ab.`,
          metrics: { net, prevNet, deltaPct: Math.round(delta * 100) },
        });
      }
    }

    const prevH = prevHoursByEmp.get(eid);
    if (prevH > 0 && hours > 0) {
      const dh = Math.abs(hours - prevH) / prevH;
      if (dh >= 0.35) {
        pushAnomaly(anomalies, {
          code: "hours_swing",
          severity: "warn",
          jobId: j.jobId,
          employeeName: name,
          message: `Stunden ${hours} vs. Vormonat ${prevH} (${(dh * 100).toFixed(0)}% Änderung).`,
        });
      }
    }

    if (hours > 0 && !(gross > 0) && !(net > 0)) {
      pushAnomaly(anomalies, {
        code: "hours_without_pay",
        severity: "action",
        jobId: j.jobId,
        employeeName: name,
        message: "Stunden vorhanden, aber kein Brutto/Netto – Lohnarten prüfen.",
        recommendedAction: "request_person_data",
      });
    }

    if ((gross > 0 || hours > 0) && !iban) {
      pushAnomaly(anomalies, {
        code: "missing_iban",
        severity: "action",
        jobId: j.jobId,
        employeeName: name,
        message: "IBAN fehlt – SEPA-Auszahlung nicht möglich.",
        recommendedAction: "open_employee",
      });
    }

    if (!String(j.state?.taxClass || "").trim()) {
      pushAnomaly(anomalies, {
        code: "missing_tax_class",
        severity: "warn",
        jobId: j.jobId,
        employeeName: name,
        message: "Steuerklasse fehlt.",
      });
    }

    if (sync.waitingHours) {
      pushAnomaly(anomalies, {
        code: "missing_hours",
        severity: "action",
        jobId: j.jobId,
        employeeName: name,
        message: "Monatsstunden fehlen.",
        recommendedAction: "request_person_data",
      });
    }
    if (!sync.hasSv) {
      pushAnomaly(anomalies, {
        code: "missing_sv",
        severity: "action",
        jobId: j.jobId,
        employeeName: name,
        message: "SV-Nummer fehlt.",
      });
    }
    if (!sync.hasKk) {
      pushAnomaly(anomalies, {
        code: "missing_kk",
        severity: "action",
        jobId: j.jobId,
        employeeName: name,
        message: "Krankenkasse fehlt.",
      });
    }

    if (j.status === "error") {
      pushAnomaly(anomalies, {
        code: "job_error",
        severity: "error",
        jobId: j.jobId,
        employeeName: name,
        message: (j.errors || ["Berechnungsfehler"]).slice(0, 3).join(" · "),
        recommendedAction: "open_employee",
      });
    }
  }

  // Sort: error > action > warn
  const rank = { error: 0, action: 1, warn: 2, info: 3 };
  anomalies.sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));

  return {
    ok: true,
    kind: "portal.anomalies.v2",
    companyId: cid,
    period,
    count: anomalies.length,
    stats: {
      employees: jobs.length,
      avgHours: Number(avgHours.toFixed(2)),
      sdHours: Number(sdHours.toFixed(2)),
      avgNet: Number(avgNet.toFixed(2)),
      sdNet: Number(sdNet.toFixed(2)),
      prevPeriod: prevPeriod || null,
    },
    anomalies,
    note: "Regelbasierte Hinweise (z-Score / Vormonat / IBAN) – keine KI-Steuerentscheidung.",
    humanFinal: true,
  };
}

/**
 * What-if payroll calculation – never saves / never releases.
 */
export function simulatePayroll(payload = {}, options = {}) {
  const gate = assertNotAiApplyingLaw(payload);
  if (!gate.ok) return gate;

  const companyId = normalizeCompanyId(
    payload.company?.id || payload.companyId || options.companyId || ""
  );
  if (!companyId) {
    return { ok: false, status: 422, error: "companyId fehlt" };
  }

  const company = loadCompany(companyId);
  const enriched = {
    ...payload,
    kind: payload.kind || "platform.payroll.v1",
    company: {
      ...(payload.company || {}),
      id: companyId,
      name: payload.company?.name || company?.name || "",
      taxNumber: payload.company?.taxNumber || company?.taxNumber || "",
    },
  };

  try {
    const PC = getPayrollCore();
    let baseState = null;
    if (payload.jobId) {
      const jobs = realJobs(companyId, String(payload.period || currentPeriod()));
      const job = jobs.find((j) => j.jobId === payload.jobId) || null;
      if (job?.state) baseState = { ...job.state };
    }

    let state;
    let hard = [];
    let soft = [];
    if (baseState) {
      state = { ...baseState };
      if (payload.workHours != null) state.workHours = payload.workHours;
      if (payload.hours != null) state.workHours = payload.hours;
      if (payload.attendance?.hours != null) state.workHours = payload.attendance.hours;
      if (payload.grossSalary != null) state.grossSalary = payload.grossSalary;
      hard = [...PC.validate(state)];
      soft = PC.validatePrintHints?.(state) || [];
    } else {
      const ingested = PC.ingestPlatformPayload(enriched);
      if (!ingested?.state) {
        return {
          ok: false,
          simulation: true,
          errors: ingested?.errors || ["Simulation: Ingest fehlgeschlagen"],
        };
      }
      state = ingested.state;
      state.mandantId = companyId;
      if (payload.workHours != null) state.workHours = payload.workHours;
      if (payload.hours != null) state.workHours = payload.hours;
      if (payload.attendance?.hours != null) state.workHours = payload.attendance.hours;
      if (payload.grossSalary != null) state.grossSalary = payload.grossSalary;
      hard = [...(ingested.errors || []), ...PC.validate(state)];
      soft = PC.validatePrintHints?.(state) || [];
    }

    state.meta = { ...(state.meta || {}), companyId, simulation: true };
    const payroll = PC.calculate(state);

    return {
      ok: hard.length === 0,
      simulation: true,
      persisted: false,
      released: false,
      humanFinal: true,
      companyId,
      period: state.payrollMonth || payload.period || null,
      jobId: payload.jobId || null,
      errors: hard,
      printHints: soft,
      inputs: {
        workHours: Number(state.workHours) || 0,
        grossSalary: Number(state.grossSalary) || 0,
      },
      totals: {
        gross: payroll.gross,
        net: payroll.net,
        payrollTax: payroll.payrollTax,
        solidarity: payroll.solidarity,
        churchTax: payroll.churchTax,
        svTotal: payroll.svTotal,
        employerShare: payroll.employerShare,
      },
      note:
        "Nur Vorschau. Nicht gespeichert, nicht freigegeben. KI darf Werte nicht übernehmen – Mensch entscheidet.",
    };
  } catch (e) {
    return {
      ok: false,
      simulation: true,
      error: e.message || String(e),
    };
  }
}

export function buildElsterPrepChecklist(companyId, opts = {}) {
  const cid = normalizeCompanyId(companyId);
  const period = String(opts.period || currentPeriod()).trim();
  const year = period.slice(0, 4);
  const jobs = realJobs(cid, period);
  const yearJobs = (listPayrollJobs({ companyId: cid }) || [])
    .filter((j) => !isDemoPayrollJob(j) && String(j.period || "").startsWith(year) && j.status === "released");

  const missingTaxId = yearJobs.filter(
    (j) => !String(j.state?.employeeTaxId || j.payslip?.employee?.taxId || "").trim()
  ).length;
  const missingIban = yearJobs.filter(
    (j) => !compactIban(j.state?.bankIban || j.payslip?.bank?.iban || "")
  ).length;

  const steps = [
    {
      id: "released",
      ok: yearJobs.length > 0,
      label: `Freigegebene Abrechnungen im Jahr ${year}: ${yearJobs.length}`,
    },
    {
      id: "tax_ids",
      ok: yearJobs.length > 0 && missingTaxId === 0,
      label: missingTaxId
        ? `Steuer-IDs fehlen bei ${missingTaxId} Personen`
        : "Steuer-IDs der Mitarbeiter geprüft",
    },
    {
      id: "iban_optional",
      ok: missingIban === 0,
      label: missingIban
        ? `IBAN fehlt bei ${missingIban} (für Auszahlung, nicht zwingend LStB)`
        : "IBAN vorhanden",
    },
    {
      id: "human_review",
      ok: false,
      label: "Mensch hat Jahressummen gegen LStB geprüft (manuell)",
      humanOnly: true,
    },
    {
      id: "elster_upload",
      ok: false,
      label: "Übermittlung auf elster.de durch den Menschen (kein Auto-Send)",
      humanOnly: true,
    },
  ];

  const readyForHumanUpload = steps.filter((s) => !s.humanOnly).every((s) => s.ok);

  return {
    ok: true,
    kind: "portal.elster_prep.v2",
    companyId: cid,
    period,
    year,
    releasedInYear: yearJobs.length,
    jobsInFocusMonth: jobs.length,
    readyForHumanUpload,
    steps,
    humanFinal: true,
    note:
      "Nur Vorbereitung. WorkPass sendet nichts an ELSTER – Zertifikat und Upload bleiben beim Menschen.",
  };
}
