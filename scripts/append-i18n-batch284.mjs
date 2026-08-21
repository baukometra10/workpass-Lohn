import fs from "node:fs";

const path = new URL("../workpass-i18n-packs.js", import.meta.url);
let s = fs.readFileSync(path, "utf8");
if (!s.trimEnd().endsWith("];")) throw new Error("unexpected packs end");

const L = (de, en, tr, ar, fr, es, it, pl) => ({ de, en, tr, ar, fr, es, it, pl });
const extra = [
  ["hub.employeeDataCached", L(
    "Mitarbeiterdaten für diesen Monat sind bereits geladen – kein erneuter Abruf nötig.",
    "Employee data for this month is already loaded – no re-fetch needed.",
    "Bu ayın çalışan verileri zaten yüklü – yeniden çekmeye gerek yok.",
    "بيانات الموظفين لهذا الشهر محمّلة مسبقاً – لا حاجة لإعادة الجلب.",
    "Les données employés de ce mois sont déjà chargées – pas de nouvel appel.",
    "Los datos de empleados de este mes ya están cargados – no hace falta volver a pedirlos.",
    "I dati dipendenti di questo mese sono già caricati – nessun nuovo richiamo.",
    "Dane pracowników za ten miesiąc są już wczytane – bez ponownego pobierania."
  )],
  ["hub.nextWait1", L(
    "In der Plattform Mitarbeiter und Monatsdaten freigeben und an WorkPass senden",
    "In the platform, release employees and month data and send them to WorkPass",
    "Platformda çalışan ve ay verilerini onaylayıp WorkPass’e gönderin",
    "في المنصة: اعتمد الموظفين وبيانات الشهر وأرسلها إلى WorkPass",
    "Sur la plateforme : libérez employés et données du mois, puis envoyez à WorkPass",
    "En la plataforma: libere empleados y datos del mes y envíelos a WorkPass",
    "Nella piattaforma: rilascia dipendenti e dati del mese e inviali a WorkPass",
    "Na platformie: zatwierdź pracowników i dane miesiąca i wyślij do WorkPass"
  )],
  ["hub.nextWait2", L(
    "Danach im Lohn-Portal „Jetzt synchronisieren“ tippen",
    "Then tap “Sync now” in the payroll portal",
    "Ardından Bordro portalında „Şimdi senkronize et“e basın",
    "ثم اضغط «المزامنة الآن» في بوابة الأجور",
    "Puis appuyez sur « Synchroniser maintenant » dans le portail paie",
    "Luego pulse «Sincronizar ahora» en el portal de nómina",
    "Poi tocca «Sincronizza ora» nel portale paghe",
    "Następnie kliknij „Synchronizuj teraz” w portalu płac"
  )],
  ["hub.nextWait3", L(
    "Offene Nachrichten verschwinden, sobald die Daten angekommen sind",
    "Open messages disappear once the data has arrived",
    "Veriler gelince açık mesajlar kaybolur",
    "تختفي الرسائل المفتوحة عند وصول البيانات",
    "Les messages ouverts disparaissent une fois les données reçues",
    "Los mensajes abiertos desaparecen cuando llegan los datos",
    "I messaggi aperti spariscono quando i dati arrivano",
    "Otwarte wiadomości znikają, gdy dane dotrą"
  )],
];

const block = extra.map(([key, locs]) => `  [${JSON.stringify(key)}, ${JSON.stringify(locs)}]`).join(",\n");
s = s.replace(/\];\s*$/, `${block},\n];\n`);
fs.writeFileSync(path, s);
console.log("appended", extra.length, "keys");
