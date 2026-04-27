// Search chefkoch.de recipes from the FlatKitchen app.
// Wraps the npm `chefkoch-api` scraper (no official Chefkoch API exists).
// Called from the browser via supabase.functions.invoke("chefkoch-search", { body: { q } }).

// @ts-ignore — npm interop, no Deno-native types
import chefkochPkg from "npm:chefkoch-api@^1";

type Recipe = {
  name: string;
  url: string;
  ingredients?: { name?: string; amount?: string }[];
  category?: { name?: string; url?: string };
  tags?: { name?: string; url?: string }[];
};

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });

// `r.url` from the library is a chefkoch sub-URL like "rezepte/12345/Foo.html".
// Build an absolute URL for the link, and use the numeric id segment as a
// stable favorite key (falls back to the whole sub-URL if the format changes).
function normalize(r: Recipe) {
  const sub = (r.url || "").replace(/^https?:\/\/[^/]+\//, "").replace(/^\/+/, "");
  const absoluteUrl = sub ? `https://www.chefkoch.de/${sub}` : "";
  const idMatch = sub.match(/rezepte\/(\d+)/);
  const id = idMatch ? idMatch[1] : sub;
  const ingredientsPreview = (r.ingredients || [])
    .slice(0, 6)
    .map((i) => [i?.amount, i?.name].filter(Boolean).join(" ").trim())
    .filter(Boolean);
  return {
    id,
    title: r.name,
    url: absoluteUrl,
    category: r.category?.name || null,
    tags: (r.tags || []).map((t) => t?.name).filter(Boolean),
    ingredientsPreview,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: { q?: string; page?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const q = (body.q || "").trim();
  if (!q) return json([]);

  const startIndex = Math.max(0, Number(body.page ?? 0));
  const endIndex = startIndex + 1; // ~30 results per page in chefkoch-api

  try {
    // The library exports `chefkochAPI` and a `Recipe` class. The default
    // import here is the whole module object.
    const api = (chefkochPkg as any).chefkochAPI ?? (chefkochPkg as any).default?.chefkochAPI;
    if (!api?.searchRecipes) {
      return json({ error: "chefkoch-api unavailable on Deno runtime" }, 502);
    }
    const recipes: Recipe[] = await api.searchRecipes(q, endIndex, startIndex);
    return json((recipes || []).map(normalize));
  } catch (e) {
    console.error("[chefkoch-search] failed:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
