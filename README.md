# 🔥 Hot Seats — Top Ticket Trends

Ticket business intelligence platform for finding events, calling box offices, and tracking sales.

## Features

- **StubHub API** — Live event data from the world's largest ticket marketplace
- **Google Places** — Verified box office phone numbers with permanent caching
- **Timezone-Aware Calling** — Green/red badges showing if venues are open
- **8 Call Statuses** — NOT CALLED, HIT, NO, FOLLOW UP, SOLD OUT, DIDN'T ANSWER, CALLING, DISS
- **Revenue Tracking** — Track tickets bought and money per HIT
- **Follow-Up Reminders** — Schedule callbacks with quick options
- **Smart Homepage** — Best events to call, due follow-ups, trend alerts
- **Quick Dial Mode** — Speed-run through uncalled events
- **Leaderboard** — Employee rankings by hits and close rate
- **Hot Streak Counter** — Fire badge for consecutive HITs
- **Dead List Filter** — Hide DISS/NO/SOLD OUT events
- **Export Reports** — Download CSV of all call activity
- **Dark/Light Mode** — Toggle theme preference
- **Calendar View** — Pick a date, see all events
- **Top Cities** — Filter by 16 major US/Canadian cities
- **Event Grouping** — Same venue clusters on homepage
- **Notes** — Per-event notes visible to all employees

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/hot-seats.git
cd hot-seats

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your actual keys

# 4. Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `STUBHUB_TOKEN` | Your StubHub API JWT token |
| `GOOGLE_PLACES_KEY` | Google Cloud API key with Places API enabled |

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variables in Vercel dashboard (Settings → Environment Variables)
4. Deploy — done!

## API Routes (Server-Side)

- `GET /api/stubhub?q=search&page=1` — Proxies StubHub event search
- `GET /api/phone-lookup?venue=name&address=addr` — Google Places phone lookup

Keys never touch the browser. All API calls go through serverless functions.

---

**IN DEDICATION TO GET OUT THE TRENCH**
