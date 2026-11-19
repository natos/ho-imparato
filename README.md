# Ho imparato

*"I have learned"*: a small web game for practising Italian with a study partner. You get levels along a train route, stars, sound, motion and a head-to-head scoreboard.

The first topic is **passato prossimo**. Topics are designed as pluggable packs (numbers, verbs and so on can follow).

- **Stack:** Next.js 16 (App Router) · Neon Postgres + Drizzle · passkeys (WebAuthn via SimpleWebAuthn) · Vercel Blob · Motion
- **Status:** sign-in, profiles and the route map are built. Game levels are in progress.

## Run locally

```bash
npm install
npm run dev
```

You don't need any setup:
- Without `DATABASE_URL`, the app uses an embedded Postgres (PGlite) in `./.pglite` and migrates it automatically.
- Signup is open without `INVITE_CODE`.
- Without a Blob token, profile pictures are stored inline.

Passkeys work on `http://localhost:3000`.

### Test the sign-in flow

With the dev server running:

```bash
npm run test:auth
```

The test signs up, signs in, signs out and recovers an account using a software passkey, so it needs no browser or Touch ID. It creates throwaway `Tester…` players in your local database.

## Deploy to Vercel

1. Link the project: `vercel link`
2. In the Vercel dashboard → Storage, connect **Neon** (this adds `DATABASE_URL`) and **Blob** (this adds `BLOB_READ_WRITE_TOKEN`).
3. Project → Settings → Environment Variables (Production). See [`.env.example`](.env.example):
   - `SESSION_SECRET`: output of `openssl rand -base64 32`
   - `INVITE_CODE`: a phrase you share with players
   - `RP_ID` / `RP_ORIGIN`: your production domain, e.g. `example.vercel.app` / `https://example.vercel.app`
4. Create the tables: `vercel env pull .env.local && npm run db:migrate`
5. Deploy: `vercel --prod`

> Passkeys are bound to one domain, so they work on the production domain only, not on preview URLs.

## Structure

```
src/db/          Drizzle schema: users, credentials, progress, review_items, plays
src/lib/         session (signed cookie), WebAuthn helpers, scoreboard, sound effects
src/app/api/     auth (register, login, passkey, recover, recovery-code, logout), avatar
src/components/  Welcome, Home (route + duel), Profile, AvatarPicker, RecoveryCode
drizzle/         SQL migrations (after schema changes: npm run db:generate)
scripts/         e2e-auth.mjs (software-passkey test of the sign-in flow)
```

## Security

See [SECURITY.md](SECURITY.md). Secrets live only in environment variables, and nothing secret is committed.

## Content

The game's exercises are written for this project. Course material used as a reference stays private and isn't part of this repository.
