---
name: treader
description: Books published chapter by chapter, read like books.
colors:
  paper: "#f3efe6"
  paper-deep: "#ebe5d8"
  ink: "#23211d"
  ink-soft: "#5f5a51"
  pencil: "#6f6a61"
  rule: "#d6cfc0"
  gilt: "#c9a24a"
  focus: "#26305a"
  danger: "#8f2a1e"
  select: "rgba(201, 162, 74, 0.32)"
  cloth-oxblood: "#6B1E26"
  cloth-bottle: "#1E4636"
  cloth-indigo: "#26305A"
  cloth-ochre: "#A8741E"
  cloth-slate: "#3D4A55"
  cloth-rust: "#8F3B1E"
  cloth-plum: "#4E2A47"
  cloth-teal: "#1F5257"
typography:
  display:
    fontFamily: "Literata, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(32px, 8vw, 48px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Literata, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(28px, 7vw, 44px)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.015em"
  chapter-title:
    fontFamily: "Literata, Iowan Old Style, Georgia, serif"
    fontSize: "1.65em"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Literata, Iowan Old Style, Georgia, serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.25
  body-read:
    fontFamily: "Literata, Iowan Old Style, Georgia, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.62
  stamp:
    fontFamily: "Literata, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(13px, 3.6vw, 17px)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.09em"
  body-ui:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
  meta:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.35
    fontFeature: "tnum"
rounded:
  board: "2px 5px 5px 2px"
  stamp: "3px"
  field: "10px"
  slip: "12px"
  sheet: "16px 16px 0 0"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
  s8: "72px"
  gutter: "16px"
  read-measure: "34em"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.ink}"
  link-report:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    height: "44px"
  input-field:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.ink}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "8px 24px 24px"
    width: "480px"
  board:
    backgroundColor: "{colors.cloth-oxblood}"
    textColor: "{colors.gilt}"
    typography: "{typography.stamp}"
    rounded: "{rounded.board}"
    padding: "14% 12% 14% 17%"
  headband:
    backgroundColor: "{colors.cloth-oxblood}"
    height: "6px"
  ribbon:
    backgroundColor: "{colors.cloth-oxblood}"
    width: "11px"
    height: "88px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "44px"
---

# Design System: treader

## Overview

**Creative North Star: "Bookcloth and Stamp"**

Every book is a clothbound volume in its own flat colour, and reading happens on its plain paper pages. The library is a shelf of boards: 2:3 cloth rectangles with a groove at the joint, the title stamped in Literata capitals, gilt or blind. Open one and the colour retreats to the edges of the text block: a 6px headband, a silk ribbon at the saved place, a small swatch on the resume slip. The page itself is warm paper and dark ink, nothing else.

The system has two modes in one world. **Read** (the chapter reader and the book page) is still: controls hide until a tap, the ribbon fades while they are shown, the text sits at 18px on a 65-character measure. **Operate** (home, profiles, /me, /write, /admin) uses the same paper, ink and hairline rules, set mostly in the system sans, with ink pills for the one primary action. State is shown as a mark (a graphite pencil tick, an ink outline, an underline), not as a new hue.

The world is phone first: 16px gutters widening to 32px at 768px, 44px touch targets everywhere, bottom sheets, safe-area insets and dynamic viewport units. It refuses the feed of thumbnail cards on white and the blanket cream-and-serif page.

**Key Characteristics:**
- Colour only at the edges: boards, headband, ribbon, resume-slip swatch.
- An achromatic reading column of paper and ink.
- Literata for text and headings; the system sans for every control.
- Flat surfaces with hairline rules; the board's edge is the only shadow.
- Numerals hold one margin column; read chapters carry a pencil tick.
- Light, sepia and dark themes swap paper and ink, never the cloth.

## Colors

A restrained paper-and-ink ground with eight flat bookcloths and one gilt, used only where a real book carries colour.

### Primary
- **Bookcloth set** (oxblood, bottle green, indigo, ochre, slate, rust, plum, teal): one per book, chosen by the writer. Used as the board fill, the 6px headband above the chapter, the 11×88px ribbon, the resume slip's ribbon swatch, the narrow band beside chapter rows on profiles, and mini boards in lists. Never as text colour in the reading column. Ochre takes a blind stamp; all others take gilt.

### Secondary
- **Stamping Gilt** (gilt): the title stamp on the cloth boards, the text-selection tint (select, gilt at 32%), and the focus ring in dark themes.

### Neutral
- **Warm Paper** (paper): every page ground, sheet, bar and slip.
- **Endpaper** (paper-deep): the ground behind boards, hover fills, fields and the selection popup.
- **Printer's Ink** (ink): body text, headings, primary pill fills, the strong rule above lists.
- **Soft Ink** (ink-soft): secondary text, meta lines, report links (5.6:1 on paper).
- **Graphite** (pencil): marks the reader leaves or receives: the read tick and the chapter numeral in the reader.
- **Hairline** (rule): every divider, outline-pill border for quiet actions, field strokes, sheet grip.
- **Indigo Focus** (focus): the 2px focus outline in light and sepia.
- **Oxblood Warning** (danger): errors, destructive actions, moderation flags.

Sepia and dark themes redefine paper, paper-deep, ink, ink-soft, pencil, rule and select (dark also focus, danger and the board shadow); values live in `src/app/globals.css` and the sidecar. Cloth colours are the same in every theme.

### Named Rules
**The Edges Rule.** Colour lives on the boards, the headband, the ribbon and the resume-slip swatch. The reading column is paper and ink only.

**The Mark Not Hue Rule.** State is shown with a mark (pencil tick, ink outline, inset ink ring, underline, ink underline on the current tab), not with a new colour.

## Typography

**Display Font:** Literata (variable, optical sizing; with Iowan Old Style, Georgia, serif)
**Body Font:** Literata for reading; the system sans (system-ui stack) for interface
**Label/Mono Font:** the system sans; tabular numerals wherever numbers align

**Character:** A book face for anything you would find printed in a book (titles, chapter text, author names, bios, contents rows); the device's own sans for anything you would tap.

### Hierarchy
- **Display** (500, clamp 32–48px, 1.08): the book title on the book page.
- **Headline** (500, clamp 28–44px, 1.12): page titles on home, profiles, /write and /admin.
- **Chapter title** (500, 1.65em of the reading size, 1.15): the chapter head in the reader.
- **Title** (500, 22px): section headings such as Contents and profile sections; sheet titles at 19px.
- **Body-read** (400, 18px, 19px from 768px, leading 1.62, measure 34em ≈ 65 characters): chapter text, first-line indents of 1.3em, no indent after a section break. The reader can change size, leading (1.45 / 1.62 / 1.8) and switch to the sans.
- **Stamp** (600, clamp 13–17px, letterspaced 0.09em, uppercase): book titles on boards only; the author line beneath is 10–12px at 0.14em.
- **Body-ui** (400, 16px, 1.5): interface text and fields (16px keeps iOS from zooming).
- **Label** (500, 15px): buttons, nav links, bar titles.
- **Meta** (400, 13px, tabular): counts, dates, reading time.

### Named Rules
**The Two Faces Rule.** Literata sets text and headings; the system sans sets controls. A control never borrows the book face, and the chapter text never takes the sans unless the reader chooses it.

**The Flat Stamp Rule.** Board titles are Literata caps, letterspaced, gilt or blind, with no text-shadow or emboss effect.

## Layout

Phone first. The page gutter is 16px and becomes 32px from 768px; side padding always takes `max(gutter, safe-area inset)`. Spacing steps on a 4–72px scale (s1–s8); section gaps use 48px, page-foot padding 72px.

- **Reading column:** 34em plus gutters, centred. Top padding clears the 56px controls bar.
- **Margin column for numerals:** Contents rows use a 2.4em right-aligned numeral column; the reader head puts the pencil numeral in a 1.5em column beside the title on phones and hangs it outside the column from 900px.
- **Shelf:** two boards across on phones, three from 560px, four from 1024px.
- **Containers:** 1120px for home and profiles, 920px for the book page, 820px for /write and /admin, 680px for lists.
- **Bars and sheets:** fixed top and bottom bars at 56px in the reader; dialogs are bottom sheets on phones (max 480px wide, 82dvh tall) and centred from 768px.
- Heights use `dvh`; bars, sheets and slips pad with safe-area insets.

## Elevation & Depth

The world is flat. Depth comes from paper tone (paper over paper-deep) and hairline rules, never from shadows, with one exception: the cloth board, which is an object on a shelf.

### Shadow Vocabulary
- **Board edge** (`box-shadow: 0 1px 1px rgba(35,33,29,0.18), 0 6px 14px -6px rgba(35,33,29,0.35)`; deeper in dark): full boards, mini boards in lists, EPUB import cover. On hover-capable devices the board lifts 3px with an extra soft fall.
- **Sheet scrim** (`rgba(20,18,15,0.35)` backdrop): behind modal sheets only; the sheet itself is flat.

### Named Rules
**The One Shadow Rule.** Only boards cast a shadow. Sheets, slips, popups and bars are flat paper with a hairline rule.

## Shapes

Soft but bookish. Boards are rectangles with a 2px spine side and 5px fore-edge corners and a darker groove at 7% for the joint. Actions are full pills (999px). Fields round at 8–10px, the selection popup and empty-state boxes at 12px, sheets at 16px across the top (14px all round when centred). The ribbon is an 11×88px strip with a notched end cut by a clip-path. The Coming soon stamp is a 2px-bordered box at 3px, turned −2°. Avatars are circles with a 1px rule ring.

## Components

### Buttons
Calm pills, ink on paper.
- **Shape:** full pill (999px), at least 44px tall (48px on the book page).
- **Primary:** ink fill, paper text, 15px weight 500; hover brightens the ink. One per view.
- **Secondary:** transparent with a 1px ink outline; hover fills with endpaper. Quiet variant uses a hairline outline.
- **Pressed toggles:** ink outline or inset ink ring, not a colour change.
- **Report / tertiary:** quiet underlined text in soft ink with a hairline underline, 44px tall.
- **Destructive:** danger-coloured text, underlined on hover, no fill.
- **Focus:** 2px focus outline, 3px offset, everywhere.

### Cards / Containers
- **Board:** the book card. Cloth fill, 2:3 aspect, board shadow, stamped title between two rules, title and author name below in Literata, meta in 13px sans.
- **Slips and popups:** paper or endpaper, 1px rule or soft-ink border, no shadow.
- **Lists:** a 1px ink rule on top, hairline rules between rows.

### Inputs / Fields
- **Style:** endpaper or paper fill, 1px hairline, 8–10px radius, 16px sans.
- **Focus:** 2px focus outline, 1px offset.
- **Switch:** 52×32 pill, hairline off, ink on, paper knob.

### Navigation
- **Site header:** sticky, paper, hairline beneath, 56px; the name in Literata 21px; nav links are 44px pills that fill with endpaper on hover; the primary link takes an ink outline. Icon-only labels collapse below 560px.
- **Tabs:** sans, soft ink, current tab in ink with a 2px ink underline; scroll sideways on phones.
- **Reader bars:** hidden while reading, slide in on a tap; top bar for title and tools, bottom bar for previous and next chapter and position.

### Signature components
- **Headband:** 6px of cloth (plus the top safe-area) across the head of every chapter.
- **Silk ribbon:** 11×88px, flat cloth, notched, hanging from the headband at the right, only on the chapter holding the reader's saved place; fades out while the controls are shown.
- **Resume slip:** a flat pill slip at the foot of the screen with an 8×18px ribbon swatch, a 44px dismiss, and a short rise in.
- **Pencil tick:** a hand-drawn 16×12 SVG stroke in graphite beside read chapters in Contents, with a screen-reader label.
- **Chapter end:** "The End" in Literata italic between two short rules; an unfinished book ends on the Coming soon stamp with the next date.
- **Settings sheet:** a bottom sheet with a grip, segmented 44px options (inset ink ring when chosen), theme swatches, and size steps.
- **Protected text layer:** chapter text is drawn in per-response cipher fonts, not natively selectable, under a faint repeating diagonal watermark; a custom layer draws the selection highlight and line-height handles with 44px invisible touch targets.

## Do's and Don'ts

### Do:
- **Do** keep every colour to the edges: board, 6px headband, 11×88px ribbon, resume-slip swatch.
- **Do** set chapter text at 18px (19px from 768px), leading 1.62, on a 34em measure.
- **Do** put numerals in one right-aligned margin column, tabular.
- **Do** show state with a mark: pencil tick, ink outline, inset ink ring, underline.
- **Do** make every target at least 44px and pad bars and sheets with safe-area insets.
- **Do** use ink pills for the primary action, hairline or ink outline pills for secondary actions, and underlined soft-ink text for report links.
- **Do** keep Literata for text and headings and the system sans for controls.

### Don't:
- **Don't** put a shadow on anything but a board; sheets, slips and popups are flat with hairline rules.
- **Don't** colour text in the reading column or use a hue to show state.
- **Don't** add text-shadow, emboss or gradients to the stamped board titles or to the cloth.
- **Don't** lay out books as thumbnail cards on white or a feed; books are boards on a shelf.
- **Don't** show the reader controls or the ribbon while someone is reading; they return on a tap.
- **Don't** hard-code the app name; it lives in `src/lib/brand.ts`.
