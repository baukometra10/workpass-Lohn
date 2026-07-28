# WorkPass Accounting – Dual Persistence

## المبدأ / Prinzip

1. **محلي أولاً (SQLite):** مصدر الحقيقة دائماً — المحاسبة لا تتوقف إن تعطّل الخارج  
2. **PostgreSQL اختياري:** نسخ/توسع عبر `WORKPASS_DATABASE_URL`  
3. **Outbox:** كل كتابة محلية تُصفّ للمزامنة؛ الفشل لا يلغي العملية المحلية  

```
Write → SQLite (success) → outbox → Postgres (best-effort)
Read  → SQLite always
```

## التشغيل

بدون Postgres (افتراضي):

```bash
npm start
# ملف: server/data/workpass-local.sqlite
```

مع Postgres:

```bash
npm install pg
set WORKPASS_DATABASE_URL=postgres://user:pass@host:5432/workpass
npm start
```

فحص:

```bash
curl http://127.0.0.1:8787/health
curl -H "X-WorkPass-Key: workpass-dev-key" http://127.0.0.1:8787/v1/admin/storage
curl -X POST -H "X-WorkPass-Key: workpass-dev-key" http://127.0.0.1:8787/v1/admin/sync
```

## Env

| Variable | Bedeutung |
|----------|-----------|
| `WORKPASS_SQLITE_PATH` | Pfad zur lokalen DB (Default: `server/data/workpass-local.sqlite`) |
| `WORKPASS_DATABASE_URL` / `DATABASE_URL` | Optional Postgres |
| `WORKPASS_API_HOST` | Default `127.0.0.1`; mit `PORT` (Railway) → `0.0.0.0` |

## Tests

```bash
npm run test:db
npm run test:api
npm run test:tenant
```

## Schema

- `server/db/schema.sql` – lokal
- `server/db/schema.postgres.sql` – remote
- كل الجداول تحمل `company_id` للعزل
