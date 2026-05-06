# Options Pricing Lab — Web

Interactive UI for the [options-pricing-api](../options-pricing-api):

- **Black-Scholes** pricing + full Greeks + a strike-strip Δ/Γ/V chart
- **Heston** stochastic-vol pricing with Feller-condition diagnostic
- **Implied Vol** Brent solver
- **Vol Surface** — paste market quotes, get the smile per tenor and butterfly/calendar arbitrage diagnostics

## Setup
```bash
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

## Deploy
Push to GitHub and import into Vercel. Set `NEXT_PUBLIC_API_URL` to your Render URL.
