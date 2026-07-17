# 🚀 AbaBank Deployment Checklist

Track your path to going live. Tick boxes as you go (`[ ]` → `[x]`), commit, and
the same list stays visible on GitHub.

Target: one always-on container + a persistent volume on **Fly.io** (works from
anywhere, cron fires for interest/allowances). Plain-Docker notes are in the README.

---

## 1. Decisions to lock in first

- [ ] **Family currency** — set once at first launch, can't change later. (USD / ILS / EUR / GBP / CAD / AUD)
- [ ] **Family password** — the shared word everyone types once per device before the login screen. Pick something not guessable.
- [ ] **Each person's PIN** — 6–10 digits, one per parent and kid.
- [ ] **ntfy topic** (optional) — a unique topic name for push notifications when a kid requests money.
- [ ] **Region** — closest Fly region to home (default in `fly.toml` is `fra`; e.g. `iad` US-east, `ams` Europe).

## 2. Prerequisites (one-time, on this machine)

- [ ] Install the Fly CLI — `curl -L https://fly.io/install.sh | sh`
- [ ] Sign in — run `! fly auth login` in the Claude prompt (or in your terminal)
- [ ] Confirm the repo is clean and pushed — `git status` shows nothing to commit

## 3. Provision on Fly

- [ ] Create the app (uses the bundled `fly.toml`, doesn't deploy yet)
      `fly launch --copy-config --no-deploy`
      - When asked to tweak settings, keep the name **ababank** (or note the new name)
      - Pick your region from step 1
- [ ] Create the persistent data volume (holds the SQLite DB + session secret)
      `fly volumes create ababank_data --size 1 --region <your-region>`
- [ ] Set a stable session secret so logins survive redeploys
      `fly secrets set SESSION_SECRET=$(openssl rand -hex 32)`

## 4. Deploy

- [ ] `fly deploy`
- [ ] Wait for the machine to report healthy — `fly status`
- [ ] Open it — `fly open` (note the URL, e.g. `https://ababank.fly.dev`)

## 5. First-run setup (in the browser)

- [ ] Visit the URL → you land on **/setup**
- [ ] Create the parent (banker): name + PIN + **family password** + currency
- [ ] Log in, go to **👧 Kids**, add each kid (name + 6-digit PIN)
- [ ] (Optional) Set allowances per kid, and the **ntfy topic** under **⚙️ Settings**

## 6. Post-deploy verification

- [ ] Log out → confirm you're bounced to the **family-password gate** (names hidden)
- [ ] Enter the family password → login screen shows the family
- [ ] As a kid: request a deposit → as the parent: approve it → balance updates
- [ ] Buy a tiny amount of a real stock (e.g. $1 of AAPL) → price loads, position appears
- [ ] Move money to savings → confirm the lot locks
- [ ] On a phone: open the URL → **Add to Home Screen** → confirm the app tile/icon
- [ ] (If ntfy set) trigger a request → confirm the push arrives

## 7. Operational

- [ ] Bookmark / home-screen the URL on every family device
- [ ] Note how to back up: `fly ssh console` then copy `/data/ababank.db` (or `fly volumes` snapshots)
- [ ] Confirm the daily job ran (interest/allowances/prices) — check **📋 Audit** after the first 06:10 UTC pass
- [ ] Decide a monthly cost ceiling — a shared-cpu-1x + 1GB volume is a few $/month

---

## Notes / decisions log

_(jot anything here as you go — chosen region, URL, gotchas)_

- App URL:
- Region:
- Family currency:
