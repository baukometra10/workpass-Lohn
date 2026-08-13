/**
 * Enrich a payroll job from local registry + company Stammdaten + platform pull.
 * Ask the platform only for fields that remain missing after fetch.
 */
import { getPayrollCore } from "./engine.mjs";
import { loadPayrollJob, savePayrollJob } from "./store.mjs";
import { loadCompany } from "./company-service.mjs";
import { getEmployee, upsertEmployee } from "./employee-registry.mjs";
import { normalizeEmployeeRecord } from "./employee-normalize.mjs";
import { notifyGapsForPayroll } from "./platform-messages.mjs";
import { pullAndSyncCompanyBranding } from "./company-branding.mjs";
import {
  pullEmployeeBundle,
  pullMonthAttendance,
  extractInlineReply,
  pickEmployeeRow,
  employeeRowFieldFlags,
} from "./platform-pull.mjs";
import { pullPlatformPayrollBatch } from "./month-close.mjs";
import {
  normalizeCompanyId,
  normalizeEmployeeId,
  assertSameTenant,
} from "./tenant.mjs";

/** Last enrich attempt – exposed via /health for ops. */
let lastEnrichStatus = null;
export function getLastEnrichStatus() {
  return lastEnrichStatus ? { ...lastEnrichStatus } : null;
}

function pick(...vals) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function fillEmpty(target, key, value) {
  if (!target || !key) return false;
  const next = String(value ?? "").trim();
  if (!next) return false;
  const cur = String(target[key] ?? "").trim();
  if (cur) return false;
  target[key] = next;
  return true;
}

function companyPatch(companyId, jobCompany = null) {
  const company = loadCompany(companyId);
  const hub = company?.meta?.hubProfile && typeof company.meta.hubProfile === "object"
    ? company.meta.hubProfile
    : {};
  const jc = jobCompany && typeof jobCompany === "object" ? jobCompany : {};
  const companyName = pick(company?.name, hub.companyName, jc.name, hub.seller?.split?.("\n")?.[0]);
  const seller = pick(
    hub.seller,
    company?.address,
    [companyName, pick(company?.street, jc.street), [pick(company?.zip, jc.zip), pick(company?.city, jc.city)].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join("\n")
  );
  const patch = {
    companyName,
    taxNumber: pick(company?.taxNumber, company?.steuerNr, hub.taxNumber, jc.taxNumber),
    vatId: pick(company?.vatId, company?.ustId, hub.vatId, jc.vatId),
    datevClientNo: pick(company?.datevClientNo, hub.datevClientNo),
    datevConsultantNo: pick(company?.datevConsultantNo, hub.datevConsultantNo),
    seller,
  };
  return { company, hub, patch, filled: Object.keys(patch).filter((k) => patch[k]) };
}

function registryPatch(companyId, employeeId) {
  const emp = getEmployee(companyId, employeeId);
  if (!emp) return { filled: [], patch: {} };
  const meta = emp.meta || {};
  const patch = {
    employeeName: pick(emp.name, meta.name),
    personnelNumber: pick(emp.personnelNumber, meta.personnelNumber),
    employeeAddress: pick(meta.address, emp.address),
    employeeTaxId: pick(meta.taxId),
    employeeInsuranceNo: pick(meta.insuranceNo, meta.svNr),
    employeeBirthDate: pick(meta.birthDate),
    employeeEntryDate: pick(meta.entryDate),
    taxClass: pick(meta.taxClass),
    healthFund: pick(meta.healthFund, meta.kk),
    healthPercent: pick(meta.healthPercent),
    bankName: pick(meta.bankName, meta.bank?.name),
    bankIban: pick(meta.bankIban, meta.iban, meta.bank?.iban),
    churchTaxRate: pick(meta.churchTaxRate),
  };
  return { employee: emp, patch, filled: Object.keys(patch).filter((k) => patch[k]) };
}

function applyPatch(state, patch) {
  const filled = [];
  for (const [key, value] of Object.entries(patch || {})) {
    if (fillEmpty(state, key, value)) filled.push(key);
  }
  return filled;
}

function employeeFromPlatformRow(row = {}) {
  const norm = normalizeEmployeeRecord(row);
  const bank = (row.bank && typeof row.bank === "object" ? row.bank : null)
    || (row.employee?.bank && typeof row.employee.bank === "object" ? row.employee.bank : null)
    || {};
  const wages = Array.isArray(row.wageItems)
    ? row.wageItems
    : (Array.isArray(row.wages) ? row.wages : []);
  const grossFromNorm = Number(norm.grossSalary) || 0;
  return {
    employeeName: norm.name,
    personnelNumber: norm.personnelNumber,
    employeeAddress: norm.address,
    employeeTaxId: norm.taxId,
    employeeInsuranceNo: norm.insuranceNo,
    employeeBirthDate: norm.birthDate,
    employeeEntryDate: norm.entryDate,
    taxClass: norm.taxClass,
    healthFund: norm.healthFund,
    healthPercent: norm.healthPercent,
    churchTaxRate: norm.churchTaxRate,
    bankName: pick(norm.bankName, bank.name, bank.bankName, row.bankName),
    bankIban: pick(norm.bankIban, bank.iban, bank.bankIban, row.bankIban, row.iban),
    hourlyRate: pick(norm.hourlyRate, row.hourlyRate, row.stundenlohn),
    wageItems: wages.length
      ? wages
      : (grossFromNorm > 0
        ? [{ code: "2000", label: "Gehalt", amount: grossFromNorm, taxFlag: "L", svFlag: "L" }]
        : []),
    grossSalary: pick(norm.grossSalary, row.gross, row.grossSalary, row.contractSalary, row.gehalt),
    workDays: row.attendance?.days ?? row.workDays ?? row.days,
    workHours: row.attendance?.hours ?? row.workHours ?? row.hours ?? row.stunden,
    companyTaxNumber: pick(row.company?.taxNumber, row.taxNumber),
    companyVatId: pick(row.company?.vatId, row.vatId),
    companyName: pick(row.company?.name, row.companyName),
  };
}

function applyBankFallback(state) {
  // IBAN without bank name still shows "Bank fehlt" – use neutral label
  if (String(state.bankIban || "").trim() && !String(state.bankName || "").trim()) {
    state.bankName = "Kreditinstitut";
    return true;
  }
  return false;
}

/**
 * Brutto = Monatsstunden × Stundenlohn (from contract + platform attendance).
 */
function applyHoursTimesRate(state, { hours, days, hourlyRate } = {}) {
  const rate = Number(hourlyRate || state.meta?.hourlyRate || state.hourlyRate) || 0;
  const h = Number(hours ?? state.workHours) || 0;
  const d = Number(days ?? state.workDays) || 0;
  const changed = [];
  if (rate > 0) {
    state.meta = { ...(state.meta || {}), hourlyRate: rate };
    state.hourlyRate = String(rate);
  }
  if (h > 0) {
    state.workHours = String(h);
    changed.push("hours");
  }
  if (d > 0) {
    state.workDays = String(d);
    changed.push("days");
  }
  if (rate > 0 && h > 0) {
    const amount = Math.round(rate * h * 100) / 100;
    state.wageItems = [{
      code: "1000",
      label: "Stundenlohn",
      amount,
      quantity: h,
      factor: rate,
      hours: h,
      taxFlag: "L",
      svFlag: "L",
    }];
    state.grossSalary = String(amount);
    changed.push("grossFromHours");
  }
  return changed;
}

function persistRegistryFromState(state, companyId, source = "enrich") {
  const badgeId = normalizeEmployeeId(state.badgeId || state.employeeId || "");
  if (!companyId || !badgeId) return;
  try {
    upsertEmployee({
      companyId,
      badgeId,
      name: state.employeeName || "",
      personnelNumber: state.personnelNumber || "",
      address: state.employeeAddress || "",
      taxId: state.employeeTaxId || "",
      insuranceNo: state.employeeInsuranceNo || "",
      birthDate: state.employeeBirthDate || "",
      entryDate: state.employeeEntryDate || "",
      taxClass: state.taxClass || "",
      healthFund: state.healthFund || "",
      healthPercent: state.healthPercent || "",
      bankName: state.bankName || "",
      bankIban: state.bankIban || "",
      churchTaxRate: state.churchTaxRate || "",
      source,
    });
  } catch { /* ignore */ }
}

function rebuildJob(job, state) {
  const PC = getPayrollCore();
  const hard = PC.validate(state);
  const soft = PC.validatePrintHints?.(state) || [];
  const payroll = PC.calculate(state);
  const status = hard.length
    ? "error"
    : (job.status === "released" ? "released" : "calculated");
  const payslip = {
    ...(job.payslip || {}),
    kind: "platform.payslip.v1",
    employee: {
      id: String(state.employeeId || state.badgeId || ""),
      badgeId: String(state.badgeId || state.employeeId || ""),
      name: String(state.employeeName || ""),
      address: String(state.employeeAddress || ""),
      taxId: String(state.employeeTaxId || ""),
      insuranceNo: String(state.employeeInsuranceNo || ""),
      taxClass: String(state.taxClass || ""),
      personnelNumber: String(state.personnelNumber || ""),
      printPersNr: String(state.personnelNumber || ""),
    },
    company: {
      id: normalizeCompanyId(state.mandantId || job.company?.id || ""),
      name: String(state.companyName || ""),
      taxNumber: String(state.taxNumber || ""),
      vatId: String(state.vatId || ""),
    },
    period: String(state.payrollMonth || job.period || ""),
    status,
    errors: hard,
    totals: {
      gross: payroll.gross,
      net: payroll.net,
      taxGross: payroll.taxGross,
      svGross: payroll.svGross,
      payrollTax: payroll.payrollTax,
      churchTax: payroll.churchTax,
      solidarity: payroll.solidarity,
      health: payroll.health,
      pension: payroll.pension,
      care: payroll.care,
      unemployment: payroll.unemployment,
      svTotal: payroll.svTotal,
      employerShare: payroll.employerShare,
    },
    wageItems: Array.isArray(state.wageItems) ? state.wageItems : [],
    bank: {
      name: String(state.bankName || ""),
      iban: String(state.bankIban || ""),
    },
    calculatedAt: new Date().toISOString(),
  };

  const next = {
    ...job,
    status,
    updatedAt: new Date().toISOString(),
    company: {
      ...(job.company || {}),
      id: payslip.company.id,
      name: payslip.company.name,
      taxNumber: payslip.company.taxNumber,
      vatId: payslip.company.vatId,
    },
    employee: {
      id: payslip.employee.id,
      name: payslip.employee.name,
      badgeId: payslip.employee.badgeId,
    },
    period: payslip.period,
    state,
    payroll: payslip.totals,
    payslip,
    errors: hard,
    printHints: soft,
  };
  savePayrollJob(next);
  return next;
}

function mergePlatformRowIntoState(state, row, filled, tag = "platform") {
  if (!row) return;
  const mapped = employeeFromPlatformRow(row);
  const patch = { ...mapped };
  delete patch.wageItems;
  delete patch.grossSalary;
  delete patch.workDays;
  delete patch.workHours;
  delete patch.companyTaxNumber;
  delete patch.companyVatId;
  delete patch.companyName;
  filled.push(...applyPatch(state, patch).map((k) => `${tag}.${k}`));

  if (mapped.companyTaxNumber) fillEmpty(state, "taxNumber", mapped.companyTaxNumber) && filled.push(`${tag}.taxNumber`);
  if (mapped.companyVatId) fillEmpty(state, "vatId", mapped.companyVatId) && filled.push(`${tag}.vatId`);
  if (mapped.companyName) fillEmpty(state, "companyName", mapped.companyName) && filled.push(`${tag}.companyName`);

  const hasGross = (Array.isArray(state.wageItems) && state.wageItems.some((w) => Number(w.amount) > 0))
    || Number(state.grossSalary) > 0;
  if (!hasGross) {
    if (Array.isArray(mapped.wageItems) && mapped.wageItems.length) {
      state.wageItems = mapped.wageItems.map((w) => ({
        code: String(w.code || w.lohnart || "2000"),
        label: String(w.label || w.bezeichnung || "Gehalt"),
        amount: Number(w.amount ?? w.betrag) || 0,
        taxFlag: String(w.taxFlag || w.st || "L"),
        svFlag: String(w.svFlag || w.sv || "L"),
      }));
      filled.push(`${tag}.wageItems`);
    } else if (mapped.grossSalary) {
      fillEmpty(state, "grossSalary", mapped.grossSalary);
      if (!Array.isArray(state.wageItems) || !state.wageItems.length) {
        state.wageItems = [{
          code: "2000",
          label: "Gehalt",
          amount: Number(mapped.grossSalary) || 0,
          taxFlag: "L",
          svFlag: "L",
        }];
      }
      filled.push(`${tag}.grossSalary`);
    }
    if (mapped.workDays != null && mapped.workDays !== "") fillEmpty(state, "workDays", String(mapped.workDays));
    if (mapped.workHours != null && mapped.workHours !== "") fillEmpty(state, "workHours", String(mapped.workHours));
    if (mapped.hourlyRate) {
      const rate = Number(mapped.hourlyRate) || 0;
      if (rate > 0) {
        state.meta = { ...(state.meta || {}), hourlyRate: rate };
        if (!String(state.hourlyRate || "").trim()) state.hourlyRate = String(rate);
        filled.push(`${tag}.hourlyRate`);
      }
    }
  }
}

/**
 * Enrich job: pull company branding + employee/contract from platform, then ask only leftovers.
 */
export async function enrichPayrollJob(jobId, options = {}) {
  const job = loadPayrollJob(jobId);
  if (!job) return { ok: false, error: "Job nicht gefunden", job: null };

  const companyId = normalizeCompanyId(job.company?.id || job.state?.mandantId || "");
  const scopeCheck = assertSameTenant(options.tenantScope, companyId, "Payroll-Anreichern");
  if (!scopeCheck.ok) return { ok: false, error: scopeCheck.error, job: null };

  const state = { ...(job.state || {}) };
  state.meta = { ...(state.meta || {}), jobId, enrichedAt: new Date().toISOString() };
  state.mandantId = state.mandantId || companyId;
  if (companyId) {
    state.meta.companyId = companyId;
    fillEmpty(state, "companyName", job.company?.name);
    fillEmpty(state, "taxNumber", job.company?.taxNumber);
    fillEmpty(state, "vatId", job.company?.vatId);
  }
  const employeeId = normalizeEmployeeId(
    options.employeeId || state.badgeId || state.employeeId || job.employee?.badgeId || job.employee?.id || ""
  );
  const period = String(options.period || state.payrollMonth || job.period || "").trim();
  const filled = [];

  // 0) Always try to pull company branding/logo (never ask here)
  let branding = null;
  if (options.pullBrand !== false && companyId) {
    try {
      branding = await pullAndSyncCompanyBranding(companyId, {
        ask: false,
        reason: "payroll_enrich",
        source: "employee-enrich",
      });
      if (branding?.pulled) filled.push("branding.pulled");
    } catch { /* ignore */ }
  }

  // 1) Company Stammdaten (Steuer-Nr., Name, …) after branding pull
  const fromCompany = companyPatch(companyId, job.company);
  filled.push(...applyPatch(state, fromCompany.patch).map((k) => `company.${k}`));
  if (!String(state.seller || "").trim() && state.companyName) {
    fillEmpty(state, "seller", state.companyName);
  }

  // 2) Local employee registry
  const fromReg = registryPatch(companyId, employeeId);
  filled.push(...applyPatch(state, fromReg.patch).map((k) => `registry.${k}`));

  const PC = getPayrollCore();
  let hard = PC.validate(state);
  let soft = PC.validatePrintHints?.(state) || [];
  let pull = { skipped: true };
  let employeePull = { skipped: true };
  let attendancePull = { skipped: true };

  const needsPull = options.pull !== false && (hard.length > 0 || soft.length > 0 || options.forcePull);
  if (needsPull && employeeId) {
    // 3a) Real platform employee + contract GET
    employeePull = await pullEmployeeBundle({ companyId, period, employeeId });
    if (employeePull.ok && employeePull.row) {
      mergePlatformRowIntoState(state, employeePull.row, filled, "contract");
      if (applyBankFallback(state)) filled.push("contract.bankNameFallback");
      persistRegistryFromState(state, companyId, "platform-contract-pull");
      pull = { ok: true, source: "employee-bundle", url: employeePull.url };
    }

    // 3b) Payroll month/employee export as secondary source
    hard = PC.validate(state);
    soft = PC.validatePrintHints?.(state) || [];
    if (hard.length || soft.length || options.forcePull) {
      const payrollPull = await pullPlatformPayrollBatch({
        companyId,
        period,
        employeeId,
        maxAttempts: 4,
        timeoutMs: Number(process.env.WORKPASS_PLATFORM_PULL_TIMEOUT_MS || 8000),
      });
      if (payrollPull.ok && payrollPull.batch?.employees?.length) {
        const match = pickEmployeeRow(payrollPull.batch.employees, employeeId)
          || payrollPull.batch.employees[0];
        mergePlatformRowIntoState(state, match, filled, "payroll");
        if (payrollPull.batch.company) {
          fillEmpty(state, "companyName", payrollPull.batch.company.name);
          fillEmpty(state, "taxNumber", payrollPull.batch.company.taxNumber);
          fillEmpty(state, "vatId", payrollPull.batch.company.vatId);
        }
        persistRegistryFromState(state, companyId, "platform-payroll-pull");
        pull = { ok: true, source: "payroll-pull", ...payrollPull };
      } else if (!pull.ok) {
        pull = payrollPull;
      }
    }

    // 3c) Monatsstunden von der Plattform × Stundenlohn aus Vertrag → Brutto
    const rate = Number(state.meta?.hourlyRate || state.hourlyRate) || 0;
    const hasGross = (Array.isArray(state.wageItems) && state.wageItems.some((w) => Number(w.amount) > 0))
      || Number(state.grossSalary) > 0;
    if (options.pullHours !== false && (rate > 0 || !hasGross || !Number(state.workHours))) {
      attendancePull = await pullMonthAttendance({ companyId, period, employeeId });
      if (attendancePull.ok) {
        const applied = applyHoursTimesRate(state, {
          hours: attendancePull.hours,
          days: attendancePull.days,
          hourlyRate: rate || state.meta?.hourlyRate,
        });
        applied.forEach((k) => filled.push(`attendance.${k}`));
      } else if (rate > 0 && !Number(state.workHours)) {
        // Keep rate; hours still missing → ask below
        applyHoursTimesRate(state, { hourlyRate: rate });
      }
    } else if (rate > 0 && Number(state.workHours) > 0 && !hasGross) {
      applyHoursTimesRate(state, {
        hours: Number(state.workHours),
        days: Number(state.workDays) || undefined,
        hourlyRate: rate,
      }).forEach((k) => filled.push(`hoursRate.${k}`));
    }
  }

  hard = PC.validate(state);
  soft = PC.validatePrintHints?.(state) || [];
  const rateNow = Number(state.meta?.hourlyRate || state.hourlyRate) || 0;
  const hoursNow = Number(state.workHours) || 0;
  if (rateNow > 0 && hoursNow <= 0) {
    hard = [...hard, "Monatsstunden fehlen (Plattform: gearbeitete Stunden für diesen Monat)"];
  }

  const nextJob = rebuildJob(job, state);
  persistRegistryFromState(state, companyId, "enrich");

  // 4) Ask platform only for remaining employee gaps (never for branding/logo)
  let platformAsk = null;
  const shouldAsk = options.ask !== false && (hard.length > 0 || soft.length > 0);
  if (shouldAsk) {
    try {
      platformAsk = await notifyGapsForPayroll({
        state,
        hard,
        soft,
        jobId,
        companyName: state.companyName || nextJob.company?.name || "",
        forceNotify: options.forceNotify === true,
        requestEvent: true,
      });
      // If webhook body already contains the employee, merge immediately
      const inline = extractInlineReply(platformAsk?.platformNotify?.body);
      if (inline?.employees?.length) {
        const match = pickEmployeeRow(inline.employees, employeeId) || inline.employees[0];
        mergePlatformRowIntoState(state, match, filled, "webhook-inline");
        const inlineHours = Number(match?.attendance?.hours ?? match?.workHours ?? match?.hours) || 0;
        const inlineRate = Number(state.meta?.hourlyRate || match?.hourlyRate || match?.stundenlohn) || 0;
        if (inlineRate && inlineHours) {
          applyHoursTimesRate(state, { hours: inlineHours, hourlyRate: inlineRate })
            .forEach((k) => filled.push(`webhook-inline.${k}`));
        }
        persistRegistryFromState(state, companyId, "webhook-inline");
        const rebuilt = rebuildJob(nextJob, state);
        hard = rebuilt.errors || [];
        soft = rebuilt.printHints || [];
        return {
          ok: true,
          job: rebuilt,
          filled,
          filledCount: filled.length,
          remainingHard: hard,
          remainingSoft: soft,
          stillMissing: [...hard, ...soft],
          pull,
          employeePull,
          attendancePull,
          branding,
          platformAsk,
          askedPlatform: true,
          message: `Daten aus Plattform-Antwort übernommen (${filled.length} Felder).`,
        };
      }
    } catch (e) {
      platformAsk = { ok: false, error: e.message };
    }
  }

  const filledCount = filled.length;
  const stillMissing = [...hard, ...soft];
  const employeePullOk = employeePull?.ok === true;
  const payrollPullOk = pull?.ok === true;
  const pullDenied = Boolean(
    !employeePullOk
    && (employeePull?.authDenied
      || employeePull?.error === "unauthorized"
      || (
        (employeePull?.attempts || []).length
        && (employeePull.attempts || []).every((a) => a.status === 401 || a.status === 403)
      ))
  );
  const webhookOkNoData = Boolean(
    platformAsk?.platformNotify?.ok
    && stillMissing.length
    && !extractInlineReply(platformAsk?.platformNotify?.body)?.employees?.length
  );
  const pulledFlags = employeePullOk
    ? (employeePull.fieldFlags || employeeRowFieldFlags(employeePull.row))
    : null;
  const missingMaster = Boolean(
    stillMissing.some((s) => /SV-Nummer|Krankenkasse|Bank|IBAN/i.test(String(s)))
    && pulledFlags
    && (!pulledFlags.insuranceNo || !pulledFlags.healthFund)
  );
  const missingHours = Boolean(rateNow > 0 && hoursNow <= 0);

  let message = filledCount && !stillMissing.length
    ? `Daten von Plattform/Vertrag/Register übernommen (${filledCount} Felder). Abrechnung bereit.`
    : filledCount
      ? `Teilweise ergänzt (${filledCount} Felder). Noch offen: ${stillMissing.slice(0, 4).join(" · ")}`
      : stillMissing.length
        ? (pull.ok === false && !employeePullOk
          ? `Plattform-GET ohne Treffer – fehlende Felder nachgefragt.`
          : `Noch fehlend: ${stillMissing.slice(0, 4).join(" · ")}`)
        : "Stammdaten vollständig.";

  if (stillMissing.length && pullDenied) {
    message = "Plattform blockiert den Datenabruf (401). Bitte WORKPASS_API_KEY / WORKPASS_PLATFORM_API_KEY freigeben für GET /api/contracts – oder Stammdaten per POST /v1/payroll/batch senden.";
  } else if (missingHours) {
    message = "Stundenlohn aus Vertrag vorhanden – bitte Monatsstunden der Plattform senden (attendance.hours) per POST /v1/payroll/batch. Brutto = Stunden × Stundenlohn.";
  } else if (stillMissing.length && missingMaster) {
    message = "Vertrag geladen, aber SV-Nummer / Krankenkasse fehlen im Payload. Bitte diese Felder im Vertrag an die Buchhaltung mitsenden.";
  } else if (stillMissing.length && webhookOkNoData && !employeePullOk) {
    message = "Plattform hat die Anfrage bestätigt, sendet aber keine Mitarbeiterdaten. Bitte POST /v1/employees/import und POST /v1/payroll/batch ausführen.";
  }

  const result = {
    ok: true,
    job: nextJob,
    filled,
    filledCount,
    remainingHard: hard,
    remainingSoft: soft,
    stillMissing,
    pull,
    employeePull: employeePullOk
      ? {
        ok: true,
        url: employeePull.url,
        keySource: employeePull.keySource,
        fieldFlags: pulledFlags,
        richness: pulledFlags?.richness,
      }
      : {
        ok: false,
        error: employeePull?.error || null,
        authDenied: Boolean(employeePull?.authDenied),
      },
    attendancePull: attendancePull?.ok
      ? { ok: true, hours: attendancePull.hours, days: attendancePull.days, url: attendancePull.url }
      : { ok: false, error: attendancePull?.error || null, skipped: Boolean(attendancePull?.skipped) },
    branding,
    platformAsk,
    askedPlatform: Boolean(platformAsk && (platformAsk.created || platformAsk.notified || platformAsk.ok)),
    platformBlocked: Boolean(pullDenied || (webhookOkNoData && !employeePullOk) || missingMaster || missingHours),
    platformBlockedReason: pullDenied
      ? "pull_unauthorized"
      : (missingHours
        ? "month_hours_missing"
        : (missingMaster
          ? "pull_incomplete_payload"
          : (webhookOkNoData && !employeePullOk ? "webhook_ok_no_payload" : null))),
    message,
  };
  lastEnrichStatus = {
    at: new Date().toISOString(),
    jobId,
    companyId,
    employeeId,
    filledCount,
    stillMissing,
    platformBlocked: result.platformBlocked,
    platformBlockedReason: result.platformBlockedReason,
    employeePullOk,
    payrollPullOk,
    attendanceOk: attendancePull?.ok === true,
    attendanceHours: attendancePull?.hours || null,
    hourlyRate: rateNow || null,
    brandingPulled: branding?.pulled === true,
    fieldFlags: pulledFlags,
    pullUrl: employeePull?.url || null,
    message,
  };
  return result;
}
