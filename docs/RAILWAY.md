# Deploy on Railway (HTTPS / TLS)

Railway ينهي TLS على الحافة: العنوان العام يكون دائماً `https://….up.railway.app`.

**دليل Go-Live الكامل:** [`GO_LIVE.md`](GO_LIVE.md)

## خطوات سريعة

1. `npm run secrets` → انسخ إلى Railway Variables  
2. New Project → Deploy from GitHub  
3. Volume على `/data` + المسارات في القالب  
4. بعد النشر: `npm run smoke -- https://<service>.up.railway.app`

## متغيرات مهمة

انظر `.env.example` و `deploy/railway.env.template`.

على الأقل:

| Variable | قيمة |
|----------|------|
| `WORKPASS_STRICT` | `1` |
| `WORKPASS_API_KEY` | سر طويل عشوائي |
| `WORKPASS_DATA_KEY` | سر تشفير منفصل |
| `WORKPASS_FORCE_HTTPS` | `1` |
| `WORKPASS_SERVE_UI` | `1` |
| `WORKPASS_BACKUP_INTERVAL_HOURS` | `24` |
| `WORKPASS_CORS_ORIGIN` | `https://suppix-ai-workpass.com,...` |
| `WORKPASS_PLATFORM_WEBHOOK_URL` | `https://suppix-ai-workpass.com/api/workpass/webhooks/accounting` |
| `WORKPASS_PLATFORM_DOMAIN` | `suppix-ai-workpass.com` |
| `WORKPASS_SQLITE_PATH` | `/data/workpass-local.sqlite` |
| `WORKPASS_BACKUP_DIR` | `/data/backups` |

`PORT` يضبطه Railway تلقائياً؛ السيرفر يسمع على `0.0.0.0`.

الواجهة تُخدم من نفس الخدمة: `/` و `/lohn.html`.

## التحقق

```bash
curl https://<service>.up.railway.app/health
npm run smoke -- https://<service>.up.railway.app
```

## ملفات المشروع

- `railway.json` – أمر التشغيل  
- `Procfile` – احتياطي  
- `server/static.mjs` – UI + API  
- `.env.example` / `deploy/*` – قوالب  
- `sdk/*` – أدوات ربط المنصة  
