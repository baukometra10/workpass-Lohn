import fs from "fs";
import { createHash } from "crypto";

const online = await (await fetch("https://workpass-lohn.up.railway.app/lohn.html")).text();
const local = fs.readFileSync("lohn.html", "utf8");
const norm = (s) => s.replace(/\r\n/g, "\n");

function sha(s) {
  return createHash("sha256").update(norm(s)).digest("hex").slice(0, 12);
}

console.log("online", online.length, sha(online));
console.log("local ", local.length, sha(local));

// Save online baseline
fs.writeFileSync("scripts/online-lohn.html", norm(online));

function balanceBeforePreview(html, label) {
  const layout = html.indexOf('id="lohnLayout"');
  const preview = html.indexOf('id="lohnPreview"');
  const slice = html.slice(layout, preview);
  const opens = (slice.match(/<div\b/g) || []).length;
  const closes = (slice.match(/<\/div>/g) || []).length;
  console.log(label, { layout, preview, opens, closes, balance: opens - closes });
}

balanceBeforePreview(norm(online), "online");
balanceBeforePreview(norm(local), "local");

// Show whether year-end sits inside layout
for (const [label, html] of [
  ["online", norm(online)],
  ["local", norm(local)],
]) {
  const ye = html.indexOf("portalYearEndCard");
  const preview = html.indexOf('id="lohnPreview"');
  const layout = html.indexOf('id="lohnLayout"');
  console.log(label, "yearEnd", ye, "insideLayoutBeforePreview", ye > layout && (ye < 0 || ye < preview));
}
