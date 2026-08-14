# Bidder Work Portal

Frontend Next.js portal for managing job bidders, daily work logs, manual
payment methods, payout schedules, payment history, and admin group chat.

## Prerequisites

- Node.js `>=22.13.0`
- The backend API from `Bestnow2023/bidder-portal-be`
- A Vercel account/project

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Set the API base URL in `.env.local` before signing in:

```text
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
NEXT_PUBLIC_PORTAL_MODE="dev"
```

The backend initializes MongoDB indexes automatically on first API use. In
`dev` mode it also seeds three demo accounts:

- `admin@portal.local`
- `maya.bidder@example.com`
- `pending.bidder@example.com`

## Vercel Setup

1. Create a new Vercel project from this repository.
2. Set the project root directory to `bidder-portal` if deploying from the
   larger `Playground` folder.
3. Use the Next.js framework preset.
4. Add `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_PORTAL_MODE` in Vercel
   Project Settings -> Environment Variables for Production, Preview, and
   Development. Use the deployed backend URL:
   `https://bidder-portal-be.vercel.app`.
5. Set `NEXT_PUBLIC_PORTAL_MODE` to `live` for production and `dev` for local
   testing.
6. Deploy.

The included `vercel.json` pins the expected settings:

- Framework: `nextjs`
- Install command: `npm ci`
- Build command: `next build`
- Development command: `next dev`

## Database

- MongoDB runs only in the backend API repo.
- This frontend calls `${NEXT_PUBLIC_API_BASE_URL}/api/portal`.
- Keep database credentials out of this frontend project.

## Modes

- `NEXT_PUBLIC_PORTAL_MODE=dev`: shows demo quick-login accounts.
- `NEXT_PUBLIC_PORTAL_MODE=live`: hides demo accounts and shows the signup flow.

## Commands

- `npm run dev`: start local development
- `npm run build`: run a Vercel-compatible Next.js build
- `npm run lint`: run lint
- `npm test`: build and run smoke tests

## Deploy Notes

Do not commit `.env.local`. Use Vercel environment variables for hosted
deployments.
