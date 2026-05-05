// Sends a daily Telegram reminder to check attendance and add dinner ideas.
// Triggered by a Supabase pg_cron job — no auth required.

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const APP_URL = "https://flat-kitchen.vercel.app";

Deno.serve(async (_req) => {
  if (!BOT_TOKEN || !CHAT_ID) {
    return new Response("missing telegram config", { status: 500 });
  }

  const text =
    `🍽️ <b>Dinner time soon!</b>\n\nWho's home tonight? Any dinner ideas?\n\n<a href="${APP_URL}">→ Open FlatKitchen</a>`;

  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );

  if (!res.ok) {
    console.error("telegram send failed", res.status, await res.text());
    return new Response("failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
