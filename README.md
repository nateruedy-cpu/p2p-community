# P2P — Setup Guide

A private community space for P2P members: real accounts, five sections, all free to run (Supabase free tier + Netlify free tier).

**What's in it:**
- **Wins** — post a win, react with 🔥💪🏆
- **The Board** — general posts: links, questions, recommendations. Comments + reactions.
- **Live Chat** — real-time group chat, reply to specific messages
- **Daily Check-In** — checklist, streak counter, levels
- **Team Announcements** — only approved posters can start a thread; everyone can comment/react

No build step — it's plain HTML/CSS/JS, deployed as a static site.

---

## 1. Create your Supabase project (free)

1. Go to **supabase.com** → sign up → **New project**. Save your DB password somewhere.
2. Wait ~2 minutes for it to spin up.
3. **SQL Editor → New query** → paste in everything from `supabase-schema.sql` → **Run**.
   - This creates `profiles`, `posts`, `comments`, `reactions`, `messages`, and `checkins`, with row-level security so members can only post/edit as themselves.
4. **Project Settings → API** → copy the **Project URL** and **anon public** key into `config.js`:

```js
const SUPABASE_URL = "https://xxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

The anon key is meant to be public — it's not an admin secret. The database policies are what actually protect the data.

### Optional: skip email confirmation
For a small trusted group, turn off **Authentication → Providers → Email → Confirm email** so signup is instant.

---

## 2. Make yourself (and anyone else) able to post Announcements

By default, nobody can post in Team Announcements — not even you — until you flip a flag. This is a one-time manual step per person:

1. Have that person sign up on the site first (so their row exists in `profiles`).
2. In Supabase: **Table Editor → profiles** → find their row → set `can_announce` to `true` (and `is_admin` to `true` for yourself, so you're covered even if the flag above is ever off).

That's it — no separate admin panel needed for now. If you end up adding/removing announcement posters often, say the word and I'll build a simple in-app toggle for this.

---

## 3. Put this project on GitHub

Create a repo (e.g. `p2p-community`) and upload: `index.html`, `style.css`, `app.js`, `config.js` (with your real keys), `supabase-schema.sql`, `README.md`.

---

## 4. Deploy on Netlify (free)

1. **netlify.com** → sign up → **Add new site → Import an existing project** → connect GitHub → pick your repo.
2. Leave build settings blank (no build command needed). **Deploy**.
3. You get a live URL like `p2p-community.netlify.app` — rename it or attach a custom domain for free under **Site settings → Domain management**.

Share the link with your P2P members — each person creates their own account directly on the site. Anyone with the link can sign up, so only share it with the group.

---

## Easy things to customize yourself

Both live at the top of `app.js`, clearly marked:
- **`CHECKLIST_ITEMS`** — the daily check-in list. Add, remove, or reword any item. Two item types:
  - `type: 'boolean'` — a plain checkbox (e.g. "Trained today", "Posted on Instagram").
  - `type: 'counter'` — a tap-to-count item with a daily target (e.g. "Sent cold DMs", target 10). Change `target` to whatever number you want.
  - `clientsOnly: true` — the item only shows for members who've switched on "I currently coach clients" at the top of their check-in page. Right now that's just "Checked in with clients," but you can mark any item this way.
- **`LEVELS`** — the streak thresholds and level names (Rookie → Legend). Rename or retune freely.

Current default checklist: Trained today, Hit nutrition target, Mindset, Posted on Instagram, Posted on YouTube, Posted on TikTok, Sent cold DMs (target 10), Checked in with clients (clients-only, target 1).

---

## How the streak works
A day only counts once every *visible* checklist item is complete — boolean items checked, counter items hit their target. Members without clients toggled on simply don't have that item counted against them. The streak counts consecutive completed days working backward from today — if today isn't finished yet, it doesn't break your existing streak, it just doesn't add to it until you check everything off.

## Natural next additions
- Push/email notifications for new announcements or replies
- In-app admin panel for granting announcement rights
- Photo/image attachments on posts
- Direct messages between members
