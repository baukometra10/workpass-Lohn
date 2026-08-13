/**
 * WorkPass UI i18n – 8 languages (UI only; DE tax/legal engine unchanged).
 * Locales: de, en, tr, ar, fr, es, it, pl
 */
(function () {
  const STORAGE_KEY = "workpass.ui.locale";
  const SUPPORTED = ["de", "en", "tr", "ar", "fr", "es", "it", "pl"];
  const RTL = new Set(["ar"]);

  const LABELS = {
    de: "Deutsch",
    en: "English",
    tr: "Türkçe",
    ar: "العربية",
    fr: "Français",
    es: "Español",
    it: "Italiano",
    pl: "Polski",
  };

  /** Gregorian (solar) month names for UI chrome – payslip print stays German elsewhere. */
  const MONTH_NAMES = {
    de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
    ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    it: ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
    pl: ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"],
  };

  function formatMonthYear(ym, locale) {
    const raw = String(ym || "").trim();
    if (!/^\d{4}-\d{2}$/.test(raw)) return raw;
    const [ys, ms] = raw.split("-");
    const monthIdx = Number(ms) - 1;
    const loc = normalize(locale || current) || "de";
    const names = MONTH_NAMES[loc] || MONTH_NAMES.de;
    const name = names[monthIdx] || ms;
    return `${name} ${ys}`;
  }

  /** Build YYYY-MM options around a center period (localized labels). */
  function buildMonthOptions(centerYm, spanBefore = 18, spanAfter = 6) {
    const center = /^\d{4}-\d{2}$/.test(String(centerYm || ""))
      ? String(centerYm)
      : (() => {
          const n = new Date();
          return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
        })();
    const [cy, cm] = center.split("-").map(Number);
    const out = [];
    for (let i = -spanBefore; i <= spanAfter; i++) {
      const d = new Date(cy, cm - 1 + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      out.push({ value: ym, label: formatMonthYear(ym) });
    }
    return out;
  }

  const dict = {
    de: {
      "auth.product": "WorkPass Steuerprogramm",
      "auth.unlock": "WorkPass entsperren",
      "auth.hint": "Geschützter Buchhaltungszugang · Suppix AI",
      "auth.email": "E-Mail (Firma oder Admin)",
      "auth.password": "Passwort / PIN",
      "auth.pin": "PIN",
      "auth.submit": "Anmelden",
      "auth.foot": "Ein Login reicht für Hub, Lohn und Admin",
      "auth.tab.platform": "Plattform-Konto",
      "auth.tab.pin": "Geräte-PIN",
      "auth.mode.hub": "Hub · Standalone",
      "auth.mode.lohn": "Empfang · Freigabe",
      "auth.mode.admin": "Nur Admin-Rolle",
      "nav.overview": "Übersicht",
      "nav.document": "Beleg erfassen",
      "nav.company": "Mandantenverwaltung",
      "nav.help": "Hilfe",
      "nav.lohn": "Lohn",
      "nav.hub": "Hub",
      "nav.admin": "Admin",
      "nav.lock": "Sperren",
      "nav.language": "Sprache",
      "app.brand.hub": "WorkPass Steuerprogramm",
      "app.brand.lohn": "WorkPass Lohn",
      "app.sub.hub": "Suppix AI · Rechnung · Lohn · Mandant",
      "app.sub.lohn": "Suppix AI · Steuerprogramm",
      "jump.empfang": "Empfang",
      "jump.firma": "Firma",
      "jump.lohnarten": "Lohnarten",
      "jump.auszahlung": "Auszahlung",
      "jump.archiv": "Archiv",
      "portal.live": "Firmen-Portal live",
      "portal.onlyYourData": "Nur Ihre Daten · Mandantentrennung aktiv",
      "portal.monthClose": "Monatsabschluss",
      "portal.inbox": "Inbox",
      "audit.title": "Prüfübersicht",
      "audit.tenant": "Mandantentrennung aktiv",
      "audit.company": "Firma",
      "audit.month": "Monat",
      "audit.employees": "Mitarbeiter",
      "audit.released": "Freigegeben",
      "audit.open": "Offene Aufträge",
      "audit.sync": "Sync",
      "audit.data": "Datenlage",
      "audit.mandant": "Mandant",
      "audit.dataYes": "Daten vorhanden",
      "audit.dataNo": "Noch keine Monatsdaten",
      "audit.isolation": "Nur diese Firma sichtbar (Isolation)",
      "kpi.gross": "Brutto",
      "kpi.net": "Netto / Auszahlung",
      "kpi.noData": "Keine Daten",
      "empfang.title": "Empfang",
      "empfang.hint": "Datei, Inbox oder manuell – auch ohne Plattform.",
      "empfang.firmHint": "Firmen-Portal: Automatische Abrechnungen Ihrer Mitarbeiter erscheinen hier.",
      "recv.file": "Datei",
      "recv.paste": "Inbox / Paste",
      "recv.api": "API-Bridge",
      "recv.apiFirm": "Meine Abrechnungen",
      "recv.manual": "Manuell",
      "sync.title": "Automatik · Plattform-Sync",
      "sync.now": "Jetzt synchronisieren",
      "sync.ping": "Webhook prüfen",
      "sync.refresh": "Portal aktualisieren",
      "comms.title": "Kommunikation mit Plattform",
      "comms.seen": "Von Plattform gesehen",
      "comms.open": "Offen – wartet auf Plattform",
      "comms.refresh": "Nachrichten aktualisieren",
      "comms.badge": "Prüfsicht",
      "firma.title": "Firma & Mitarbeiter",
      "common.save": "Speichern",
      "common.cancel": "Abbrechen",
      "common.print": "Drucken",
      "common.pdf": "PDF",
      "common.export": "Export",
      "common.new": "Neu",
      "common.theme": "Theme",
      "status.ready": "Bereit – manuell, Datei oder Inbox.",
      "status.firmReady": "Firmen-Portal bereit – Sync holt Ihre Daten.",
      "legal.note": "Berechnung bleibt nach deutschem Recht (BMF PAP / SGB IV).",
    },
    en: {
      "auth.product": "WorkPass Tax Suite",
      "auth.unlock": "Unlock WorkPass",
      "auth.hint": "Protected accounting access · Suppix AI",
      "auth.email": "Email (company or admin)",
      "auth.password": "Password / PIN",
      "auth.pin": "PIN",
      "auth.submit": "Sign in",
      "auth.foot": "One login for Hub, Payroll and Admin",
      "auth.tab.platform": "Platform account",
      "auth.tab.pin": "Device PIN",
      "auth.mode.hub": "Hub · Standalone",
      "auth.mode.lohn": "Inbox · Release",
      "auth.mode.admin": "Admin role only",
      "nav.overview": "Overview",
      "nav.document": "Create document",
      "nav.company": "Client master data",
      "nav.help": "Help",
      "nav.lohn": "Payroll",
      "nav.hub": "Hub",
      "nav.admin": "Admin",
      "nav.lock": "Lock",
      "nav.language": "Language",
      "app.brand.hub": "WorkPass Tax Suite",
      "app.brand.lohn": "WorkPass Payroll",
      "app.sub.hub": "Suppix AI · Invoices · Payroll · Client",
      "app.sub.lohn": "Suppix AI · Tax suite",
      "jump.empfang": "Inbox",
      "jump.firma": "Company",
      "jump.lohnarten": "Wage types",
      "jump.auszahlung": "Payout",
      "jump.archiv": "Archive",
      "portal.live": "Company portal live",
      "portal.onlyYourData": "Your data only · tenant isolation on",
      "portal.monthClose": "Month close",
      "portal.inbox": "Inbox",
      "audit.title": "Audit overview",
      "audit.tenant": "Tenant isolation active",
      "audit.company": "Company",
      "audit.month": "Month",
      "audit.employees": "Employees",
      "audit.released": "Released",
      "audit.open": "Open tasks",
      "audit.sync": "Sync",
      "audit.data": "Data status",
      "audit.mandant": "Tenant",
      "audit.dataYes": "Data available",
      "audit.dataNo": "No monthly data yet",
      "audit.isolation": "Only this company visible (isolation)",
      "kpi.gross": "Gross",
      "kpi.net": "Net / payout",
      "kpi.noData": "No data",
      "empfang.title": "Inbox",
      "empfang.hint": "File, inbox or manual – also without platform.",
      "empfang.firmHint": "Company portal: automatic employee payslips appear here.",
      "recv.file": "File",
      "recv.paste": "Inbox / Paste",
      "recv.api": "API bridge",
      "recv.apiFirm": "My payslips",
      "recv.manual": "Manual",
      "sync.title": "Automation · Platform sync",
      "sync.now": "Sync now",
      "sync.ping": "Check webhook",
      "sync.refresh": "Refresh portal",
      "comms.title": "Platform communication",
      "comms.seen": "Seen by platform",
      "comms.open": "Open – waiting for platform",
      "comms.refresh": "Refresh messages",
      "comms.badge": "Audit view",
      "firma.title": "Company & employees",
      "common.save": "Save",
      "common.cancel": "Cancel",
      "common.print": "Print",
      "common.pdf": "PDF",
      "common.export": "Export",
      "common.new": "New",
      "common.theme": "Theme",
      "status.ready": "Ready – manual, file or inbox.",
      "status.firmReady": "Company portal ready – sync pulls your data.",
      "legal.note": "Calculations stay under German law (BMF PAP / SGB IV).",
    },
    tr: {
      "auth.product": "WorkPass Vergi Programı",
      "auth.unlock": "WorkPass kilidini aç",
      "auth.hint": "Korumalı muhasebe erişimi · Suppix AI",
      "auth.email": "E-posta (firma veya admin)",
      "auth.password": "Şifre / PIN",
      "auth.pin": "PIN",
      "auth.submit": "Giriş yap",
      "auth.foot": "Hub, Bordro ve Admin için tek giriş",
      "auth.tab.platform": "Platform hesabı",
      "auth.tab.pin": "Cihaz PIN",
      "auth.mode.hub": "Hub · Bağımsız",
      "auth.mode.lohn": "Alım · Onay",
      "auth.mode.admin": "Yalnızca admin",
      "nav.overview": "Genel bakış",
      "nav.document": "Belge oluştur",
      "nav.company": "Müşteri verileri",
      "nav.help": "Yardım",
      "nav.lohn": "Bordro",
      "nav.hub": "Hub",
      "nav.admin": "Admin",
      "nav.lock": "Kilitle",
      "nav.language": "Dil",
      "app.brand.hub": "WorkPass Vergi Programı",
      "app.brand.lohn": "WorkPass Bordro",
      "app.sub.hub": "Suppix AI · Fatura · Bordro · Müşteri",
      "app.sub.lohn": "Suppix AI · Vergi programı",
      "jump.empfang": "Gelen",
      "jump.firma": "Firma",
      "jump.lohnarten": "Ücret türleri",
      "jump.auszahlung": "Ödeme",
      "jump.archiv": "Arşiv",
      "portal.live": "Firma portalı canlı",
      "portal.onlyYourData": "Yalnızca sizin verileriniz · tenant ayrımı açık",
      "portal.monthClose": "Ay kapatma",
      "portal.inbox": "Gelen kutusu",
      "audit.title": "Denetim özeti",
      "audit.tenant": "Tenant ayrımı aktif",
      "audit.company": "Firma",
      "audit.month": "Ay",
      "audit.employees": "Çalışanlar",
      "audit.released": "Onaylanan",
      "audit.open": "Açık işler",
      "audit.sync": "Senkron",
      "audit.data": "Veri durumu",
      "audit.mandant": "Müşteri",
      "audit.dataYes": "Veri mevcut",
      "audit.dataNo": "Henüz aylık veri yok",
      "audit.isolation": "Yalnızca bu firma görünür (izolasyon)",
      "kpi.gross": "Brüt",
      "kpi.net": "Net / ödeme",
      "kpi.noData": "Veri yok",
      "empfang.title": "Gelen",
      "empfang.hint": "Dosya, gelen veya manuel – platformsuz da.",
      "empfang.firmHint": "Firma portalı: otomatik bordrolar burada görünür.",
      "recv.file": "Dosya",
      "recv.paste": "Gelen / Yapıştır",
      "recv.api": "API köprüsü",
      "recv.apiFirm": "Bordrolarım",
      "recv.manual": "Manuel",
      "sync.title": "Otomatik · Platform senkronu",
      "sync.now": "Şimdi senkronize et",
      "sync.ping": "Webhook kontrol",
      "sync.refresh": "Portalı yenile",
      "comms.title": "Platform iletişimi",
      "comms.seen": "Platform gördü",
      "comms.open": "Açık – platform bekleniyor",
      "comms.refresh": "Mesajları yenile",
      "comms.badge": "Denetim görünümü",
      "firma.title": "Firma ve çalışanlar",
      "common.save": "Kaydet",
      "common.cancel": "İptal",
      "common.print": "Yazdır",
      "common.pdf": "PDF",
      "common.export": "Dışa aktar",
      "common.new": "Yeni",
      "common.theme": "Tema",
      "status.ready": "Hazır – manuel, dosya veya gelen.",
      "status.firmReady": "Firma portalı hazır – senkron verilerinizi çeker.",
      "legal.note": "Hesaplama Alman hukukuna göre kalır (BMF PAP / SGB IV).",
    },
    ar: {
      "auth.product": "WorkPass برنامج الضرائب",
      "auth.unlock": "فتح WorkPass",
      "auth.hint": "وصول محاسبي محمي · Suppix AI",
      "auth.email": "البريد (شركة أو مسؤول)",
      "auth.password": "كلمة المرور / PIN",
      "auth.pin": "PIN",
      "auth.submit": "تسجيل الدخول",
      "auth.foot": "تسجيل واحد للمركز والأجور والمسؤول",
      "auth.tab.platform": "حساب المنصة",
      "auth.tab.pin": "PIN الجهاز",
      "auth.mode.hub": "المركز · مستقل",
      "auth.mode.lohn": "استلام · اعتماد",
      "auth.mode.admin": "دور المسؤول فقط",
      "nav.overview": "نظرة عامة",
      "nav.document": "إنشاء مستند",
      "nav.company": "بيانات العميل",
      "nav.help": "مساعدة",
      "nav.lohn": "الأجور",
      "nav.hub": "المركز",
      "nav.admin": "المسؤول",
      "nav.lock": "قفل",
      "nav.language": "اللغة",
      "app.brand.hub": "WorkPass برنامج الضرائب",
      "app.brand.lohn": "WorkPass الأجور",
      "app.sub.hub": "Suppix AI · فواتير · أجور · عميل",
      "app.sub.lohn": "Suppix AI · برنامج الضرائب",
      "jump.empfang": "الاستلام",
      "jump.firma": "الشركة",
      "jump.lohnarten": "أنواع الأجور",
      "jump.auszahlung": "الدفع",
      "jump.archiv": "الأرشيف",
      "portal.live": "بوابة الشركة مباشرة",
      "portal.onlyYourData": "بياناتك فقط · عزل العميل مفعّل",
      "portal.monthClose": "إغلاق الشهر",
      "portal.inbox": "الوارد",
      "audit.title": "ملخص المراجعة",
      "audit.tenant": "عزل العميل نشط",
      "audit.company": "الشركة",
      "audit.month": "الشهر",
      "audit.employees": "الموظفون",
      "audit.released": "المعتمد",
      "audit.open": "مهام مفتوحة",
      "audit.sync": "المزامنة",
      "audit.data": "حالة البيانات",
      "audit.mandant": "العميل",
      "audit.dataYes": "توجد بيانات",
      "audit.dataNo": "لا بيانات شهرية بعد",
      "audit.isolation": "هذه الشركة فقط ظاهرة (عزل)",
      "kpi.gross": "الإجمالي",
      "kpi.net": "الصافي / الدفع",
      "kpi.noData": "لا بيانات",
      "empfang.title": "الاستلام",
      "empfang.hint": "ملف أو وارد أو يدوي – حتى بدون المنصة.",
      "empfang.firmHint": "بوابة الشركة: كشوف الأجور التلقائية تظهر هنا.",
      "recv.file": "ملف",
      "recv.paste": "وارد / لصق",
      "recv.api": "جسر API",
      "recv.apiFirm": "كشوفي",
      "recv.manual": "يدوي",
      "sync.title": "تلقائي · مزامنة المنصة",
      "sync.now": "زامن الآن",
      "sync.ping": "فحص Webhook",
      "sync.refresh": "تحديث البوابة",
      "comms.title": "التواصل مع المنصة",
      "comms.seen": "رأته المنصة",
      "comms.open": "مفتوح – بانتظار المنصة",
      "comms.refresh": "تحديث الرسائل",
      "comms.badge": "عرض المراجعة",
      "firma.title": "الشركة والموظفون",
      "common.save": "حفظ",
      "common.cancel": "إلغاء",
      "common.print": "طباعة",
      "common.pdf": "PDF",
      "common.export": "تصدير",
      "common.new": "جديد",
      "common.theme": "المظهر",
      "status.ready": "جاهز – يدوي أو ملف أو وارد.",
      "status.firmReady": "بوابة الشركة جاهزة – المزامنة تجلب بياناتكم.",
      "legal.note": "الحساب يبقى وفق القانون الألماني (BMF PAP / SGB IV).",
    },
    fr: {
      "auth.product": "WorkPass Suite fiscale",
      "auth.unlock": "Déverrouiller WorkPass",
      "auth.hint": "Accès comptable protégé · Suppix AI",
      "auth.email": "E-mail (entreprise ou admin)",
      "auth.password": "Mot de passe / PIN",
      "auth.pin": "PIN",
      "auth.submit": "Connexion",
      "auth.foot": "Une connexion pour Hub, Paie et Admin",
      "auth.tab.platform": "Compte plateforme",
      "auth.tab.pin": "PIN appareil",
      "auth.mode.hub": "Hub · Autonome",
      "auth.mode.lohn": "Réception · Validation",
      "auth.mode.admin": "Rôle admin uniquement",
      "nav.overview": "Aperçu",
      "nav.document": "Créer un document",
      "nav.company": "Données client",
      "nav.help": "Aide",
      "nav.lohn": "Paie",
      "nav.hub": "Hub",
      "nav.admin": "Admin",
      "nav.lock": "Verrouiller",
      "nav.language": "Langue",
      "app.brand.hub": "WorkPass Suite fiscale",
      "app.brand.lohn": "WorkPass Paie",
      "app.sub.hub": "Suppix AI · Factures · Paie · Client",
      "app.sub.lohn": "Suppix AI · Suite fiscale",
      "jump.empfang": "Réception",
      "jump.firma": "Entreprise",
      "jump.lohnarten": "Types de salaire",
      "jump.auszahlung": "Paiement",
      "jump.archiv": "Archives",
      "portal.live": "Portail entreprise en ligne",
      "portal.onlyYourData": "Vos données uniquement · isolation active",
      "portal.monthClose": "Clôture du mois",
      "portal.inbox": "Boîte de réception",
      "audit.title": "Vue d'audit",
      "audit.tenant": "Isolation locataire active",
      "audit.company": "Entreprise",
      "audit.month": "Mois",
      "audit.employees": "Employés",
      "audit.released": "Validés",
      "audit.open": "Tâches ouvertes",
      "audit.sync": "Sync",
      "audit.data": "État des données",
      "audit.mandant": "Client",
      "audit.dataYes": "Données disponibles",
      "audit.dataNo": "Pas encore de données mensuelles",
      "audit.isolation": "Seule cette entreprise visible (isolation)",
      "kpi.gross": "Brut",
      "kpi.net": "Net / paiement",
      "kpi.noData": "Aucune donnée",
      "empfang.title": "Réception",
      "empfang.hint": "Fichier, boîte ou manuel – aussi sans plateforme.",
      "empfang.firmHint": "Portail entreprise : les bulletins automatiques apparaissent ici.",
      "recv.file": "Fichier",
      "recv.paste": "Boîte / Coller",
      "recv.api": "Pont API",
      "recv.apiFirm": "Mes bulletins",
      "recv.manual": "Manuel",
      "sync.title": "Automatique · Sync plateforme",
      "sync.now": "Synchroniser",
      "sync.ping": "Vérifier webhook",
      "sync.refresh": "Actualiser le portail",
      "comms.title": "Communication plateforme",
      "comms.seen": "Vu par la plateforme",
      "comms.open": "Ouvert – en attente plateforme",
      "comms.refresh": "Actualiser messages",
      "comms.badge": "Vue audit",
      "firma.title": "Entreprise & employés",
      "common.save": "Enregistrer",
      "common.cancel": "Annuler",
      "common.print": "Imprimer",
      "common.pdf": "PDF",
      "common.export": "Exporter",
      "common.new": "Nouveau",
      "common.theme": "Thème",
      "status.ready": "Prêt – manuel, fichier ou boîte.",
      "status.firmReady": "Portail entreprise prêt – la sync charge vos données.",
      "legal.note": "Le calcul reste selon le droit allemand (BMF PAP / SGB IV).",
    },
    es: {
      "auth.product": "WorkPass Suite fiscal",
      "auth.unlock": "Desbloquear WorkPass",
      "auth.hint": "Acceso contable protegido · Suppix AI",
      "auth.email": "Correo (empresa o admin)",
      "auth.password": "Contraseña / PIN",
      "auth.pin": "PIN",
      "auth.submit": "Iniciar sesión",
      "auth.foot": "Un acceso para Hub, Nómina y Admin",
      "auth.tab.platform": "Cuenta plataforma",
      "auth.tab.pin": "PIN del dispositivo",
      "auth.mode.hub": "Hub · Independiente",
      "auth.mode.lohn": "Recepción · Liberación",
      "auth.mode.admin": "Solo rol admin",
      "nav.overview": "Resumen",
      "nav.document": "Crear documento",
      "nav.company": "Datos del cliente",
      "nav.help": "Ayuda",
      "nav.lohn": "Nómina",
      "nav.hub": "Hub",
      "nav.admin": "Admin",
      "nav.lock": "Bloquear",
      "nav.language": "Idioma",
      "app.brand.hub": "WorkPass Suite fiscal",
      "app.brand.lohn": "WorkPass Nómina",
      "app.sub.hub": "Suppix AI · Facturas · Nómina · Cliente",
      "app.sub.lohn": "Suppix AI · Suite fiscal",
      "jump.empfang": "Recepción",
      "jump.firma": "Empresa",
      "jump.lohnarten": "Tipos salariales",
      "jump.auszahlung": "Pago",
      "jump.archiv": "Archivo",
      "portal.live": "Portal empresa en vivo",
      "portal.onlyYourData": "Solo sus datos · aislamiento activo",
      "portal.monthClose": "Cierre mensual",
      "portal.inbox": "Bandeja",
      "audit.title": "Vista de auditoría",
      "audit.tenant": "Aislamiento de cliente activo",
      "audit.company": "Empresa",
      "audit.month": "Mes",
      "audit.employees": "Empleados",
      "audit.released": "Liberados",
      "audit.open": "Tareas abiertas",
      "audit.sync": "Sync",
      "audit.data": "Estado de datos",
      "audit.mandant": "Cliente",
      "audit.dataYes": "Datos disponibles",
      "audit.dataNo": "Aún sin datos mensuales",
      "audit.isolation": "Solo esta empresa visible (aislamiento)",
      "kpi.gross": "Bruto",
      "kpi.net": "Neto / pago",
      "kpi.noData": "Sin datos",
      "empfang.title": "Recepción",
      "empfang.hint": "Archivo, bandeja o manual – también sin plataforma.",
      "empfang.firmHint": "Portal empresa: las nóminas automáticas aparecen aquí.",
      "recv.file": "Archivo",
      "recv.paste": "Bandeja / Pegar",
      "recv.api": "Puente API",
      "recv.apiFirm": "Mis nóminas",
      "recv.manual": "Manual",
      "sync.title": "Automático · Sync plataforma",
      "sync.now": "Sincronizar ahora",
      "sync.ping": "Comprobar webhook",
      "sync.refresh": "Actualizar portal",
      "comms.title": "Comunicación con plataforma",
      "comms.seen": "Visto por la plataforma",
      "comms.open": "Abierto – esperando plataforma",
      "comms.refresh": "Actualizar mensajes",
      "comms.badge": "Vista auditoría",
      "firma.title": "Empresa y empleados",
      "common.save": "Guardar",
      "common.cancel": "Cancelar",
      "common.print": "Imprimir",
      "common.pdf": "PDF",
      "common.export": "Exportar",
      "common.new": "Nuevo",
      "common.theme": "Tema",
      "status.ready": "Listo – manual, archivo o bandeja.",
      "status.firmReady": "Portal empresa listo – la sync trae sus datos.",
      "legal.note": "El cálculo sigue el derecho alemán (BMF PAP / SGB IV).",
    },
    it: {
      "auth.product": "WorkPass Suite fiscale",
      "auth.unlock": "Sblocca WorkPass",
      "auth.hint": "Accesso contabile protetto · Suppix AI",
      "auth.email": "Email (azienda o admin)",
      "auth.password": "Password / PIN",
      "auth.pin": "PIN",
      "auth.submit": "Accedi",
      "auth.foot": "Un accesso per Hub, Paghe e Admin",
      "auth.tab.platform": "Account piattaforma",
      "auth.tab.pin": "PIN dispositivo",
      "auth.mode.hub": "Hub · Autonomo",
      "auth.mode.lohn": "Ricezione · Rilascio",
      "auth.mode.admin": "Solo ruolo admin",
      "nav.overview": "Panoramica",
      "nav.document": "Crea documento",
      "nav.company": "Anagrafica cliente",
      "nav.help": "Aiuto",
      "nav.lohn": "Paghe",
      "nav.hub": "Hub",
      "nav.admin": "Admin",
      "nav.lock": "Blocca",
      "nav.language": "Lingua",
      "app.brand.hub": "WorkPass Suite fiscale",
      "app.brand.lohn": "WorkPass Paghe",
      "app.sub.hub": "Suppix AI · Fatture · Paghe · Cliente",
      "app.sub.lohn": "Suppix AI · Suite fiscale",
      "jump.empfang": "Ricezione",
      "jump.firma": "Azienda",
      "jump.lohnarten": "Voci paga",
      "jump.auszahlung": "Pagamento",
      "jump.archiv": "Archivio",
      "portal.live": "Portale azienda live",
      "portal.onlyYourData": "Solo i tuoi dati · isolamento attivo",
      "portal.monthClose": "Chiusura mese",
      "portal.inbox": "Inbox",
      "audit.title": "Panoramica audit",
      "audit.tenant": "Isolamento tenant attivo",
      "audit.company": "Azienda",
      "audit.month": "Mese",
      "audit.employees": "Dipendenti",
      "audit.released": "Rilasciati",
      "audit.open": "Attività aperte",
      "audit.sync": "Sync",
      "audit.data": "Stato dati",
      "audit.mandant": "Cliente",
      "audit.dataYes": "Dati disponibili",
      "audit.dataNo": "Ancora nessun dato mensile",
      "audit.isolation": "Solo questa azienda visibile (isolamento)",
      "kpi.gross": "Lordo",
      "kpi.net": "Netto / pagamento",
      "kpi.noData": "Nessun dato",
      "empfang.title": "Ricezione",
      "empfang.hint": "File, inbox o manuale – anche senza piattaforma.",
      "empfang.firmHint": "Portale azienda: le buste paga automatiche appaiono qui.",
      "recv.file": "File",
      "recv.paste": "Inbox / Incolla",
      "recv.api": "Ponte API",
      "recv.apiFirm": "Le mie buste paga",
      "recv.manual": "Manuale",
      "sync.title": "Automatico · Sync piattaforma",
      "sync.now": "Sincronizza ora",
      "sync.ping": "Verifica webhook",
      "sync.refresh": "Aggiorna portale",
      "comms.title": "Comunicazione piattaforma",
      "comms.seen": "Visto dalla piattaforma",
      "comms.open": "Aperto – in attesa piattaforma",
      "comms.refresh": "Aggiorna messaggi",
      "comms.badge": "Vista audit",
      "firma.title": "Azienda e dipendenti",
      "common.save": "Salva",
      "common.cancel": "Annulla",
      "common.print": "Stampa",
      "common.pdf": "PDF",
      "common.export": "Esporta",
      "common.new": "Nuovo",
      "common.theme": "Tema",
      "status.ready": "Pronto – manuale, file o inbox.",
      "status.firmReady": "Portale azienda pronto – la sync recupera i dati.",
      "legal.note": "Il calcolo resta secondo il diritto tedesco (BMF PAP / SGB IV).",
    },
    pl: {
      "auth.product": "WorkPass Pakiet podatkowy",
      "auth.unlock": "Odblokuj WorkPass",
      "auth.hint": "Chroniony dostęp księgowy · Suppix AI",
      "auth.email": "E-mail (firma lub admin)",
      "auth.password": "Hasło / PIN",
      "auth.pin": "PIN",
      "auth.submit": "Zaloguj",
      "auth.foot": "Jedno logowanie do Hub, Płac i Admin",
      "auth.tab.platform": "Konto platformy",
      "auth.tab.pin": "PIN urządzenia",
      "auth.mode.hub": "Hub · Autonomiczny",
      "auth.mode.lohn": "Odbiór · Zatwierdzenie",
      "auth.mode.admin": "Tylko rola admin",
      "nav.overview": "Przegląd",
      "nav.document": "Utwórz dokument",
      "nav.company": "Dane klienta",
      "nav.help": "Pomoc",
      "nav.lohn": "Płace",
      "nav.hub": "Hub",
      "nav.admin": "Admin",
      "nav.lock": "Zablokuj",
      "nav.language": "Język",
      "app.brand.hub": "WorkPass Pakiet podatkowy",
      "app.brand.lohn": "WorkPass Płace",
      "app.sub.hub": "Suppix AI · Faktury · Płace · Klient",
      "app.sub.lohn": "Suppix AI · Pakiet podatkowy",
      "jump.empfang": "Odbiór",
      "jump.firma": "Firma",
      "jump.lohnarten": "Składniki płac",
      "jump.auszahlung": "Wypłata",
      "jump.archiv": "Archiwum",
      "portal.live": "Portal firmy na żywo",
      "portal.onlyYourData": "Tylko Twoje dane · izolacja włączona",
      "portal.monthClose": "Zamknięcie miesiąca",
      "portal.inbox": "Skrzynka",
      "audit.title": "Przegląd audytu",
      "audit.tenant": "Izolacja najemcy aktywna",
      "audit.company": "Firma",
      "audit.month": "Miesiąc",
      "audit.employees": "Pracownicy",
      "audit.released": "Zatwierdzone",
      "audit.open": "Otwarte zadania",
      "audit.sync": "Sync",
      "audit.data": "Status danych",
      "audit.mandant": "Klient",
      "audit.dataYes": "Dane dostępne",
      "audit.dataNo": "Brak danych miesięcznych",
      "audit.isolation": "Widoczna tylko ta firma (izolacja)",
      "kpi.gross": "Brutto",
      "kpi.net": "Netto / wypłata",
      "kpi.noData": "Brak danych",
      "empfang.title": "Odbiór",
      "empfang.hint": "Plik, skrzynka lub ręcznie – także bez platformy.",
      "empfang.firmHint": "Portal firmy: automatyczne paski płac pojawiają się tutaj.",
      "recv.file": "Plik",
      "recv.paste": "Skrzynka / Wklej",
      "recv.api": "Most API",
      "recv.apiFirm": "Moje paski",
      "recv.manual": "Ręcznie",
      "sync.title": "Automat · Sync platformy",
      "sync.now": "Synchronizuj teraz",
      "sync.ping": "Sprawdź webhook",
      "sync.refresh": "Odśwież portal",
      "comms.title": "Komunikacja z platformą",
      "comms.seen": "Widziane przez platformę",
      "comms.open": "Otwarte – czekanie na platformę",
      "comms.refresh": "Odśwież wiadomości",
      "comms.badge": "Widok audytu",
      "firma.title": "Firma i pracownicy",
      "common.save": "Zapisz",
      "common.cancel": "Anuluj",
      "common.print": "Drukuj",
      "common.pdf": "PDF",
      "common.export": "Eksport",
      "common.new": "Nowy",
      "common.theme": "Motyw",
      "status.ready": "Gotowe – ręcznie, plik lub skrzynka.",
      "status.firmReady": "Portal firmowy gotowy – sync pobiera dane.",
      "legal.note": "Obliczenia pozostają według prawa niemieckiego (BMF PAP / SGB IV).",
    },
  };

  let current = "de";
  let manualOverride = false;

  (window.WorkPassI18nExtraPacks || []).forEach((row) => {
    const key = row?.[0];
    const locs = row?.[1];
    if (!key || !locs) return;
    SUPPORTED.forEach((code) => {
      if (!dict[code]) dict[code] = {};
      if (locs[code] != null) dict[code][key] = locs[code];
    });
  });

  function normalize(code) {
    const raw = String(code || "").trim().toLowerCase().replace("_", "-");
    if (!raw) return "";
    const short = raw.slice(0, 2);
    return SUPPORTED.includes(short) ? short : "";
  }

  function t(key, vars) {
    const pack = dict[current] || dict.de;
    let out = pack[key] || dict.de[key] || key;
    if (vars && typeof vars === "object") {
      Object.keys(vars).forEach((k) => {
        out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
      });
    }
    return out;
  }

  function applyDom(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const val = t(key);
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        if (el.hasAttribute("data-i18n-placeholder")) el.placeholder = val;
        else if (el.type === "submit" || el.type === "button") el.value = val;
      } else if (el.querySelector("svg")) {
        [...el.childNodes].forEach((n) => {
          if (n.nodeType === 3 && String(n.textContent || "").trim()) n.textContent = "";
        });
        let textEl = el.querySelector(".i18n-text");
        if (!textEl) {
          textEl = document.createElement("span");
          textEl.className = "i18n-text";
          el.appendChild(textEl);
        }
        textEl.textContent = val;
      } else if (el.hasAttribute("data-i18n-html")) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) el.placeholder = t(key);
    });
    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      if (key) el.title = t(key);
    });
    scope.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      if (key) el.setAttribute("aria-label", t(key));
    });
    document.documentElement.lang = current;
    document.documentElement.dir = RTL.has(current) ? "rtl" : "ltr";
    document.body?.classList.toggle("is-rtl", RTL.has(current));
    document.querySelectorAll(".wp-lang-select").forEach((sel) => {
      if (sel.value !== current) sel.value = current;
    });
  }

  function setLocale(code, { manual = false, persist = true } = {}) {
    const next = normalize(code) || "de";
    current = next;
    if (manual) manualOverride = true;
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      if (manual) {
        try { localStorage.setItem(`${STORAGE_KEY}.manual`, "1"); } catch { /* ignore */ }
      }
    }
    applyDom(document);
    window.dispatchEvent(new CustomEvent("workpass:locale", { detail: { locale: next, manual } }));
    return next;
  }

  function detectBrowserLocale() {
    const list = navigator.languages || [navigator.language];
    for (const l of list) {
      const n = normalize(l);
      if (n) return n;
    }
    return "de";
  }

  function resolveInitialLocale(hints = {}) {
    try {
      if (localStorage.getItem(`${STORAGE_KEY}.manual`) === "1") {
        manualOverride = true;
        const saved = normalize(localStorage.getItem(STORAGE_KEY));
        if (saved) return saved;
      }
    } catch { /* ignore */ }

    const fromUser = normalize(hints.userLocale || hints.locale || hints.language);
    if (fromUser) return fromUser;

    const fromCompany = normalize(hints.companyLocale || hints.companyLanguage);
    if (fromCompany) return fromCompany;

    try {
      const saved = normalize(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch { /* ignore */ }

    const q = normalize(new URLSearchParams(location.search).get("lang"));
    if (q) return q;

    return detectBrowserLocale();
  }

  function buildSelect(id) {
    const sel = document.createElement("select");
    sel.className = "wp-lang-select";
    sel.id = id || `wpLangSelect_${Math.random().toString(36).slice(2, 7)}`;
    sel.setAttribute("aria-label", t("nav.language"));
    sel.title = t("nav.language");
    SUPPORTED.forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = LABELS[code];
      sel.appendChild(opt);
    });
    sel.value = current;
    sel.addEventListener("change", () => setLocale(sel.value, { manual: true }));
    return sel;
  }

  function mountSelect(host, id) {
    if (!host) return null;
    const existing = host.querySelector(".wp-lang-select");
    if (existing) {
      existing.value = current;
      return existing;
    }
    const wrap = document.createElement("label");
    wrap.className = "wp-lang-wrap";
    wrap.innerHTML = `<span class="wp-lang-label" data-i18n="nav.language">${t("nav.language")}</span>`;
    const sel = buildSelect(id);
    wrap.appendChild(sel);
    host.appendChild(wrap);
    return sel;
  }

  function init(hints = {}) {
    try {
      manualOverride = localStorage.getItem(`${STORAGE_KEY}.manual`) === "1";
    } catch { /* ignore */ }
    const locale = resolveInitialLocale(hints);
    setLocale(locale, { manual: manualOverride, persist: true });
    return locale;
  }

  async function syncFromSession() {
    if (manualOverride) {
      applyDom(document);
      return current;
    }
    try {
      const user = window.WorkPassAuth?.getSessionUser?.();
      const token = window.WorkPassAuth?.getSessionToken?.();
      let locale = normalize(user?.locale || user?.language || user?.preferredLocale);
      if (!locale && token) {
        const origin = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
          ? "http://127.0.0.1:8787"
          : location.origin;
        const res = await fetch(`${origin}/v1/auth/me`, {
          headers: { "X-WorkPass-Session": token },
        });
        const data = await res.json().catch(() => ({}));
        locale = normalize(
          data?.preferredLocale
          || data?.user?.locale
          || data?.user?.language
          || data?.company?.locale
          || data?.workspace?.locale
          || data?.company?.meta?.locale
        );
      }
      if (locale) setLocale(locale, { manual: false, persist: true });
      else applyDom(document);
    } catch {
      applyDom(document);
    }
    return current;
  }

  window.WorkPassI18n = {
    SUPPORTED,
    LABELS,
    MONTH_NAMES,
    t,
    init,
    setLocale,
    getLocale: () => current,
    isManual: () => manualOverride,
    applyDom,
    mountSelect,
    syncFromSession,
    normalize,
    detectBrowserLocale,
    formatMonthYear,
    buildMonthOptions,
  };
})();
