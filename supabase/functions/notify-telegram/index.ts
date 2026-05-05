// Posts Telegram messages to a group chat on new ideas, new comments, shopping list, and expense events.
// Triggered by Supabase Database Webhooks on the `ideas`, `shopping_items`, and `expenses` tables.
// See ./README.md for setup.

type IdeaComment = { author: string; text: string };

type Idea = {
  id: string;
  date: string;
  dish: string;
  author: string;
  tags?: string[];
  likes?: string[];
  comments?: IdeaComment[];
};

type ShoppingItem = {
  id: string;
  text: string;
  added_by: string;
  bought_by: string | null;
  bought_at: string | null;
};

type Expense = {
  id: string;
  amount: number;
  paid_by: string;
  description: string;
  split_between: string[];
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Idea | ShoppingItem | Expense;
  old_record: Idea | ShoppingItem | Expense | null;
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
  // ─── ideas ───────────────────────────────────────────────────────
  if (payload.table === "ideas") {
    const r = payload.record as Idea;

    if (payload.type === "INSERT") {
      const tags = r.tags?.length
        ? ` <i>[${r.tags.map(esc).join(", ")}]</i>`
        : "";
      return `🍽️ New dinner idea: <b>${esc(r.dish)}</b> on ${esc(r.date)} — by ${esc(r.author)}${tags}${openLink}`;
    }

    if (payload.type === "UPDATE") {
      const newCount = r.comments?.length ?? 0;
      const oldCount = (payload.old_record as Idea)?.comments?.length ?? 0;
      if (newCount <= oldCount) return null;
      const latest = r.comments![newCount - 1];
      return `💬 ${esc(latest.author)} on <b>${esc(r.dish)}</b>: ${esc(latest.text)}${openLink}`;
    }

    return null;
  }

  // ─── shopping_items ──────────────────────────────────────────────
  if (payload.table === "shopping_items") {
    const r = payload.record as ShoppingItem;

    if (payload.type === "INSERT") {
      return `🛒 ${esc(r.added_by)} added to shopping list: <b>${esc(r.text)}</b>${openLink}`;
    }

    if (payload.type === "UPDATE") {
      const old = payload.old_record as ShoppingItem | null;
      if (r.bought_by && !old?.bought_by) {
        return `✅ ${esc(r.bought_by)} bought <b>${esc(r.text)}</b>${openLink}`;
      }
      return null;
    }

    return null;
  }

  // ─── expenses ────────────────────────────────────────────────────
  if (payload.table === "expenses") {
    const r = payload.record as Expense;

    if (payload.type === "INSERT") {
      const desc = r.description ? ` <i>(${esc(r.description)})</i>` : "";
      const split = r.split_between?.length > 0 ? ` · split between ${r.split_between.map(esc).join(", ")}` : "";
      return `💶 ${esc(r.paid_by)} paid <b>€${parseFloat(String(r.amount)).toFixed(2)}</b>${desc}${split}${openLink}`;
    }

    return null;
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
