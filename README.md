# 🏛️ AbaBank

**The family bank: parents are the bank, kids are the customers.**

AbaBank is a self-hosted ledger of parental IOUs. No real bank accounts, no brokerage — when your kid hands you $20 of birthday cash, they record a deposit, you approve it, and the app remembers that the bank (you) owes them $20. Kids learn saving, compound interest, and investing with real market prices, all at kitchen-table scale.

## Features

- **Deposits & withdrawals with stories** — every deposit needs a source ("birthday money from Grandma"), every withdrawal needs a reason ("LEGO set"). Kids request, parents approve; approval is the moment real cash changes hands, so the ledger never drifts from reality.
- **Savings that teach** — each transfer into savings is a locked lot (default 30 days). Motivational interest (default 5% **per month**) is credited on the 1st as a visible "interest payday" and compounds automatically. Break a lot early and that money simply misses the next payday.
- **Real investing, fractional shares** — buy "$10 of AAPL" at real Yahoo Finance prices (delayed/EOD-style, refreshed daily). Average-cost basis, profit/loss shown on every sale. No taxes, no fees — it's a family, not the IRS.
- **Allowances on autopilot** — weekly or monthly auto-deposits per kid, with catch-up if the server was asleep.
- **Goals** — "Nintendo Switch game, $60" with a progress bar.
- **Parent console** — approval queue, per-kid interest/lock/allowance settings, signed corrections, and a full audit log. The bank hides nothing.
- **Notifications** — optional push via [ntfy.sh](https://ntfy.sh) when a kid requests money.
- **Multi-currency** — run the ledger in USD, ILS, EUR…; USD stock prices convert automatically (rates from frankfurter.dev).

## Quick start (development)

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the first visit walks you through creating the parent account and picking the family currency. Add kids from **Kids → Add a family member**. Everyone logs in with a name + PIN.

Data lives in a single SQLite file under `.data/` (override with `DATA_DIR`).

## Deploy

One Docker container, one volume. Works anywhere; Fly.io example:

```bash
fly launch --copy-config --no-deploy   # uses the included fly.toml
fly volumes create ababank_data --size 1
fly deploy
```

Or plain Docker:

```bash
docker build -t ababank .
docker run -d -p 3000:3000 -v ababank-data:/data ababank
```

Keep the machine always-on (`min_machines_running = 1`): the daily 06:10 cron pays allowances, credits monthly interest, and refreshes prices. Missed days are caught up on boot, compounding included.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATA_DIR` | `./.data` | Where the SQLite DB and session secret live (mount a volume here) |
| `SESSION_SECRET` | auto-generated | HMAC secret for login cookies |
| `PORT` | `3000` | HTTP port |

## Tests

```bash
npm test
```

Covers the ledger math: approval flow, overdraft protection, savings lots, early-withdrawal rules, interest compounding across missed months, and average-cost buy/sell accounting.

## Stack

Next.js 16 (App Router, server actions) · TypeScript · SQLite via Drizzle ORM + better-sqlite3 · Tailwind CSS 4 · node-cron · Yahoo Finance (quotes) · frankfurter.dev (FX) · ntfy.sh (push).

---

*Built with [Claude Code](https://claude.com/claude-code).*
