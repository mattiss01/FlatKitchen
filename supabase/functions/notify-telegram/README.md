# notify-telegram

Supabase Edge Function that posts a Telegram message every time a dinner idea or comment is added in FlatKitchen. Runs on a Database Webhook against the `ideas` table — the React app is unchanged.

## One-time setup

### 1. Create a Telegram bot and group

1. In Telegram, message **@BotFather** → `/newbot` → name it → save the **bot token**.
2. Create a Telegram group. Add Mattis, Robert, Jakob, and the bot.
3. Send any message in the group, then open:
   ```
   https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
   ```
   Copy the group's numeric `chat.id` from the JSON (group IDs start with `-`). This is the **chat id**.

### 2. Set REPLICA IDENTITY so webhook payloads include the old row

By default Postgres only includes the primary key in `old_record` for UPDATEs. The function compares `old_record.comments.length` to `record.comments.length`, so we need the full previous row. Run once in the Supabase SQL editor:

```sql
ALTER TABLE public.ideas REPLICA IDENTITY FULL;
```

Without this, every like/unlike would be misclassified as a new comment.

### 3. Deploy the function

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set \
  TELEGRAM_BOT_TOKEN=<bot token> \
  TELEGRAM_CHAT_ID=<group chat id> \
  WEBHOOK_SECRET=<random string, e.g. openssl rand -hex 32>
supabase functions deploy notify-telegram --no-verify-jwt
```

`--no-verify-jwt` is required because the caller is a DB webhook, not an authed end user. Our own `x-webhook-secret` header takes its place.

### 4. Create the Database Webhook

Supabase Dashboard → **Database → Webhooks → Create a new hook**:

- **Name:** `notify-telegram`
- **Table:** `ideas`
- **Events:** Insert, Update
- **Type:** Supabase Edge Functions → `notify-telegram`
- **HTTP Headers:**
  - `x-webhook-secret: <same value as WEBHOOK_SECRET>`

## Verification

Smoke test the function directly:

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/notify-telegram \
  -H "content-type: application/json" \
  -H "x-webhook-secret: <secret>" \
  -d '{"type":"INSERT","table":"ideas","record":{"id":"t","date":"2026-04-23","dish":"Test pasta","author":"Mattis","tags":["veggie"],"likes":[],"comments":[]},"old_record":null}'
```

Expected: one message in the Telegram group, `ok` returned.

Then end-to-end:

- Add an idea in the app → message within ~2 seconds.
- Add a comment on another device → second message.
- Toggle a like → nothing (confirms the likes-only UPDATE is ignored).
- Delete a comment → nothing (comments array shrinks, so `newCount <= oldCount`).

Auth check:

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/notify-telegram \
  -H "content-type: application/json" -d '{}'
# → 401 unauthorized
```
