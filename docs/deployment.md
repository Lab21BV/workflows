# Deployen op Vercel

## Setup

1. Repo aan een Vercel project hangen:
   ```bash
   vercel link
   ```

2. Environment vars (Vercel UI of CLI):
   ```bash
   vercel env add ZOHO_CLIENT_ID          production
   vercel env add ZOHO_CLIENT_SECRET      production
   vercel env add ZOHO_REFRESH_TOKEN      production
   vercel env add ZOHO_WEBHOOK_SECRET     production
   vercel env add CRON_SECRET             production
   ```

3. Deploy:
   ```bash
   vercel deploy --prod
   ```

## Endpoints

### `POST /api/webhooks/zoho`

Configureer in **Zoho Setup → Automation → Webhooks**:

| Field | Value |
|---|---|
| URL | `https://<deployment>.vercel.app/api/webhooks/zoho` |
| Method | POST |
| Body type | JSON |
| Headers | `X-Workflow: <workflow-id>`, `X-Zoho-Signature: <hmac-sha256(body, ZOHO_WEBHOOK_SECRET)>` |

Body voorbeeld voor `X-Workflow: showroom-afspraak-geweest`:
```json
{
  "showroomId": "${Showroom.id}",
  "status": "${Showroom.Fase}",
  "previousStatus": "${Showroom.Fase_old}"
}
```

Workflows kunnen in Zoho aangesloten worden op een Workflow Rule, een
Custom Function call, of direct vanuit een Blueprint transition.

### `GET /api/cron/showroom-review-followup`

Vercel cron, dagelijks 08:00 UTC (zie `vercel.json`). Scant Showroom-records
met Fase=Geweest die 3-30 dagen geleden zijn aangepast en heeft nog geen
Reviews-record. Maakt voor elk een Review-aanvraag aan.

Vercel signt cron-requests met `Authorization: Bearer ${CRON_SECRET}`.

## Lokaal testen

```bash
# Eén workflow runnen met test-payload
npx tsx src/index.ts showroom-afspraak-geweest \
  '{"showroomId":"728921000099999999","status":"Geweest"}'

# Met Vercel dev (port 3000)
vercel dev
curl -X POST http://localhost:3000/api/webhooks/zoho \
  -H "X-Workflow: showroom-afspraak-geweest" \
  -H "Content-Type: application/json" \
  -d '{"showroomId":"728921000099999999","status":"Geweest"}'
```

## Bewaking

- Vercel logs voor function-output en errors
- Cron run history in Vercel project → Cron Jobs
- Zoho Setup → Automation → Workflow Rules audit log voor webhook deliveries
