# Webhook: المحاسبة → المنصة

**المنصة تستقبل** على:

`POST https://suppix-ai-workpass.com/api/workpass/webhooks/accounting`

**المحاسبة ترسل** بعد Freigabe (إعداد على سيرفر المحاسبة فقط):

```
WORKPASS_PLATFORM_WEBHOOK_URL=https://suppix-ai-workpass.com/api/workpass/webhooks/accounting
WORKPASS_PLATFORM_WEBHOOK_KEY=<نفس السر المتفق عليه>
```

---

## 1) Headers الواردة من المحاسبة

| Header | قيمة |
|--------|------|
| `Content-Type` | `application/json` |
| `X-WorkPass-Webhook-Key` | السر المشترك (تحقق إلزامي) |
| `X-WorkPass-Event` | `payslip.released` أو `invoice.released` |

إن كان المفتاح خطأ → أرجع **401**.

---

## 2) جسم الطلب (Envelope)

```json
{
  "kind": "platform.accounting.event.v1",
  "event": "payslip.released",
  "occurredAt": "2026-07-28T10:00:00.000Z",
  "source": "workpass-accounting-bridge",
  "delivery": { }
}
```

`delivery.kind` دائماً: `platform.employee.delivery.v1`

### عند `payslip.released`

انظر: `examples/webhook-payslip.released.json`

حقول مهمة للمنصة:

| حقل | استخدام |
|-----|---------|
| `delivery.deliveryId` | معرّف فريد للتسليم (idempotent) |
| `delivery.company.id` | عزل الشركة (tenant) |
| `delivery.employee.id` | الموظف المستلم |
| `delivery.period` | الشهر |
| `delivery.summary.net` | عرض سريع |
| `delivery.document` | `platform.payslip.v1` كامل |
| `delivery.appRoute` | مسار شاشة التطبيق |

### عند `invoice.released`

انظر: `examples/webhook-invoice.released.json`

---

## 3) ماذا تفعل المنصة عند الاستلام؟

1. تحقق `X-WorkPass-Webhook-Key`
2. تحقق `kind` و`event` و`delivery.deliveryId`
3. إن وُجد `deliveryId` مسبقاً → أرجع 200 (idempotent، لا تكرر الإرسال للموظف)
4. احفظ التسليم لـ `company.id` + `employee.id`
5. أظهر الوثيقة في تطبيق الموظف
6. (مستحسن) أكّد للمحاسبة:

```
POST {ACCOUNTING_API}/v1/delivery/{deliveryId}/ack
Header: X-WorkPass-Key: …
Header: X-WorkPass-Company-Id: {company.id}
Body: { "employeeApp": "workpass", "deliveredAt": "…" }
```

---

## 4) استجابة المنصة المتوقعة

**نجاح (2xx):**

```json
{
  "ok": true,
  "accepted": true,
  "deliveryId": "pay:muster-gmbh::02006::2025-07",
  "employeeAppStatus": "queued"
}
```

**فشل مفتاح:** `401`  
**جسم ناقص:** `400`

المحاسبة تعتبر أي غير-2xx فشلاً وتُبقي العنصر في طابور `/v1/delivery/pending` للسحب لاحقاً.

---

## 5) مثال كود للمنصة (Node / Express)

```js
app.post("/api/workpass/webhooks/accounting", async (req, res) => {
  const key = req.get("X-WorkPass-Webhook-Key");
  if (key !== process.env.WORKPASS_PLATFORM_WEBHOOK_KEY) {
    return res.status(401).json({ ok: false, error: "Invalid webhook key" });
  }

  const envelope = req.body;
  if (envelope?.kind !== "platform.accounting.event.v1" || !envelope.delivery?.deliveryId) {
    return res.status(400).json({ ok: false, error: "Invalid envelope" });
  }

  const { event, delivery } = envelope;
  // idempotent upsert by delivery.deliveryId
  await saveEmployeeDelivery({
    companyId: delivery.company.id,
    employeeId: delivery.employee?.id,
    event,
    delivery,
  });

  // push to employee app inbox…
  return res.status(200).json({
    ok: true,
    accepted: true,
    deliveryId: delivery.deliveryId,
    employeeAppStatus: "queued",
  });
});
```

---

## 6) إعدادات على الجهتين

### سيرفر المحاسبة (Railway)

```
WORKPASS_PLATFORM_WEBHOOK_URL=https://suppix-ai-workpass.com/api/workpass/webhooks/accounting
WORKPASS_PLATFORM_WEBHOOK_KEY=<سر طويل مشترك>
WORKPASS_API_KEY=<مفتاح API المحاسبة>
```

### المنصة

```
WORKPASS_PLATFORM_WEBHOOK_KEY=<نفس السر>
WORKPASS_ACCOUNTING_API_URL=https://<your-accounting>.up.railway.app
WORKPASS_ACCOUNTING_API_KEY=<نفس WORKPASS_API_KEY>
```

---

## 7) اختبار سريع

1. فعّل المسار على المنصة  
2. من المحاسبة: Freigabe لراتب تجريبي  
3. راقب لوج المنصة / inbox الموظف  
4. أو اسحب: `GET /v1/delivery/pending` ثم `POST .../ack`
