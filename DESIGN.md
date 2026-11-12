---
name: Silveram
description: Midnight Editorial design system for Silveram silver jewellery and gifting. Light-first editorial scenes anchored on midnight navy, set in Instrument Serif, Courier Prime and League Spartan.
colors:
  brand-primary: "#182d49"
  brand-primary-hover: "#243f63"
  brand-primary-active: "#101f34"
  steel-navy: "#385575"
  surface-primary: "#f8f7f4"
  surface-secondary: "#eeece7"
  surface-white: "#ffffff"
  ice: "#dce6f0"
  champagne: "#d9c5a3"
  text-primary: "#20232b"
  text-secondary: "#4a4f5c"
  text-muted: "#5e6471"
  accent-silver: "#a7adb5"
  border: "#d9dadc"
  danger: "#9b2c2c"
typography:
  display:
    fontFamily: "Instrument Serif, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontWeight: 400
  mono:
    fontFamily: "Courier Prime, Courier New, Courier, monospace"
    fontWeight: 400
  sans:
    fontFamily: "League Spartan Variable, League Spartan, sans-serif"
    fontWeight: 400
rounded:
  field: "8px"
  media: "20px"
  pill: "9999px"
  legacy: "2px"
---

# Design System: Midnight Editorial

This replaces "Midnight Silver" (archived at `docs/archive/DESIGN.midnight-silver-v1.md`). Where this file conflicts with the generic recommendations in `.claude/skills/*` or `.agent/skills/*` (no pills, no italics, one typeface, no gradients, 2px radius), **this file wins**. Accessibility, truthful content, performance and the backend freeze are not negotiable. Upstream skill files are not edited.

## Overview

Silveram sells a small collection of silver gifting and jewellery from a physical shop in Motihari, Bihar, and online across India. The storefront is an **editorial jewellery shop**: large serif statements, real photographs at their true size, whole bands of colour that change the mood from one scene to the next, and small typewriter details that feel like a shop label. It is inspired by the structure and craft of Graza's storefront (alternating scenes, pill actions with a layered underside, dashed rules, oval stamps, a marquee, an oversized wordmark) and adapted to jewellery. No Graza brand asset, wording, colour, illustration or photograph is used.

Midnight navy `#182d49` is the anchor and never changes. Light theme only. The mood comes from alternating scenes, scale and photography, not from saturation.

## Colour

Colour belongs to whole **scenes** (full-width bands), not to individual cards or icons. Measured contrast (WCAG 2.x, computed from the hex values):

| Role | Pair | Ratio | Use |
| --- | --- | --- | --- |
| Canvas | navy on ivory | 13.0:1 | default page |
| Mat | navy on stone | 11.8:1 | alternate band, photo mat |
| Deep | ivory on navy | 13.0:1 | hero, gifting, footer |
| Deep | ivory on deep midnight | 15.5:1 | pressed states |
| Ice | navy on ice | 11.0:1 | promotional scene |
| Champagne | navy on champagne | 8.3:1 | small gifting accent only |
| Steel | ivory on steel navy | 7.2:1 | supporting tint |
| Secondary text | text-secondary on ivory / ice / stone | 7.8 / 6.5 / 6.9:1 | body copy |
| Muted text | text-muted on ivory / ice | 5.5 / 4.7:1 | fine print, field outlines |
| Silver | silver on navy | 6.2:1 | text-safe on navy only |
| Silver | silver on ivory / white | 2.1 / 2.3:1 | **decorative only**, never text, never the only edge of a control |

- **Scenes** are classes: `scene-canvas`, `scene-mat`, `scene-deep`, `scene-ice`, `scene-champagne`. Each sets `--scene-bg`, `--scene-fg`, `--scene-body` and `--scene-line`; use `scene` plus one of them on a section.
- Use at most one promotional (ice or champagne) scene per screen of content, and keep champagne small.
- No olive, citrus, peach or other colours borrowed from another brand.
- Errors use `danger` only.

## Typography

Three families, each with one job. All self-hosted through the bundle (`@fontsource`, Latin subsets, `font-display: swap`) under the **SIL Open Font License 1.1** (licence files verified in `node_modules/@fontsource/instrument-serif/LICENSE` and `.../courier-prime/LICENSE`). Fallback stacks are defined in `tokens.css`; League Spartan keeps its original stack.

- **Instrument Serif** (`font-display`, `.ed-*`): display headlines, editorial statements, product names, storytelling. Weight 400 only. Never for body copy or UI text.
  - `.ed-statement` up to 120px, `.ed-display` up to about 102px, `.ed-h1` up to 72px, `.ed-h2` up to 52px, `.ed-h3` up to 46px, `.ed-product` up to 32px. All fluid via `clamp()`.
  - **Italic is selective:** `.ed-italic` on one phrase in a statement at most, to carry emphasis. Not on every heading.
- **Courier Prime** (`font-mono`, `.label-mono`, `.label-mono-sm`): small labels, metadata, captions, stamps, ticker text. 14px (13px minimum). Sentence case as written; not for paragraphs of reading copy.
- **League Spartan** (`font-sans`): navigation, buttons, prices, forms and every paragraph a customer has to read. Prices use tabular figures.

Keep reading measure under about 70 characters. Use `text-wrap: balance` on headings (built into `.ed-*`).

## Shape and layout

- Containers: `page-container` (legacy, 80rem), `page-container-wide` (1440px, 30px gutter from 768px), `page-container-editorial` (1104px for storytelling columns).
- Radius tokens: media `20px` (`.media-frame`, `radius="media"`), fields `8px`, actions `pill`. The old 2px radius remains only on commerce pages not yet migrated.
- **Dashed rules** (`.rule-dashed`, `.frame-dashed`) divide scenes and frame forms; **oval stamps** (`.stamp`, `<Stamp>`) label categories and status.
- Layouts are asymmetric and vary in density from scene to scene; avoid a centred header over every section and repeated identical card grids. Purchase and checkout screens stay plain and quick to scan.

## Components

- **Button** (`src/shared/ui/Button.tsx`, `.btn-pill`): pill with a fine outline and a checkered underside. Variants `primary`, `secondary`, `inverse`, `outline-inverse`, `text`; sizes `sm`, `md`, `lg`. Hover compresses the underside, press flattens it, `disabled` and `aria-busy` are styled, focus uses the global ring. One primary action per view.
- **Media** (`src/shared/ui/Media.tsx`): one component for photographs and films. Images render at native size with an explicit focal point. Films are silent and muted, play only while visible, and never when the visitor prefers reduced motion, has paused decorative motion or has data-saver on; a visible control plays or pauses. A missing film shows its first-frame still or the neutral placeholder.
- **Marquee** (`Marquee.tsx`): 20-second linear ticker of short, factual phrases. A pause control switches off all decorative motion site-wide (`useDecorativeMotionPaused`); under reduced motion the strip is static.
- **CarouselControls**, **Stamp**, **WordSculpture** (container-query sized so the brand word spans the width from 360 to 1440px, decorative and `aria-hidden`).
- **Form fields** (`.field`): white, 1px `text-muted` outline, 8px radius, navy focus ring.
- **WhatsApp** is a support channel for questions. It is never an ordering action.

## Motion

CSS first. GSAP stays lazy and is used only for authored hero and word-sculpture moments.

| Use | Duration | Easing |
| --- | --- | --- |
| Colour, border, fill | 250ms | ease-in-out |
| Header transform/opacity | 400ms | ease-in-out |
| Image hover scale (1.02 to 1.04) | 600ms | `--ease-out` |
| Marquee loop | 20s | linear |
| Decorative spin / blink | 3s / 2s | linear / ease-in-out |

Animate `transform` and `opacity`; never `transition: all`; never cause layout shift. Every decorative loop honours `prefers-reduced-motion` (removed, not frozen) and the global pause. Content must be visible without JavaScript. Every interactive element has default, hover (where relevant), focus-visible, pressed, disabled, loading, and success or error states.

## Media and Cloudinary

Photography is the product: real Silveram photographs only, never generated or stock jewellery images, always at or below native resolution (currently about 508px for the Silver Frame and about 920 x 768px for the Kada and Ring). **Cloudinary is the only binary store** for images and films; Appwrite keeps product records and media references. Delivery uses `f_auto,q_auto,c_limit` with responsive `srcset`. `src/shared/lib/cloudinary.ts` builds product images, site images (`site/<hero|categories|editorial|avatars>`) and product films (`/video/upload/`, with a first-frame poster) using the existing folder convention. No Cloudinary secret or API key ever reaches the frontend.

## Content rules

- Use **only verified facts**. Material, silver purity, hallmarking, weight, dimensions, craftsmanship, origin, care, delivery, returns, reviews and guarantees appear only when the store has confirmed them. No invented testimonials, ratings, statistics, makers, provenance or scarcity.
- Write original Silveram copy: warm, conversational, concise, specific. Styling, presentation and gifting inspiration is welcome when it is opinion or suggestion, not a factual claim about the product.
- Say "bag" consistently. Errors say what went wrong and how to fix it, calmly.

## Do and don't

**Do:** let one thing be memorable per scene; vary scale; keep keyboard focus visible; keep guest checkout; keep the next step obvious in the bag and checkout.

**Don't:** copy Graza's name, wordmark, illustrations, wording, colours or photography; upscale photographs; add a fade-up to every section; autoplay sound; hide content until an animation runs; change anything under `server/`, `api/`, `vercel.json` or any environment file for a visual reason.

## Dev preview

`design-system.html` (run `npm run dev`, open `/design-system.html`) renders every token and component above. It is not part of the production build and not a storefront route.
