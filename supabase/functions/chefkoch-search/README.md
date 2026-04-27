# chefkoch-search

Supabase Edge Function that proxies recipe searches against [chefkoch.de](https://www.chefkoch.de) for the FlatKitchen Recipes tab.

Chefkoch has no official API, so this wraps the unofficial [`chefkoch-api`](https://github.com/gamersi/chefkoch-api) scraper. Browser requests can't hit chefkoch.de directly (CORS), so the React app calls this function via `supabase.functions.invoke("chefkoch-search", { body: { q } })`.

## One-time setup

### 1. Database changes

Run once in the Supabase SQL editor:

```sql
-- Saved favorites per flatmate
create table if not exists recipe_favorites (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- flatmate (matches FLATMATES)
  recipe_id text not null,            -- chefkoch slug / numeric id
  title text not null,
  url text not null,
  image text,
  created_at timestamptz not null default now(),
  unique (name, recipe_id)
);
alter table recipe_favorites enable row level security;
create policy "all read"   on recipe_favorites for select using (true);
create policy "all insert" on recipe_favorites for insert with check (true);
create policy "all delete" on recipe_favorites for delete using (true);

-- Optional recipe link on a dinner idea
alter table ideas
  add column if not exists recipe_url text,
  add column if not exists recipe_image text,
  add column if not exists recipe_title text;
```

Then enable Realtime on `recipe_favorites` (Database → Replication → toggle the table on), so favorites stay in sync across devices like ideas/meals/attendance do.

### 2. Deploy the function

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy chefkoch-search
```

JWT verification stays on (default), so the caller must pass the project's anon key — `supabase.functions.invoke` adds it automatically from the React app.

## Verification

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/chefkoch-search \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "content-type: application/json" \
  -d '{"q":"carbonara"}'
```

Expected: a JSON array of `{ id, title, url, category, tags, ingredientsPreview }`.

Then in the app:

- Open the **Recipes** tab → type `pasta` → results render within ~2 s.
- Tap a card → opens chefkoch.de in a new tab.
- Tap ⭐ → switch to **Saved** → it appears (and stays after reload).
- New Idea form → **🔍 Search Chefkoch** → pick → submit → idea card on Today shows a recipe link.

## Notes

- The scraper returns ~30 results per "page". Pass `{ q, page: 1 }` to get the next batch.
- `id` is the numeric chefkoch recipe id when present (e.g. `2017031326560858`), otherwise the sub-URL. Used as the unique key per flatmate in `recipe_favorites`.
- The library only exposes name, url, ingredients, category, tags. Images and ratings are not surfaced; the `recipe_image` column is reserved for a future enrichment pass.
- If the `npm:chefkoch-api` import ever fails on the Deno runtime, replace the scraper call with a small inline fetch+regex over `https://www.chefkoch.de/rs/s0/<query>/Rezepte.html`. The response shape is the same, so no frontend change is needed.
