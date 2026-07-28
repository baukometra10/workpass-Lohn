# Go-Live – رفع المحاسبة على Railway + ربط المنصة

دليل جاهز للإنتاج. المنصة: **suppix-ai-workpass.com**

---

## 1) أسرار الإنتاج (محلياً مرة واحدة)

```bash
npm run secrets
```

انسخ المخرجات إلى **Railway → Variables** (لا ترفعها إلى Git).

---

## 2) رفع المشروع على Railway

1. ادفع المستودع إلى GitHub  
2. Railway → **New Project** → Deploy from GitHub  
3. أضف المتغيرات (من `npm run secrets` + الجدول أدناه)  
4. أضف **Volume** على المسار `/data`  
5. Deploy

| Variable | قيمة |
|----------|------|
| `WORKPASS_STRICT` | `1` |
| `WORKPASS_FORCE_HTTPS` | `1` |
| `WORKPASS_SERVE_UI` | `1` |
| `WORKPASS_API_KEY` | من `npm run secrets` |
| `WORKPASS_DATA_KEY` | من `npm run secrets` |
| `WORKPASS_BACKUP_KEY` | من `npm run secrets` |
| `WORKPASS_PLATFORM_WEBHOOK_KEY` | نفس المفتاح مع المنصة |
| `WORKPASS_PLATFORM_DOMAIN` | `suppix-ai-workpass.com` |
| `WORKPASS_CORS_ORIGIN` | `https://suppix-ai-workpass.com,https://www.suppix-ai-workpass.com,https://app.suppix-ai-workpass.com` |
| `WORKPASS_PLATFORM_WEBHOOK_URL` | `https://suppix-ai-workpass.com/api/workpass/webhooks/accounting` |
| `WORKPASS_SQLITE_PATH` | `/data/workpass-local.sqlite` |
| `WORKPASS_BACKUP_DIR` | `/data/backups` |
| `WORKPASS_BACKUP_INTERVAL_HOURS` | `24` |

`PORT` يضبطه Railway تلقائياً.

---

## 3) بعد النشر – تحقق سريع

استبدل الرابط برابط خدمتك:

```bash
npm run smoke -- https://YOUR-SERVICE.up.railway.app
# مع مفتاح الإنتاج:
WORKPASS_API_KEY=... npm run smoke -- https://YOUR-SERVICE.up.railway.app
```

يفحص:

- `GET /health`
- واجهة `index.html` + `lohn.html`
- `GET /v1/companies` بالمفتاح
- upsert شركة تجريبية إن وُجد المثال

روابط المستخدم بعد النجاح:

| صفحة | URL |
|------|-----|
| فاتورة / Hub | `https://YOUR-SERVICE.up.railway.app/` |
| Lohn | `https://YOUR-SERVICE.up.railway.app/lohn.html` |
| Health | `https://YOUR-SERVICE.up.railway.app/health` |
| API | `https://YOUR-SERVICE.up.railway.app/v1/...` |

---

## 4) أدوات الربط للمنصة (ترفع معها / تعطيها للفريق)

| ملف | الغرض |
|-----|--------|
| `sdk/workpass-accounting-client.mjs` | SDK جاهز للمنصة |
| `sdk/platform-connect.mjs` | خريطة endpoints + webhook |
| `docs/PLATFORM_INTEGRATION.md` | عقد التدفق الكامل |
| `docs/PLATFORM_WEBHOOK.md` | ما يجب أن تستقبله المنصة |
| `examples/platform-*.json` | أمثلة ingest |
| `examples/webhook-*.json` | أمثلة أحداث Freigabe |
| `deploy/platform-env.snippet` | متغيرات تضعها المنصة |

على المنصة بعد معرفة رابط Railway:

```
WORKPASS_ACCOUNTING_BASE_URL=https://YOUR-SERVICE.up.railway.app
WORKPASS_API_KEY=<نفس WORKPASS_API_KEY>
```

والمحاسبة ترسل الـ webhook إلى:

`https://suppix-ai-workpass.com/api/workpass/webhooks/accounting`  
Header: `X-WorkPass-Webhook-Key`

---

## 5) ترتيب التشغيل الموصى به

1. Deploy المحاسبة على Railway + Volume  
2. `npm run smoke` أخضر  
3. فعّل endpoint الـ webhook على المنصة (انظر `PLATFORM_WEBHOOK.md`)  
4. اختبر: ingest payroll → Freigabe في lohn → delivery/webhook → ack  
5. (اختياري) أضف Postgres: `WORKPASS_DATABASE_URL`

---

## ملفات المشروع المتعلقة بالنشر

- `railway.json` / `Procfile`  
- `server/static.mjs` – واجهة + API من نفس الخدمة  
- `.env.example` / `deploy/railway.env.template`  
