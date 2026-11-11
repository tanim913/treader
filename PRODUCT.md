# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, TypeScript), Supabase (Postgres, Google sign-in, row-level security, Storage), Tiptap for the editor, hosted on Vercel. Chosen with the user on 2026-11-12.

## Users

- **Readers**, mostly on phones, reading long serious fiction a chapter at a time, often in bed or on a commute. Anyone can read without an account. Signing in with Google gives them private notes and bookmarks, reading progress across devices, follows, likes and comments.
- **Writers** who publish books chapter by chapter from a writing dashboard in the app. Anyone can become one. The first is the owner, publishing the novel *Without Papers*.
- **The owner as admin**, moderating reports, hiding content and banning accounts.

## Product Purpose

A place to publish writing chapter by chapter and read it the way a printed book is read: slowly, without noise, with your own notes in the margins. Success means readers finish chapters, come back when new ones arrive, and writers trust that their work won't be lifted.

## Positioning

The owner confirmed all four:
1. **Protected writing.** Chapter text is never in the page source, is shown in a scrambled font, can't be selected natively, and carries a reader watermark. Copying is hard and leaks can be traced. Screenshots can't be prevented, and the product never claims they can.
2. **A calm, book-like read.** No feeds, ads or noise in the reader. Long fiction read slowly on a phone.
3. **Readers' private margins.** Each reader keeps their own notes inside the book, like pencil in a paperback, and finds them again from the book or their profile.
4. **Chapter by chapter.** Books arrive as they are written. An unfinished book ends on "Coming soon", with the date when the next chapter is scheduled, and a finished one ends on "The End".

The owner also asked for creative ideas beyond these. Proposals not yet confirmed are listed under Open decisions.

## Operating Context

- Readers open links on phones, often from messaging apps. One-handed reading, small screens, dark rooms.
- Writers paste chapters from Word, Google Docs or Markdown, often finished elsewhere first (for the owner, BookForge in a separate private repo that this app never touches).
- Chapters can be drafts, published, or scheduled. A book is marked finished by its writer.

## Capabilities and Constraints

- Anyone can publish. Content goes up at once and readers can report it. Moderation happens after publishing.
- Notes and highlights are private to each reader.
- Copy protection is described in Positioning. It is deterrence plus tracing, not a guarantee.
- Free Supabase projects pause after about 7 days without activity.
- "treader" is a working name. Keep the name in one config constant so it can be changed later.

### Open decisions (proposed, not confirmed)
- A writer's own margin notes that readers can choose to reveal (the writer's commentary).
- A private "letter to the writer" from the end of a chapter, alongside or instead of public comments.
- A "first reader" mark for readers who read a chapter on the day it came out.
- An estimated reading time per chapter, and the time left in the book at the reader's own pace.
- An accessible reading mode without scrambling, for screen-reader users.

## Brand Commitments

None yet beyond the working name. The owner described the reading look they want, and that is recorded in DESIGN.md, not here.

## Evidence on Hand

- Real content: *Without Papers* chapters 1 to 7, drafted in BookForge. The owner chooses whether and when to publish them.
- No users, testimonials, press or numbers exist yet. Never invent them.

## Product Principles

1. The text comes first. The interface recedes while someone is reading and returns on a tap.
2. Protect the writer without punishing the reader. Protection must never make reading slower or uglier.
3. Be honest about limits. Never promise that copying or screenshots are impossible.
4. Phones first. Every screen is designed at phone width and then widened.
5. Private by default. A reader's notes, progress and history belong to them.

## Accessibility & Inclusion

- Chapter text is scrambled for protection, so screen readers can't read it. The owner accepted this on 2026-11-12. Everything else (navigation, buttons, profiles, comments, the editor and admin) must be fully accessible: WCAG AA contrast, keyboard use and labelled controls.
- Reader settings cover font size, line spacing, serif or sans, and light, sepia or dark themes.
- Respect reduced motion.
