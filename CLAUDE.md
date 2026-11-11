@AGENTS.md

# treader

A reading web app: writers publish books chapter by chapter, readers read and keep private notes. Product truth is in PRODUCT.md, the design direction in .impeccable/surfaces/src-app.md, and the build plan in the owner's plan (milestones: setup, scaffold, auth and schema, writing, reader, notes, social and moderation, hardening and deploy).

## Rules
- Never add `Co-Authored-By: Claude`, any other Claude or Anthropic attribution, or "Generated with Claude Code" to a commit or pull request. The owner is the only author.
- Use the repo-local git identity (tanim913). Never force-push. The repo stays private.
- Never commit secrets: `.env*` is ignored. The Supabase service key lives only in `.env.local` and Vercel.
- This app never reads from or writes to the bookforge repo.
- Never claim copying or screenshots are impossible; protection is deterrence plus tracing.
- Read `node_modules/next/dist/docs/` before using a Next.js API: this is Next 16 (proxy.ts, not middleware; cacheComponents is on).
