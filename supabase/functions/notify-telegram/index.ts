// Posts Telegram messages to a group chat on new ideas and new comments.
// Triggered by a Supabase Database Webhook on the `ideas` table.
// See ./README.md for setup.

type Comment = { author: string; text: string };

type Idea = {
  id: string;
  date: string;
  dish: string;
  author: string;
  tags?: string[];
  likes?: string[];
  comments?: Comment[];
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Idea;
  old_record: Idea | null;
};

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const APP_URL = "https://flat-kitchen.vercel.app";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const openLink = `\n\n<a href="${APP_URL}">→ Open FlatKitchen</a>`;

async function send(text: string): Promise<void> {
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
  }
}

function messageFor(payload: WebhookPayload): string | null {
  if (payload.table !== "ideas") return null;
  const r = payload.record;

  if (payload.type === "INSERT") {
    const tags = r.tags?.length
      ? ` <i>[${r.tags.map(esc).join(", ")}]</i>`
      : "";
    return `🍽️ New dinner idea: <b>${esc(r.dish)}</b> on ${esc(r.date)} — by ${esc(r.author)}${tags}${openLink}`;
  }

  if (payload.type === "UPDATE") {
    const newCount = r.comments?.length ?? 0;
    const oldCount = payload.old_record?.comments?.length ?? 0;
    if (newCount <= oldCount) return null;
    const latest = r.comments![newCount - 1];
    return `💬 ${esc(latest.author)} on <b>${esc(r.dish)}</b>: ${esc(latest.text)}${openLink}`;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }
  if (!BOT_TOKEN || !CHAT_ID) {
    return new Response("missing telegram config", { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const msg = messageFor(payload);
  if (msg) await send(msg);

  return new Response("ok", { status: 200 });
});
