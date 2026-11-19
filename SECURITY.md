# Security

This is a small personal project, but if you find a vulnerability, please report it privately rather than opening a public issue:

**GitHub → Security → Report a vulnerability** (private advisory).

## What's in place

- Passkey (WebAuthn) sign-in; no passwords are stored.
- Recovery codes are stored only as SHA-256 hashes, compared in constant time, and are single-use.
- Sessions are signed (HS256), `httpOnly`, `secure` and `SameSite=Lax` cookies.
- Sign-up requires an invite code in production.
- All secrets live in environment variables; none are committed (see `.env.example`).
- Security headers: no framing, `nosniff`, strict referrer policy, restricted browser permissions.
