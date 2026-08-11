import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  ["common.load", L("Laden", "Load", "Yükle", "تحميل", "Charger", "Cargar", "Carica", "Wczytaj")],
  ["doc.annualTax", L("Lohnsteuerbescheinigung", "Annual tax certificate", "Yıllık vergi belgesi", "شهادة ضريبة الأجور السنوية", "Attestation fiscale annuelle", "Certificado fiscal anual", "Certificato fiscale annuale", "Roczne zaświadczenie podatkowe")],
  ["doc.annualTaxShort", L("LStB", "LStB", "LStB", "LStB", "LStB", "LStB", "LStB", "LStB")],
  ["nav.payrollMonthly", L("Lohnabrechnung (monatlich)", "Monthly payslip", "Aylık bordro", "كشف رواتب شهري", "Bulletin mensuel", "Nómina mensual", "Cedolino mensile", "Lista miesięczna")],
  ["hub.checkSummary", L("{done}/{total} Stammdaten erledigt", "{done}/{total} master data done", "{done}/{total} ana veri tamam", "{done}/{total} بيانات أساسية مكتملة", "{done}/{total} données de base OK", "{done}/{total} datos maestros listos", "{done}/{total} anagrafica completa", "{done}/{total} dane podstawowe OK")],
  ["hub.checkAllDone", L("Alle Stammdaten sind vollständig.", "All master data is complete.", "Tüm ana veriler tamam.", "جميع البيانات الأساسية مكتملة.", "Toutes les données de base sont complètes.", "Todos los datos maestros están completos.", "Tutti i dati anagrafici sono completi.", "Wszystkie dane podstawowe są kompletne.")],
  ["hub.checkNextHint", L("Als Nächstes: {item}", "Next: {item}", "Sırada: {item}", "التالي: {item}", "Ensuite : {item}", "Siguiente: {item}", "Avanti: {item}", "Następne: {item}")],
  ["hub.syncEmpty", L("Noch keine Sync-Einträge.", "No sync entries yet.", "Henüz sync kaydı yok.", "لا إدخالات مزامنة بعد.", "Pas encore d'entrées sync.", "Aún no hay entradas de sync.", "Ancora nessuna voce sync.", "Brak wpisów sync.")],
  ["hub.syncLogCounts", L("Lohn {p} · Rechnungen {i}", "Payroll {p} · Invoices {i}", "Bordro {p} · Faturalar {i}", "أجور {p} · فواتير {i}", "Paie {p} · Factures {i}", "Nómina {p} · Facturas {i}", "Paghe {p} · Fatture {i}", "Płace {p} · Faktury {i}")],
  ["hub.syncChecked", L("Sync geprüft", "Sync checked", "Sync kontrol edildi", "تم فحص المزامنة", "Sync vérifié", "Sync comprobado", "Sync verificato", "Sync sprawdzony")],
  ["hub.syncFailed", L("Sync-Prüfung fehlgeschlagen.", "Sync check failed.", "Sync kontrolü başarısız.", "فشل فحص المزامنة.", "Échec de la vérification sync.", "Falló la comprobación de sync.", "Verifica sync non riuscita.", "Sprawdzenie sync nie powiodło się.")],
  ["hub.offline", L("Offline", "Offline", "Çevrimdışı", "غير متصل", "Hors ligne", "Sin conexión", "Offline", "Offline")],
  ["hub.releasedCounts", L("Freigegeben: {p} Abrechnung(en) · {i} Rechnung(en)", "Released: {p} payslip(s) · {i} invoice(s)", "Onaylı: {p} bordro · {i} fatura", "معتمد: {p} كشف/كشوف · {i} فاتورة/فواتير", "Validé : {p} bulletin(s) · {i} facture(s)", "Liberado: {p} nómina(s) · {i} factura(s)", "Rilasciati: {p} cedolino/i · {i} fattura/e", "Zatwierdzono: {p} lista/list · {i} faktura/y")],
  ["hub.lastSuccess", L("Letzter Erfolg: {at}", "Last success: {at}", "Son başarı: {at}", "آخر نجاح: {at}", "Dernier succès : {at}", "Último éxito: {at}", "Ultimo successo: {at}", "Ostatni sukces: {at}")],
  ["hub.pendingCount", L("Pending: {n}", "Pending: {n}", "Bekleyen: {n}", "قيد الانتظار: {n}", "En attente : {n}", "Pendiente: {n}", "In sospeso: {n}", "Oczekujące: {n}")],
  ["hub.webhookKeyRejected", L("Webhook-Key abgelehnt. Railway WORKPASS_PLATFORM_WEBHOOK_KEY und Plattform-Secret müssen exakt übereinstimmen.", "Webhook key rejected. Railway WORKPASS_PLATFORM_WEBHOOK_KEY and platform secret must match exactly.", "Webhook anahtarı reddedildi. Railway WORKPASS_PLATFORM_WEBHOOK_KEY ile platform secret birebir aynı olmalı.", "رُفض مفتاح Webhook. يجب أن يتطابق WORKPASS_PLATFORM_WEBHOOK_KEY في Railway مع سر المنصة تماماً.", "Clé webhook refusée. WORKPASS_PLATFORM_WEBHOOK_KEY (Railway) et le secret plateforme doivent correspondre.", "Clave webhook rechazada. WORKPASS_PLATFORM_WEBHOOK_KEY (Railway) y el secreto de plataforma deben coincidir.", "Chiave webhook rifiutata. WORKPASS_PLATFORM_WEBHOOK_KEY (Railway) e il secret piattaforma devono coincidere.", "Klucz webhook odrzucony. WORKPASS_PLATFORM_WEBHOOK_KEY (Railway) i secret platformy muszą się zgadzać.")],
  ["hub.webhookKeyMissing", L("Kein Webhook-Key. Railway: WORKPASS_PLATFORM_WEBHOOK_KEY setzen (gleicher Wert wie auf der Plattform).", "No webhook key. Railway: set WORKPASS_PLATFORM_WEBHOOK_KEY (same value as on the platform).", "Webhook anahtarı yok. Railway: WORKPASS_PLATFORM_WEBHOOK_KEY ayarlayın.", "لا يوجد مفتاح Webhook. Railway: عيّن WORKPASS_PLATFORM_WEBHOOK_KEY (نفس قيمة المنصة).", "Pas de clé webhook. Railway : définir WORKPASS_PLATFORM_WEBHOOK_KEY.", "Sin clave webhook. Railway: defina WORKPASS_PLATFORM_WEBHOOK_KEY.", "Nessuna chiave webhook. Railway: impostare WORKPASS_PLATFORM_WEBHOOK_KEY.", "Brak klucza webhook. Railway: ustaw WORKPASS_PLATFORM_WEBHOOK_KEY.")],
  ["hub.webhookKeyWrongSecret", L("Es wurde WORKPASS_API_KEY als Webhook-Key genutzt. Setze WORKPASS_PLATFORM_WEBHOOK_KEY auf denselben Secret wie die Plattform.", "WORKPASS_API_KEY was used as webhook key. Set WORKPASS_PLATFORM_WEBHOOK_KEY to the same secret as the platform.", "Webhook için WORKPASS_API_KEY kullanıldı. WORKPASS_PLATFORM_WEBHOOK_KEY’i platform secret ile aynı yapın.", "استُخدم WORKPASS_API_KEY كمفتاح Webhook. عيّن WORKPASS_PLATFORM_WEBHOOK_KEY بنفس سر المنصة.", "WORKPASS_API_KEY a été utilisé comme clé webhook. Définir WORKPASS_PLATFORM_WEBHOOK_KEY comme sur la plateforme.", "Se usó WORKPASS_API_KEY como clave webhook. Defina WORKPASS_PLATFORM_WEBHOOK_KEY igual que en la plataforma.", "È stato usato WORKPASS_API_KEY come chiave webhook. Imposta WORKPASS_PLATFORM_WEBHOOK_KEY come sulla piattaforma.", "Użyto WORKPASS_API_KEY jako klucz webhook. Ustaw WORKPASS_PLATFORM_WEBHOOK_KEY jak na platformie.")],
  ["hub.localClient", L("Lokaler Mandant", "Local client", "Yerel müşteri", "عميل محلي", "Client local", "Cliente local", "Cliente locale", "Klient lokalny")],
  ["hub.accounting", L("Buchhaltung", "Accounting", "Muhasebe", "المحاسبة", "Comptabilité", "Contabilidad", "Contabilità", "Księgowość")],
  ["hub.accountingOn", L("Buchhaltung aktiv", "Accounting active", "Muhasebe aktif", "المحاسبة مفعّلة", "Comptabilité active", "Contabilidad activa", "Contabilità attiva", "Księgowość aktywna")],
  ["hub.accountingOff", L("Buchhaltung inaktiv", "Accounting inactive", "Muhasebe pasif", "المحاسبة غير مفعّلة", "Comptabilité inactive", "Contabilidad inactiva", "Contabilità inattiva", "Księgowość nieaktywna")],
  ["hub.serverProfileOk", L("Server-Profil ✓", "Server profile ✓", "Sunucu profili ✓", "ملف الخادم ✓", "Profil serveur ✓", "Perfil servidor ✓", "Profilo server ✓", "Profil serwera ✓")],
  ["hub.serverProfileOpen", L("Server-Profil offen", "Server profile open", "Sunucu profili açık", "ملف الخادم ناقص", "Profil serveur ouvert", "Perfil servidor pendiente", "Profilo server aperto", "Profil serwera otwarty")],
  ["hub.firmIdLine", L("Firma {id}", "Company {id}", "Firma {id}", "الشركة {id}", "Entreprise {id}", "Empresa {id}", "Azienda {id}", "Firma {id}")],
  ["hub.activateInAdmin", L("bitte im Admin/Plattform aktivieren", "please activate in Admin/platform", "Admin/platformda etkinleştirin", "يُرجى التفعيل في Admin/المنصة", "veuillez activer dans Admin/plateforme", "active en Admin/plataforma", "attiva in Admin/piattaforma", "aktywuj w Admin/platformie")],
  ["hub.pinMismatch", L("Neue PIN und Bestätigung stimmen nicht überein.", "New PIN and confirmation do not match.", "Yeni PIN ve onay uyuşmuyor.", "رمز PIN الجديد والتأكيد غير متطابقين.", "Le nouveau PIN et la confirmation ne correspondent pas.", "El nuevo PIN y la confirmación no coinciden.", "Il nuovo PIN e la conferma non coincidono.", "Nowy PIN i potwierdzenie nie są zgodne.")],
  ["hub.pinChangeFail", L("PIN konnte nicht geändert werden.", "PIN could not be changed.", "PIN değiştirilemedi.", "تعذّر تغيير رمز PIN.", "Le PIN n'a pas pu être modifié.", "No se pudo cambiar el PIN.", "Impossibile modificare il PIN.", "Nie udało się zmienić PIN.")],
  ["hub.pinChanged", L("PIN wurde geändert.", "PIN has been changed.", "PIN değiştirildi.", "تم تغيير رمز PIN.", "Le PIN a été modifié.", "El PIN se ha cambiado.", "Il PIN è stato modificato.", "PIN został zmieniony.")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
const lines = filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n");
if (lines) {
  s = s.replace(/\];\s*$/, `${lines}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length, "skipped", extra.length - filtered.length);
