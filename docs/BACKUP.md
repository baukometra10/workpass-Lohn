# Encrypted Backups

## إنشاء نسخة

```bash
npm run backup:create
```

الملف: `server/data/backups/workpass-….wpbak`  
التشفير: AES-256-GCM (مفتاح `WORKPASS_BACKUP_KEY` أو `WORKPASS_DATA_KEY`)  
التحقق: SHA-256 داخل الـ meta

## جدولة تلقائية

```bash
set WORKPASS_BACKUP_INTERVAL_HOURS=24
set WORKPASS_BACKUP_KEEP=30
npm start
```

أول نسخة بعد ~15 ثانية من التشغيل، ثم كل N ساعات.

عبر API (بمفتاح صالح):

```bash
curl -X POST -H "X-WorkPass-Key: …" https://YOUR_APP/v1/admin/backup
curl -H "X-WorkPass-Key: …" https://YOUR_APP/v1/admin/backups
```

## استعادة

```bash
npm run backup:restore -- server/data/backups/workpass-….wpbak
npm start
```

قبل الاستبدال يُحفظ تلقائياً: `workpass-local.sqlite.pre-restore-…`

## ملاحظات Railway

اربط **Volume** على مسار البيانات (مثلاً `/data`) واضبط:

```
WORKPASS_SQLITE_PATH=/data/workpass-local.sqlite
WORKPASS_BACKUP_DIR=/data/backups
WORKPASS_BACKUP_INTERVAL_HOURS=24
```

بدون Volume تُفقد الملفات عند إعادة النشر.

## SQLite corrupt (`database disk image malformed`)

عند الإقلاع يفحص WorkPass الـ DB (`PRAGMA integrity_check`). إذا كانت تالفة:

1. **تلقائياً** يستعيد أحدث `.wpbak` (افتراضي؛ عطّله بـ `WORKPASS_AUTO_RESTORE_ON_CORRUPT=0`)
2. الملف التالف يُنقل إلى `workpass-local.sqlite.corrupt-<timestamp>`
3. بدون نسخ احتياطية: اضبط مؤقتاً `WORKPASS_RESET_CORRUPT_DB=1` لبدء DB فارغة (فقدان البيانات) — أو استعد يدوياً:

```bash
npm run backup:list
npm run backup:restore -- /data/backups/workpass-….wpbak
```
