import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });

const extra = [
  // Document type
  ["doc.typeTitle", L("Dokumenttyp", "Document type", "Belge türü", "نوع المستند", "Type de document", "Tipo de documento", "Tipo documento", "Typ dokumentu")],
  ["doc.dataTitle", L("Dokumentdaten", "Document data", "Belge verileri", "بيانات المستند", "Données du document", "Datos del documento", "Dati documento", "Dane dokumentu")],
  ["doc.invoiceSub", L("§ 14 UStG · PDF & CSV", "§ 14 UStG · PDF & CSV", "§ 14 UStG · PDF & CSV", "§ 14 UStG · PDF و CSV", "§ 14 UStG · PDF & CSV", "§ 14 UStG · PDF y CSV", "§ 14 UStG · PDF e CSV", "§ 14 UStG · PDF i CSV")],
  ["doc.payroll", L("Lohnabrechnung", "Payslip", "Bordro", "كشف الراتب", "Bulletin de paie", "Nómina", "Busta paga", "Lista płac")],
  ["doc.payrollSub", L("Monatlich · Agenda-Standard", "Monthly · Agenda standard", "Aylık · Agenda standard", "شهري · معيار Agenda", "Mensuel · Agenda standard", "Mensual · Agenda estándar", "Mensile · Agenda standard", "Miesięcznie · Agenda standard")],
  ["doc.payrollAnnual", L("Lohnsteuerbescheinigung", "Annual tax certificate", "Yıllık vergi belgesi", "شهادة ضريبة الأجور السنوية", "Attestation fiscale annuelle", "Certificado fiscal anual", "Certificato fiscale annuale", "Roczne zaświadczenie podatkowe")],
  ["doc.payrollAnnualSub", L("Jährlich · ELSTER-Format", "Annual · ELSTER format", "Yıllık · ELSTER formatı", "سنوي · تنسيق ELSTER", "Annuel · format ELSTER", "Anual · formato ELSTER", "Annuale · formato ELSTER", "Rocznie · format ELSTER")],
  ["doc.optInvoice", L("Normale Rechnung (§ 14 UStG)", "Standard invoice (§ 14 UStG)", "Normal fatura (§ 14 UStG)", "فاتورة عادية (§ 14 UStG)", "Facture normale (§ 14 UStG)", "Factura normal (§ 14 UStG)", "Fattura normale (§ 14 UStG)", "Zwykła faktura (§ 14 UStG)")],
  ["doc.optPayroll", L("Lohnabrechnung (monatlich)", "Payslip (monthly)", "Bordro (aylık)", "كشف راتب (شهري)", "Bulletin (mensuel)", "Nómina (mensual)", "Cedolino (mensile)", "Lista (miesięczna)")],
  ["doc.optAnnual", L("Lohnsteuerbescheinigung (jährlich)", "Annual tax certificate (yearly)", "Yıllık vergi belgesi", "شهادة ضريبة الأجور (سنوية)", "Attestation fiscale (annuelle)", "Certificado fiscal (anual)", "Certificato fiscale (annuale)", "Zaświadczenie podatkowe (roczne)")],
  ["doc.number", L("Dokumentnummer", "Document number", "Belge numarası", "رقم المستند", "N° de document", "Número de documento", "Numero documento", "Numer dokumentu")],
  ["doc.created", L("Erstellungsdatum", "Creation date", "Oluşturma tarihi", "تاريخ الإنشاء", "Date de création", "Fecha de creación", "Data di creazione", "Data utworzenia")],
  ["doc.serviceDate", L("Leistungsdatum", "Service date", "Hizmet tarihi", "تاريخ الأداء", "Date de prestation", "Fecha del servicio", "Data prestazione", "Data świadczenia")],
  ["doc.dueDate", L("Fälligkeitsdatum", "Due date", "Vade tarihi", "تاريخ الاستحقاق", "Date d'échéance", "Fecha de vencimiento", "Data di scadenza", "Termin płatności")],
  ["doc.vat", L("Umsatzsteuer", "VAT", "KDV", "ضريبة القيمة المضافة", "TVA", "IVA", "IVA", "VAT")],
  ["doc.vat0", L("0 % (steuerfrei / § 19 UStG)", "0 % (tax-free / § 19 UStG)", "0 % (vergiden muaf / § 19 UStG)", "0٪ (معفى / § 19 UStG)", "0 % (exonéré / § 19 UStG)", "0 % (exento / § 19 UStG)", "0 % (esente / § 19 UStG)", "0 % (zwolnione / § 19 UStG)")],
  ["doc.vat7", L("7 % (ermäßigt)", "7 % (reduced)", "7 % (indirimli)", "7٪ (مخفّض)", "7 % (réduit)", "7 % (reducido)", "7 % (ridotto)", "7 % (obniżony)")],
  ["doc.vat19", L("19 % (Regelsteuersatz)", "19 % (standard rate)", "19 % (standart oran)", "19٪ (المعدل القياسي)", "19 % (taux normal)", "19 % (tipo general)", "19 % (aliquota ordinaria)", "19 % (stawka podstawowa)")],
  ["doc.klein", L("Kleinunternehmer (§ 19 UStG – keine USt ausweisen)", "Small business (§ 19 UStG – no VAT shown)", "Küçük işletme (§ 19 UStG – KDV gösterme)", "منشأة صغيرة (§ 19 UStG – دون إظهار ضريبة)", "Petite entreprise (§ 19 UStG – pas de TVA)", "Pequeña empresa (§ 19 UStG – sin IVA)", "Piccola impresa (§ 19 UStG – senza IVA)", "Mały przedsiębiorca (§ 19 UStG – bez VAT)")],
  ["doc.reverse", L("Reverse-Charge (§ 13b UStG)", "Reverse charge (§ 13b UStG)", "Reverse charge (§ 13b UStG)", "Reverse-Charge (§ 13b UStG)", "Autoliquidation (§ 13b UStG)", "Inversión del sujeto pasivo (§ 13b UStG)", "Inversione contabile (§ 13b UStG)", "Reverse charge (§ 13b UStG)")],
  ["doc.seller", L("Absender / Arbeitgeber", "Sender / employer", "Gönderen / işveren", "المرسل / صاحب العمل", "Expéditeur / employeur", "Remitente / empleador", "Mittente / datore", "Nadawca / pracodawca")],
  ["doc.customer", L("Empfänger / Mitarbeiter-Adresse", "Recipient / employee address", "Alıcı / çalışan adresi", "المستلم / عنوان الموظف", "Destinataire / adresse employé", "Destinatario / dirección empleado", "Destinatario / indirizzo dipendente", "Odbiorca / adres pracownika")],
  ["doc.items", L("Positionen", "Line items", "Kalemler", "البنود", "Lignes", "Partidas", "Voci", "Pozycje")],
  ["doc.addItem", L("+ Position", "+ Line item", "+ Kalem", "+ بند", "+ Ligne", "+ Partida", "+ Voce", "+ Pozycja")],
  ["doc.desc", L("Beschreibung", "Description", "Açıklama", "الوصف", "Description", "Descripción", "Descrizione", "Opis")],
  ["doc.qty", L("Menge", "Qty", "Miktar", "الكمية", "Qté", "Cant.", "Qtà", "Ilość")],
  ["doc.unitPrice", L("Einzelpreis (EUR)", "Unit price (EUR)", "Birim fiyat (EUR)", "سعر الوحدة (EUR)", "Prix unitaire (EUR)", "Precio unitario (EUR)", "Prezzo unitario (EUR)", "Cena jedn. (EUR)")],
  ["doc.lineTotal", L("Gesamt (EUR)", "Total (EUR)", "Toplam (EUR)", "الإجمالي (EUR)", "Total (EUR)", "Total (EUR)", "Totale (EUR)", "Suma (EUR)")],
  ["doc.note", L("Notiz / Zahlungsbedingungen", "Note / payment terms", "Not / ödeme koşulları", "ملاحظة / شروط الدفع", "Note / conditions de paiement", "Nota / condiciones de pago", "Nota / condizioni di pagamento", "Uwaga / warunki płatności")],
  ["doc.signature", L("Signatur", "Signature", "İmza", "التوقيع", "Signature", "Firma", "Firma", "Podpis")],
  ["doc.sigHelp", L("Alle Optionen: Firmen-Auto, stilvolle Namenssignatur, manuell zeichnen oder ohne Unterschrift.", "All options: company auto, styled name signature, draw manually, or none.", "Tüm seçenekler: firma otomatik, stilize isim, elle çiz veya imzasız.", "كل الخيارات: تلقائي للشركة، توقيع اسم أنيق، رسم يدوي أو بدون توقيع.", "Toutes options : auto société, signature stylisée, dessin ou sans.", "Todas las opciones: auto empresa, firma con nombre, dibujar o sin firma.", "Tutte le opzioni: auto azienda, firma stilizzata, disegno o senza.", "Wszystkie opcje: auto firmy, stylowy podpis, rysunek lub bez.")],
  ["doc.sigName", L("Name für Signatur", "Name for signature", "İmza adı", "الاسم للتوقيع", "Nom pour signature", "Nombre para firma", "Nome per firma", "Nazwa do podpisu")],
  ["doc.sigDraw", L("Mit Maus oder Finger unterschreiben.", "Sign with mouse or finger.", "Fare veya parmakla imzalayın.", "وقّع بالفأرة أو الإصبع.", "Signez à la souris ou au doigt.", "Firme con ratón o dedo.", "Firma con mouse o dito.", "Podpisz myszą lub palcem.")],

  // Menus
  ["menu.saveDraft", L("Entwurf speichern", "Save draft", "Taslağı kaydet", "حفظ المسودة", "Enregistrer le brouillon", "Guardar borrador", "Salva bozza", "Zapisz szkic")],
  ["menu.loadDraft", L("Entwurf laden", "Load draft", "Taslağı yükle", "تحميل المسودة", "Charger le brouillon", "Cargar borrador", "Carica bozza", "Wczytaj szkic")],
  ["menu.dupTemplate", L("Als Vorlage duplizieren", "Duplicate as template", "Şablon olarak kopyala", "تكرار كقالب", "Dupliquer comme modèle", "Duplicar como plantilla", "Duplica come modello", "Duplikuj jako szablon")],
  ["menu.exportBackup", L("Datensicherung exportieren", "Export backup", "Yedeği dışa aktar", "تصدير النسخة الاحتياطية", "Exporter la sauvegarde", "Exportar copia", "Esporta backup", "Eksportuj kopię")],
  ["menu.applyLegal", L("Gesetzliche Sätze übernehmen", "Apply statutory rates", "Yasal oranları uygula", "تطبيق النسب القانونية", "Appliquer les taux légaux", "Aplicar tasas legales", "Applica aliquote legali", "Zastosuj stawki ustawowe")],
  ["menu.overview", L("Übersicht", "Overview", "Genel bakış", "نظرة عامة", "Aperçu", "Resumen", "Panoramica", "Przegląd")],
  ["menu.createDoc", L("Beleg erfassen", "Create document", "Belge oluştur", "إنشاء مستند", "Créer un document", "Crear documento", "Crea documento", "Utwórz dokument")],
  ["menu.zoom100", L("Vorschau 100 %", "Preview 100 %", "Önizleme %100", "معاينة 100٪", "Aperçu 100 %", "Vista previa 100 %", "Anteprima 100 %", "Podgląd 100 %")],
  ["menu.exportPdf", L("PDF exportieren", "Export PDF", "PDF dışa aktar", "تصدير PDF", "Exporter PDF", "Exportar PDF", "Esporta PDF", "Eksportuj PDF")],
  ["menu.print", L("Drucken", "Print", "Yazdır", "طباعة", "Imprimer", "Imprimir", "Stampa", "Drukuj")],
  ["menu.invoiceCsv", L("Rechnung CSV", "Invoice CSV", "Fatura CSV", "CSV فاتورة", "CSV facture", "CSV factura", "CSV fattura", "CSV faktury")],
  ["menu.datevCsv", L("DATEV CSV (Lohn)", "DATEV CSV (payroll)", "DATEV CSV (bordro)", "DATEV CSV (أجور)", "DATEV CSV (paie)", "DATEV CSV (nómina)", "DATEV CSV (paghe)", "DATEV CSV (płace)")],
  ["menu.elsterXml", L("ELSTER-XML", "ELSTER-XML", "ELSTER-XML", "ELSTER-XML", "ELSTER-XML", "ELSTER-XML", "ELSTER-XML", "ELSTER-XML")],

  // UStG compliance
  ["comp.seller", L("Name und Anschrift des leistenden Unternehmers", "Name and address of the supplying business", "Hizmet veren işletmenin adı ve adresi", "اسم وعنوان المنشأة المقدِّمة", "Nom et adresse de l'entreprise prestataire", "Nombre y dirección del empresario prestatario", "Nome e indirizzo dell'impresa prestatrice", "Nazwa i adres przedsiębiorcy świadczącego")],
  ["comp.customer", L("Name und Anschrift des Leistungsempfängers", "Name and address of the recipient", "Alıcının adı ve adresi", "اسم وعنوان متلقي الخدمة", "Nom et adresse du destinataire", "Nombre y dirección del destinatario", "Nome e indirizzo del destinatario", "Nazwa i adres odbiorcy")],
  ["comp.number", L("Fortlaufende Rechnungsnummer", "Consecutive invoice number", "Ardışık fatura numarası", "رقم فاتورة متسلسل", "Numéro de facture séquentiel", "Número de factura correlativo", "Numero fattura progressivo", "Kolejny numer faktury")],
  ["comp.issueDate", L("Ausstellungsdatum", "Issue date", "Düzenleme tarihi", "تاريخ الإصدار", "Date d'émission", "Fecha de emisión", "Data di emissione", "Data wystawienia")],
  ["comp.serviceDate", L("Leistungsdatum", "Service date", "Hizmet tarihi", "تاريخ الأداء", "Date de prestation", "Fecha del servicio", "Data prestazione", "Data świadczenia")],
  ["comp.qtyType", L("Menge und Art der Leistung", "Quantity and type of service", "Miktar ve hizmet türü", "كمية ونوع الخدمة", "Quantité et nature de la prestation", "Cantidad y tipo de servicio", "Quantità e tipo di prestazione", "Ilość i rodzaj świadczenia")],
  ["comp.net", L("Entgelt (netto)", "Consideration (net)", "Bedel (net)", "المقابل (صافي)", "Rémunération (net)", "Contrato (neto)", "Corrispettivo (netto)", "Wynagrodzenie (netto)")],
  ["comp.tax", L("Steuersatz und Steuerbetrag", "Tax rate and tax amount", "Vergi oranı ve tutarı", "نسبة الضريبة ومبلغها", "Taux et montant de taxe", "Tipo e importe del impuesto", "Aliquota e importo dell'imposta", "Stawka i kwota podatku")],
  ["comp.hint19", L("Hinweis § 19 UStG", "Note § 19 UStG", "Not § 19 UStG", "ملاحظة § 19 UStG", "Mention § 19 UStG", "Nota § 19 UStG", "Nota § 19 UStG", "Uwaga § 19 UStG")],
  ["comp.taxId", L("Steuernummer oder USt-IdNr.", "Tax number or VAT ID", "Vergi no. veya KDV no.", "الرقم الضريبي أو رقم الضريبة على القيمة المضافة", "N° fiscal ou TVA", "N.º fiscal o IVA", "N. fiscale o P. IVA", "Nr podatkowy lub NIP UE")],

  // Company profile
  ["co.pickProfile", L("Profil auswählen", "Select profile", "Profil seç", "اختيار الملف", "Choisir un profil", "Seleccionar perfil", "Seleziona profilo", "Wybierz profil")],
  ["co.profileName", L("Profilname", "Profile name", "Profil adı", "اسم الملف", "Nom du profil", "Nombre del perfil", "Nome profilo", "Nazwa profilu")],
  ["co.saveProfile", L("Profil speichern", "Save profile", "Profili kaydet", "حفظ الملف", "Enregistrer le profil", "Guardar perfil", "Salva profilo", "Zapisz profil")],
  ["co.syncServer", L("Mit Server synchronisieren", "Sync with server", "Sunucuyla senkronize et", "مزامنة مع الخادم", "Synchroniser avec le serveur", "Sincronizar con el servidor", "Sincronizza con il server", "Synchronizuj z serwerem")],
  ["co.newProfile", L("Neues Profil", "New profile", "Yeni profil", "ملف جديد", "Nouveau profil", "Nuevo perfil", "Nuovo profilo", "Nowy profil")],
  ["co.deleteProfile", L("Profil löschen", "Delete profile", "Profili sil", "حذف الملف", "Supprimer le profil", "Eliminar perfil", "Elimina profilo", "Usuń profil")],
  ["co.syncHint", L("Lokal gespeichert. Mit Firmen-Login zusätzlich auf dem Server.", "Saved locally. With company login also on the server.", "Yerelde kaydedildi. Firma girişi ile ayrıca sunucuda.", "محفوظ محلياً. مع دخول الشركة أيضاً على الخادم.", "Enregistré localement. Avec login entreprise aussi sur le serveur.", "Guardado localmente. Con login de empresa también en el servidor.", "Salvato in locale. Con login azienda anche sul server.", "Zapis lokalny. Z logowaniem firmy także na serwerze.")],
  ["co.logoTitle", L("Firmenlogo", "Company logo", "Firma logosu", "شعار الشركة", "Logo entreprise", "Logo de empresa", "Logo azienda", "Logo firmy")],
  ["co.logoHint", L("PNG oder JPG, max. 2 MB – erscheint auf Rechnung und Lohnabrechnung.", "PNG or JPG, max. 2 MB – appears on invoice and payslip.", "PNG veya JPG, maks. 2 MB – fatura ve bordroda görünür.", "PNG أو JPG، بحد أقصى 2 ميجابايت – يظهر على الفاتورة وكشف الراتب.", "PNG ou JPG, max. 2 Mo – apparaît sur facture et bulletin.", "PNG o JPG, máx. 2 MB – aparece en factura y nómina.", "PNG o JPG, max. 2 MB – appare su fattura e cedolino.", "PNG lub JPG, max. 2 MB – na fakturze i liście.")],
  ["co.logoPick", L("Logo auswählen", "Select logo", "Logo seç", "اختيار الشعار", "Choisir un logo", "Seleccionar logo", "Seleziona logo", "Wybierz logo")],
  ["co.logoRemove", L("Logo entfernen", "Remove logo", "Logoyu kaldır", "إزالة الشعار", "Supprimer le logo", "Quitar logo", "Rimuovi logo", "Usuń logo")],
  ["co.sellerAddr", L("Firma / Arbeitgeber (Anschrift)", "Company / employer (address)", "Firma / işveren (adres)", "الشركة / صاحب العمل (العنوان)", "Entreprise / employeur (adresse)", "Empresa / empleador (dirección)", "Azienda / datore (indirizzo)", "Firma / pracodawca (adres)")],
  ["co.sellerSync", L("Wird mit dem Feld „Verkäufer“ im Beleg synchronisiert.", "Synced with the “Seller” field on the document.", "Belgedeki “Satıcı” alanıyla senkronize edilir.", "يُزامَن مع حقل «البائع» في المستند.", "Synchronisé avec le champ « Vendeur » du document.", "Se sincroniza con el campo «Vendedor» del documento.", "Sincronizzato con il campo «Venditore» del documento.", "Synchronizowane z polem „Sprzedawca” w dokumencie.")],
  ["co.taxNumber", L("Steuernummer", "Tax number", "Vergi numarası", "الرقم الضريبي", "N° fiscal", "N.º fiscal", "N. fiscale", "Nr podatkowy")],
  ["co.vatId", L("USt-IdNr.", "VAT ID", "KDV no.", "رقم الضريبة على القيمة المضافة", "N° TVA", "N.º IVA", "P. IVA", "NIP UE")],
  ["co.register", L("Handelsregister", "Commercial register", "Ticaret sicili", "السجل التجاري", "Registre du commerce", "Registro mercantil", "Registro imprese", "KRS")],
  ["co.director", L("Geschäftsführer", "Managing director", "Yönetici", "المدير", "Gérant", "Gerente", "Amministratore", "Dyrektor")],
  ["co.bank", L("Bank", "Bank", "Banka", "البنك", "Banque", "Banco", "Banca", "Bank")],
  ["co.iban", L("IBAN (Firma)", "IBAN (company)", "IBAN (firma)", "IBAN (الشركة)", "IBAN (entreprise)", "IBAN (empresa)", "IBAN (azienda)", "IBAN (firma)")],
  ["co.bic", L("BIC (Firma)", "BIC (company)", "BIC (firma)", "BIC (الشركة)", "BIC (entreprise)", "BIC (empresa)", "BIC (azienda)", "BIC (firma)")],
  ["co.datevClient", L("DATEV-Mandant-Nr.", "DATEV client no.", "DATEV müşteri no.", "رقم عميل DATEV", "N° client DATEV", "N.º cliente DATEV", "N. cliente DATEV", "Nr klienta DATEV")],
  ["co.datevConsultant", L("DATEV-Berater-Nr.", "DATEV consultant no.", "DATEV danışman no.", "رقم مستشار DATEV", "N° conseiller DATEV", "N.º asesor DATEV", "N. consulente DATEV", "Nr doradcy DATEV")],
  ["co.payrollLayout", L("Lohn-Vorlage", "Payroll template", "Bordro şablonu", "قالب الرواتب", "Modèle de paie", "Plantilla de nómina", "Modello paga", "Szablon płac")],
  ["co.letterhead", L("Briefkopf & Fußzeile (Lohnabrechnung)", "Letterhead & footer (payslip)", "Antet & altbilgi (bordro)", "ترويسة وتذييل (كشف الراتب)", "En-tête & pied (bulletin)", "Membrete y pie (nómina)", "Intestazione e piè (cedolino)", "Nagłówek i stopka (lista)")],
  ["co.letterheadHint", L("Erscheint auf jeder Lohnabrechnung im PDF – z. B. Abteilung im Kopf, Impressum in der Fußzeile.", "Appears on every payslip PDF – e.g. department in header, imprint in footer.", "Her bordro PDF’inde görünür.", "يظهر على كل كشف PDF – مثلاً القسم في الرأس والنص القانوني في التذييل.", "Apparaît sur chaque bulletin PDF.", "Aparece en cada PDF de nómina.", "Compare su ogni PDF cedolino.", "Pojawia się na każdej liście PDF.")],
  ["co.headerLine", L("Zusatzzeile unter Firmenname", "Extra line under company name", "Firma adının altında ekstra satır", "سطر إضافي تحت اسم الشركة", "Ligne sous le nom", "Línea bajo el nombre", "Riga sotto il nome", "Dodatkowa linia pod nazwą")],
  ["co.footerLine", L("Fußzeile (mehrzeilig)", "Footer (multiline)", "Altbilgi (çok satır)", "التذييل (متعدد الأسطر)", "Pied de page (multiligne)", "Pie (multilínea)", "Piè di pagina (multiriga)", "Stopka (wieloliniowa)")],
  ["co.footerAuto", L("Leer lassen = Fußzeile wird automatisch aus Geschäftsführer, HRB und Firmenbank erzeugt.", "Leave empty = footer is built automatically from director, register and bank.", "Boş bırak = altbilgi otomatik oluşur.", "اتركه فارغاً = يُنشأ التذييل تلقائياً من المدير والسجل والبنك.", "Laisser vide = pied généré automatiquement.", "Dejar vacío = pie automático.", "Lascia vuoto = piè automatico.", "Puste = stopka automatyczna.")],

  // Status / welcome
  ["hub.welcomeLocal", L("Mandant „{name}“ · {n} gespeicherte Lohn-Monate", "Client “{name}” · {n} saved payroll months", "Müşteri „{name}“ · {n} kayıtlı ay", "العميل «{name}» · {n} أشهر رواتب محفوظة", "Client « {name} » · {n} mois enregistrés", "Cliente «{name}» · {n} meses guardados", "Cliente «{name}» · {n} mesi salvati", "Klient „{name}” · {n} zapisanych miesięcy")],
  ["hub.firmLine", L("Firma · {id}", "Company · {id}", "Firma · {id}", "الشركة · {id}", "Entreprise · {id}", "Empresa · {id}", "Azienda · {id}", "Firma · {id}")],
  ["hub.localMeta", L("{ws} · Lokal: Mandant „{name}“ · {n} Lohn-Monate · Archiv {a}", "{ws} · Local: client “{name}” · {n} payroll months · Archive {a}", "{ws} · Yerel: müşteri „{name}“ · {n} ay · Arşiv {a}", "{ws} · محلي: العميل «{name}» · {n} أشهر أجور · الأرشيف {a}", "{ws} · Local : client « {name} » · {n} mois · Archive {a}", "{ws} · Local: cliente «{name}» · {n} meses · Archivo {a}", "{ws} · Locale: cliente «{name}» · {n} mesi · Archivio {a}", "{ws} · Lokalnie: klient „{name}” · {n} miesięcy · Archiwum {a}")],
  ["hub.syncOkMonth", L("Sync OK · Monat {period}", "Sync OK · month {period}", "Sync OK · ay {period}", "المزامنة OK · الشهر {period}", "Sync OK · mois {period}", "Sync OK · mes {period}", "Sync OK · mese {period}", "Sync OK · miesiąc {period}")],
  ["hub.waitMonth", L("Warte auf Plattform · {n} offen · Monat {period}", "Waiting for platform · {n} open · month {period}", "Platform bekleniyor · {n} açık · ay {period}", "بانتظار المنصة · {n} مفتوح · الشهر {period}", "En attente plateforme · {n} ouverts · mois {period}", "Esperando plataforma · {n} abiertos · mes {period}", "In attesa piattaforma · {n} aperti · mese {period}", "Czekam na platformę · {n} otwarte · miesiąc {period}")],
  ["hub.webhookMonth", L("Webhook-Fehler {status} · Monat {period}", "Webhook error {status} · month {period}", "Webhook hatası {status} · ay {period}", "خطأ Webhook {status} · الشهر {period}", "Erreur webhook {status} · mois {period}", "Error webhook {status} · mes {period}", "Errore webhook {status} · mese {period}", "Błąd webhook {status} · miesiąc {period}")],
  ["hub.syncMonth", L("Sync {label} · Monat {period}", "Sync {label} · month {period}", "Sync {label} · ay {period}", "مزامنة {label} · الشهر {period}", "Sync {label} · mois {period}", "Sync {label} · mes {period}", "Sync {label} · mese {period}", "Sync {label} · miesiąc {period}")],
  ["hub.bridgeOffline", L("Firma · {id} · Bridge offline ({err})", "Company · {id} · Bridge offline ({err})", "Firma · {id} · Bridge çevrimdışı ({err})", "الشركة · {id} · الجسر غير متصل ({err})", "Entreprise · {id} · Bridge hors ligne ({err})", "Empresa · {id} · Bridge sin conexión ({err})", "Azienda · {id} · Bridge offline ({err})", "Firma · {id} · Bridge offline ({err})")],
  ["hub.fromServerLocal", L("Firma vom Server · Stammdaten-Erweiterung noch lokal", "Company from server · master-data extension still local", "Firma sunucudan · ana veri genişlemesi hâlâ yerel", "الشركة من الخادم · توسيع البيانات الأساسية ما زال محلياً", "Entreprise du serveur · extension locale", "Empresa del servidor · extensión aún local", "Azienda dal server · estensione ancora locale", "Firma z serwera · rozszerzenie nadal lokalne")],
];

const existing = new Set([...s.matchAll(/\["([^"]+)"/g)].map((m) => m[1]));
const filtered = extra.filter(([k]) => !existing.has(k));
const lines = filtered.map(([k, o]) => `  ${JSON.stringify([k, o])},`).join("\n");
if (lines) {
  s = s.replace(/\];\s*$/, `${lines}\n];\n`);
  fs.writeFileSync(path, s);
}
console.log("added", filtered.length, "skipped", extra.length - filtered.length);
