import { chromium } from "playwright";

const login = await (
  await fetch("http://127.0.0.1:8787/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "luf@firma.de", password: "4821", audience: "lohn" }),
  })
).json();

const sso = {
  token: login.session,
  expiresAt: login.expiresAt,
  user: { ...login.user, companyId: "cmp-cd3c66a0b71a", role: "accountant", name: "Lufthansa" },
  companyId: "cmp-cd3c66a0b71a",
  via: login.via,
};
const url = `http://127.0.0.1:8787/lohn.html?v=98btn#suppix-sso=${encodeURIComponent(JSON.stringify(sso))}`;
const browser = await chromium.launch({ headless: true, channel: "chrome" });

async function check(w, h, name) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const a = document.querySelector('[data-portal-tab="steuer"]');
    if (a) a.click();
  });
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const form = document.getElementById("lohnForm");
    const actions = document.querySelector("#portalCertificatesCard .month-close-actions");
    const btns = [...(actions?.querySelectorAll("button") || [])];
    const formBox = form.getBoundingClientRect();
    let overflow = 0;
    const details = btns.map((b) => {
      const r = b.getBoundingClientRect();
      const rightOverflow = r.right > formBox.right + 1;
      if (rightOverflow) overflow += 1;
      return {
        text: b.textContent.trim().slice(0, 32),
        w: Math.round(r.width),
        right: Math.round(r.right),
        overflow: rightOverflow,
        wrap: getComputedStyle(b).whiteSpace,
      };
    });
    return {
      formW: Math.round(formBox.width),
      formRight: Math.round(formBox.right),
      overflow,
      cols: actions ? getComputedStyle(actions).gridTemplateColumns : null,
      details,
    };
  });
  await page.screenshot({ path: `scripts/${name}`, fullPage: false });
  console.log(name, JSON.stringify(m, null, 2));
  await page.close();
  return m;
}

const a = await check(1100, 800, "btn-narrow-1100.png");
const b = await check(900, 800, "btn-narrow-900.png");
await browser.close();
if (a.overflow || b.overflow) process.exit(1);
console.log("NO OVERFLOW");
