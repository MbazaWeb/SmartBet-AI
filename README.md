# SmartBet AI

SmartBet AI is a Vite + React frontend with an Express backend that aggregates football fixtures, model predictions, bookmaker context, and Supabase-backed social interactions.

## Development

- `npm run dev` starts the Vite frontend and the local Express backend together.
- `npm run server` starts only the local backend on `PORT` or `8787`.
- `npm run build` creates the production frontend bundle in `dist`.

## Deployment

- Local backend entrypoint: `server/index.js`
- Shared Express app: `server/app.js`
- Vercel serverless API entrypoint: `api/[...route].js`

### Required Vercel environment variables

- `API_FOOTBALL_KEY`
- `VITE_FOOTBALL_DATA_API_KEY`
- `THE_SPORTS_DB_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Without these values in the Vercel project settings, production API routes can deploy but still fail at runtime.
