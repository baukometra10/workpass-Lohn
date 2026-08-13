/**
 * Normalize platform employee payloads: names, IDs, and rich master data.
 * Accepts many platform shapes (split names, nested employee, German keys).
 */

import { normalizeEmployeeId } from "./tenant.mjs";
import { deepFindByKey, deepFindNumberByKey, KEY_RE } from "./field-deep-find.mjs";

function pickString(...vals) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

export function resolveEmployeeName(raw = {}) {
  const emp = raw && typeof raw === "object" ? raw : {};
  const nested = emp.employee && typeof emp.employee === "object" ? emp.employee : null;
  const src = nested || emp;

  const direct = pickString(
    src.name,
    src.employeeName,
    src.displayName,
    src.fullName,
    src.fullnameName,
    src.vollname,
    emp.name,
    emp.employeeName,
    emp.displayName,
    emp.fullName
  );
  if (direct) return direct;

  const first = pickString(
    src.firstName,
    src.givenName,
    src.vorname,
    src.first_name,
    emp.firstName,
    emp.givenName,
    emp.vorname
  );
  const last = pickString(
    src.lastName,
    src.familyName,
    src.nachname,
    src.surname,
    src.last_name,
    emp.lastName,
    emp.familyName,
    emp.nachname,
    emp.surname
  );
  return [first, last].filter(Boolean).join(" ").trim();
}

export function resolveEmployeeAddress(raw = {}) {
  const emp = raw && typeof raw === "object" ? raw : {};
  const src = emp.employee && typeof emp.employee === "object" ? emp.employee : emp;
  const direct = pickString(src.address, src.employeeAddress, src.anschrift, emp.address);
  if (direct) return direct;
  const street = pickString(src.street, src.strasse, src.addressLine1);
  const zip = pickString(src.zip, src.plz, src.postalCode);
  const city = pickString(src.city, src.ort, src.town);
  const line2 = [zip, city].filter(Boolean).join(" ");
  return [street, line2].filter(Boolean).join("\n").trim();
}

/**
 * Flatten one platform employee row into a stable record.
 */
export function normalizeEmployeeRecord(raw = {}) {
  const emp = raw && typeof raw === "object" ? raw : {};
  const nested = emp.employee && typeof emp.employee === "object" ? emp.employee : null;
  const src = { ...(nested || {}), ...emp };
  if (nested) {
    // Nested employee wins for identity fields when present
    Object.assign(src, nested);
  }

  const social = (src.socialInsurance && typeof src.socialInsurance === "object" ? src.socialInsurance : null)
    || (src.sv && typeof src.sv === "object" ? src.sv : null)
    || (src.sozialversicherung && typeof src.sozialversicherung === "object" ? src.sozialversicherung : null)
    || {};
  const health = (src.healthInsurance && typeof src.healthInsurance === "object" ? src.healthInsurance : null)
    || (src.krankenversicherung && typeof src.krankenversicherung === "object" ? src.krankenversicherung : null)
    || (src.kk && typeof src.kk === "object" ? src.kk : null)
    || {};
  const bank = (src.bank && typeof src.bank === "object" ? src.bank : null)
    || (src.payment && typeof src.payment === "object" ? src.payment : null)
    || (src.bankAccount && typeof src.bankAccount === "object" ? src.bankAccount : null)
    || (src.konto && typeof src.konto === "object" ? src.konto : null)
    || (nested?.bank && typeof nested.bank === "object" ? nested.bank : null)
    || (emp.bank && typeof emp.bank === "object" ? emp.bank : null)
    || {};
  const payroll = (src.payroll && typeof src.payroll === "object" ? src.payroll : null)
    || (src.compensation && typeof src.compensation === "object" ? src.compensation : null)
    || (src.salary && typeof src.salary === "object" ? src.salary : null)
    || (src.gehalt && typeof src.gehalt === "object" ? src.gehalt : null)
    || {};

  const badgeId = normalizeEmployeeId(
    src.badgeId || src.badge || src.id || src.employeeId || src.mitarbeiterId || ""
  );
  const name = resolveEmployeeName(src);
  const firstName = pickString(src.firstName, src.givenName, src.vorname);
  const lastName = pickString(src.lastName, src.familyName, src.nachname, src.surname);
  const personnelNumber = pickString(
    src.personnelNumber,
    src.personnelNo,
    src.persNr,
    src.persNrDisplay,
    src.personalnummer
  );
  const address = resolveEmployeeAddress(src);

  return {
    badgeId,
    id: badgeId,
    name,
    firstName,
    lastName,
    personnelNumber,
    address,
    taxId: pickString(src.taxId, src.steuerId, src.taxID, src.steueridentifikationsnummer),
    insuranceNo: pickString(
      src.insuranceNo,
      src.svNr,
      src.svNumber,
      src.sv_nummer,
      src.svNummer,
      src.socialSecurityNo,
      src.socialSecurityNumber,
      src.sozialversicherungsnummer,
      src.versicherungsnummer,
      social.number,
      social.nr,
      social.svNr,
      social.insuranceNo,
      social.versicherungsnummer,
      deepFindByKey(src, KEY_RE.insuranceNo)
    ),
    birthDate: pickString(src.birthDate, src.birth, src.geburtsdatum, src.dateOfBirth),
    entryDate: pickString(src.entryDate, src.entry, src.eintritt, src.startDate, src.hiredAt),
    taxClass: pickString(src.taxClass, src.stkl, src.steuerklasse),
    churchTaxRate: pickString(src.churchTaxRate, src.kist, src.kirchensteuer),
    healthFund: pickString(
      src.healthFund,
      src.kk,
      src.krankenkasse,
      src.krankenkassenName,
      src.healthInsuranceName,
      src.healthInsuranceProvider,
      health.name,
      health.fund,
      health.krankenkasse,
      health.label,
      health.provider,
      deepFindByKey(src, KEY_RE.healthFund)
    ),
    healthPercent: src.healthPercent != null
      ? String(src.healthPercent)
      : pickString(src.kkPercent, health.percent, health.beitragssatz),
    email: pickString(src.email, src.mail),
    phone: pickString(src.phone, src.telefon, src.mobile),
    bankName: pickString(
      src.bankName,
      bank.name,
      bank.bankName,
      bank.bank,
      bank.institut
    ),
    bankIban: pickString(
      src.bankIban,
      src.iban,
      bank.iban,
      bank.bankIban,
      bank.IBAN,
      bank.accountIban
    ),
    bankBic: pickString(src.bankBic, src.bic, bank.bic, bank.BIC, bank.swift),
    hourlyRate: (() => {
      const n = Number(
        src.hourlyRate
        ?? src.stundenlohn
        ?? src.hourRate
        ?? src.wageRate
        ?? payroll.hourlyRate
        ?? payroll.stundenlohn
        ?? deepFindNumberByKey(src, KEY_RE.hourlyRate)
        ?? 0
      );
      return n > 0 ? String(n) : "";
    })(),
    grossSalary: pickString(
      src.grossSalary,
      src.gross,
      src.brutto,
      src.monthlySalary,
      src.baseSalary,
      src.gehalt,
      src.lohn,
      payroll.amount,
      payroll.brutto,
      payroll.gross,
      payroll.monthly,
      payroll.base
    ),
    incomplete: !name || !badgeId,
    needsName: Boolean(badgeId && !name),
  };
}
