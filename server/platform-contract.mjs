/**
 * Platform ↔ Accounting capability contract (v2).
 * Replaces URL guessing with an explicit handshake surface.
 */
import { ACCOUNTING_VERSION } from "./version.mjs";

export const PLATFORM_CONTRACT_VERSION = 2;

export function platformCapabilities() {
  return {
    kind: "platform.accounting.capabilities.v2",
    contractVersion: PLATFORM_CONTRACT_VERSION,
    accountingVersion: ACCOUNTING_VERSION,
    inbound: {
      webhooks: [
        "platform.ping",
        "employees.list.requested",
        "payroll.month.requested",
        "invoices.export.requested",
        "employee.data.requested",
      ],
      post: [
        "POST /v1/employees/import",
        "POST /v1/payroll/batch",
        "POST /v1/payroll/ingest",
        "POST /v1/invoice/batch",
        "POST /v1/invoice/ingest",
        "POST /v1/company/activate",
      ],
    },
    outbound: {
      events: [
        "document.released",
        "payslip.released",
        "lstb.released",
        "verdienst.released",
        "invoice.released",
        "accounting.message",
        "payroll.waiting",
        "month.closed",
        "month.close.failed",
      ],
      documentTypes: ["payslip", "lstb", "verdienst", "invoice"],
      deliveryTypes: ["payslip", "lstb", "verdienst", "invoice"],
      pull: [
        "GET /v1/delivery/pending",
        "POST /v1/delivery/:deliveryId/ack",
        "GET /v1/messages/pending",
        "POST /v1/messages/:messageId/ack",
      ],
    },
    employeeApp: {
      routes: [
        "/employee/payslips/:jobId",
        "/employee/certificates/lstb/:year/:employeeId",
        "/employee/certificates/verdienst/:period/:employeeId",
      ],
    },
    requiredWebhookAck: { ok: true, accepted: true },
    notes: [
      "Platform should advertise pull URLs via activate payload — not guessed by accounting.",
      "Delivery ack confirms employee visibility, not just HTTP 2xx.",
      "Employee documents are sent as event=document.released with documentType=payslip|lstb|verdienst|invoice (legacy *.released kept in meta.legacyEvent).",
      "Show delivery.title / documentTitle / description in the employee inbox and Antrag (Lohnabrechnung, Lohnsteuerbescheinigung, Verdienstbescheinigung, Rechnung) — never raw codes or ‘Fehlende Unterlagen’.",
      "Full delivery/message confirm = received + opened + seen (POST .../received|/open|/ack or webhook body with those flags).",
      "Document webhooks include full delivery.document + original pdfBase64 (PDF). Incomplete / missing PDF is refused. Pull: GET /v1/delivery/:deliveryId.",
      "Sealed deliveries (immutable + seal.contentHash/pdfHash) are never rebuilt in transit; tampered document/PDF is blocked.",
      "LStB/VB require strictAck for received; complete only after opened+seen (bare {ok:true} is not enough).",
    ],
  };
}
