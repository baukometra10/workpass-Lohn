# WorkPass Accounting – Security

## الأهداف

حماية بيانات الرواتب/الفواتير بنسبة عالية ضد:
- سرقة ملفات قاعدة البيانات
- تخمين مفاتيح الـ API
- هجمات القوة الغاشمة
- تسرّب بين الشركات (multi-tenant)
- التلاعب غير الملحوظ (سجل تدقيق متسلسل)

لا يوجد نظام «محصّن 100% ضد كل هجوم في الكون» — لكن الطبقات التالية تقلّل السطح وتُبقي المحاسبة عاملة عند الأزمات.

## الطبقات المفعّلة

| طبقة | التنفيذ |
|------|---------|
| تشفير عند التخزين | AES-256-GCM لكل `payload_json` (+ Outbox) |
| مفتاح التشفير | `WORKPASS_DATA_KEY` أو ملف محلي `.data-key` (صلاحيات مقيّدة) |
| API Auth | مقارنة ثابتة الزمن (timing-safe) لـ `X-WorkPass-Key` |
| Rate limit | حد طلبات / IP + قفل بعد فشل المصادقة |
| Body limit | رفض الأجسام الضخمة (~1.5 MB) |
| HTTP headers | nosniff, DENY frame, no-store, CSP صارم للـ API |
| Tenant isolation | `company.id` + Header `X-WorkPass-Company-Id` |
| Audit log | `server/data/audit/security-audit.jsonl` مع سلسلة hash |
| PIN الواجهة | PBKDF2-SHA-256 (120k) + قفل بعد 5 محاولات |
| Local-first | SQLite محلي يبقى إن سقط Postgres |

## الإنتاج (إلزامي)

```bash
set WORKPASS_STRICT=1
set WORKPASS_API_KEY=<عشوائي ≥24 حرف>
set WORKPASS_DATA_KEY=<سر قوي منفصل>
set WORKPASS_CORS_ORIGIN=https://suppix-ai-workpass.com,https://www.suppix-ai-workpass.com,https://app.suppix-ai-workpass.com
set WORKPASS_PLATFORM_WEBHOOK_URL=https://suppix-ai-workpass.com/api/workpass/webhooks/accounting
set WORKPASS_PLATFORM_DOMAIN=suppix-ai-workpass.com
```

مع `WORKPASS_STRICT=1` أو `NODE_ENV=production` يُرفض تشغيل السيرفر بمفتاح التطوير الافتراضي.

## اختبارات

```bash
npm run test:security
```

## سيناريوهات

| سيناريو | السلوك |
|---------|--------|
| سرقة ملف `.sqlite` | البيانات مشفّرة بدون المفتاح |
| تخمين API key | فشل + قفل مؤقت + audit |
| شركة A تطلب بيانات B | 403 Tenant-Isolation |
| عطل Postgres | المحلي يستمر؛ Outbox يُزامَن لاحقاً |
| Brute-force PIN | قفل دقيقتين بعد 5 أخطاء |

## ما يبقى للمرحلة التالية (عند التوسع)

- تدوير مفاتيح التشفير (re-encrypt job)
- WAF / IP allowlist للمنصة فقط (اختياري)
- نسخ احتياطي خارجي إلى S3/R2

**منفَّذ:** نسخ احتياطي مشفّر مجدول → [`BACKUP.md`](BACKUP.md) · Railway + TLS → [`RAILWAY.md`](RAILWAY.md)
