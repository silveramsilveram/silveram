---
name: Silveram
description: Midnight Silver design tokens and editorial lookbook visual language for Silveram silver gifting and jewellery
colors:
  brand-primary: "#182d49"
  brand-primary-hover: "#243f63"
  brand-primary-active: "#101f34"
  surface-primary: "#f8f7f4"
  surface-secondary: "#eeece7"
  surface-white: "#ffffff"
  text-primary: "#20232b"
  text-secondary: "#4a4f5c"
  text-muted: "#5e6471"
  accent-silver: "#a7adb5"
  border: "#d9dadc"
  border-strong: "#a7adb5"
  danger: "#9b2c2c"
typography:
  display:
    fontFamily: "League Spartan Variable, League Spartan, sans-serif"
    fontSize: "clamp(2.75rem, 7.5vw, 5rem)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  h1:
    fontFamily: "League Spartan Variable, League Spartan, sans-serif"
    fontSize: "clamp(2.25rem, 5.5vw, 3.75rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "League Spartan Variable, League Spartan, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  h3:
    fontFamily: "League Spartan Variable, League Spartan, sans-serif"
    fontSize: "clamp(1.375rem, 2.4vw, 2rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0em"
  body-lg:
    fontFamily: "League Spartan Variable, League Spartan, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  body:
    fontFamily: "League Spartan Variable, League Spartan, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0em"
  caption:
    fontFamily: "League Spartan Variable, League Spartan, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  eyebrow:
    fontFamily: "League Spartan Variable, League Spartan, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.22em"
rounded:
  sm: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.surface-primary}"
    rounded: "{rounded.sm}"
    padding: "14px 28px"
  button-primary-hover:
    backgroundColor: "{colors.brand-primary-hover}"
    textColor: "{colors.surface-primary}"
    rounded: "{rounded.sm}"
  field:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: Midnight Silver

## Overview

Silveram is a small, considered collection of silver gifting and jewellery, sold from a physical shop in Motihari, Bihar and online across India. The interface is an **editorial lookbook**: photography leads, the interface stays quiet, and every page reads like a printed catalogue page for a few pieces rather than a marketplace template.

The palette is **Midnight Navy** (`#182d49`), warm **Ivory** (`#f8f7f4`) and **Sterling Silver** (`#a7adb5`). Sharp 2px corners, flat surfaces and hairline borders give a precise, contemporary look. The audience is young Indian buyers (Gen Z and millennials) shopping mostly on mobile, so the tone is premium and calm, never loud, with confidence coming from space, scale and photography.

Light theme only.

## Colors

The palette is restrained. Contrast comes from ivory, stone and navy bands, not from saturation.

- **Brand and primary interactive**
  - `brand-primary` (`#182d49`): primary actions, key headings, and the two dark moments on the page (the gifting band and the footer).
  - `brand-primary-hover` (`#243f63`), `brand-primary-active` (`#101f34`): hover and pressed states.
- **Surfaces**
  - `surface-primary` (`#f8f7f4`): the page background.
  - `surface-secondary` (`#eeece7`): the mat behind photographs and alternate bands.
  - `surface-white` (`#ffffff`): form fields, order summaries and sheets.
- **Text**
  - `text-primary` (`#20232b`), `text-secondary` (`#4a4f5c`), `text-muted` (`#5e6471`).
- **Lines and accents**
  - `border` (`#d9dadc`): hairlines and dividers.
  - `border-strong` / `accent-silver` (`#a7adb5`): decorative hairlines and silver on navy only. It is about 2.3:1 on white, so it must **not** be the only visible edge of a form control or other interactive component. Fields use `text-muted` for their outline.
- **Feedback**
  - `danger` (`#9b2c2c`): errors and stock problems only.

Contrast rule: body text 4.5:1 or better, large text and UI component boundaries 3:1 or better (WCAG AA). Silver is never used as text on ivory.

## Typography

League Spartan is the only typeface, used at every level.

- `type-display`: `clamp(2.75rem, 7.5vw, 5rem)`, weight 500. The hero headline only.
- `type-h1` to `type-h3`: page and section headings, weight 500.
- `type-body-lg`, `type-body`: weight 400. Keep line length under about 70 characters.
- `type-caption`: `0.8125rem`. Fine print and helper text.
- `type-eyebrow`: kept as a token for footer column titles only. **Do not place an eyebrow label above a heading.**

Casing: **sentence case** for headings, buttons, navigation and labels ("Shop the collection", "Add to bag"). No all-caps button labels. No italics. No weights above semibold.

## Layout

- **Container**: max width `80rem`, side padding `1.25rem` on mobile and `2.5rem` from 768px.
- **Grid**: 12 columns on desktop with deliberately asymmetric spans. Headings are left-aligned; avoid a centred header over every section.
- **Collection**: three staggered editorial bands (a different photo scale and side for each piece), not a repeated three-column card grid.
- **Rhythm**: section padding `4rem` mobile and `6rem` desktop. Vary the scale of photographs between sections.
- **Pages, not drawers**: the bag, delivery details, payment and order confirmation are each their own page. Navigation uses hash routes (`#/cart`, `#/checkout`, `#/checkout/payment`, `#/order/<id>`).

## Elevation and depth

Flat. Depth comes from 1px borders and surface shifts between ivory, stone and navy.

- No gradients, including text gradients and radial "light" effects on the hero or navy sections.
- No glass or blur as decoration, and no floating pill navigation.
- Avoid shadows; where one is needed it must be subtle and offset, never a coloured halo.
- Modal overlays (the image lightbox, sign-in dialogs) use a solid dimmed backdrop.

## Shapes

- Corner radius is `2px` everywhere.
- **No pill buttons and no round badges.** Counts and tags use 2px-radius rectangles.
- *Known deviations to migrate*: round step indicators in checkout, round badges on the bag count and payment options, and the round floating WhatsApp button still use fully rounded shapes.

## Photography

Photography is the product. Use only the store's real photographs, never generated or stock jewellery images.

- Show each photograph at or below its native resolution. Current sources are about 508 px wide (Silver Frame) and 922 by 768 px (Silver Kada, Peacock Ring). Do not upscale; display widths should stay at or below about 480 px for the frame and about 700 px for the others.
- Serve images through Cloudinary with `f_auto,q_auto,c_limit` and responsive `srcset` widths so phones do not download desktop sizes.
- Choose an explicit crop and focus point per photograph rather than a single global aspect ratio.
- Higher-resolution originals would most improve the hero, the product-page zoom and the frame photographs.

## Components

- **Buttons**: primary is navy with ivory text and 2px corners, in sentence case, semibold. Secondary is an outlined navy button. One primary action per view. Hover darkens to `brand-primary-hover`; every button has visible focus, pressed and disabled states.
- **Product card (shop and related items)**: a photograph on a stone mat with no nested borders, a fixed crop, the product name, the price, and one text link. "Add to bag" is secondary.
- **Bag page**: item list with quantity steppers, a summary with a primary "Proceed to checkout" button, and a sticky total and checkout bar on mobile.
- **Checkout**: step indicator (bag, details, payment, confirmation), one inline error per field with the first invalid field focused, a collapsible order summary on mobile, and a payment step.
- **Payment options**: cash on delivery is the available method and is selected by default. UPI and debit/credit card are shown as "Coming soon" and cannot be selected until a gateway is approved and enabled.
- **Form fields (`.field`)**: white background, 1px `text-muted` outline, 2px navy focus ring.
- **Order confirmation**: reference number, status, items, delivery address, payment method and a "what happens next" timeline.
- **WhatsApp**: a customer-support channel for questions about a piece, gifting or an order. It is **not** an ordering channel and never appears as a checkout action.

## Motion

Use motion sparingly and only where it communicates something. Respect `prefers-reduced-motion` (show final states with no movement).

- **Hero entrance**: one authored reveal of the hero photograph. Content must be visible without waiting for the animation.
- **Tagline reveal**: one large statement whose words darken one at a time as they scroll into view.
- **Feedback**: hover, press, "added to bag" and gallery transitions. Animate `transform` and `opacity`; list transition properties explicitly (never `transition: all`).
- Do not add a fade-up entrance to every section.

## Content rules

- Use **only verified facts**. Metal, purity, hallmarking, weight and dimensions are shown on a product only once the store has confirmed them. Do not state "925", "sterling" or similar unless it is verified for that product.
- Do not invent testimonials, statistics, guarantees, delivery times or policies. Policy text is draft until the store approves it.
- Say "bag" consistently (add to bag, your bag).
- Errors say what went wrong and how to fix it. Calm tone, no exclamation marks.

## Do's and don'ts

### Do
- Let the photograph be the largest thing on the page, and vary its scale.
- Keep League Spartan, the 2px radius and the palette exactly as defined.
- Make the next step obvious on every page, especially in the bag and checkout.
- Keep everything usable by keyboard with a visible focus indicator.

### Don't
- No gradients, glassmorphism, floating pill navigation, decorative floating elements or heavy shadows.
- No repeated three-card grids, icon-card feature blocks or identical entrance animations.
- No uppercase button labels, eyebrow labels above headings, or italics.
- No unverified product, purity or commercial claims.
- Do not force account creation before checkout; guest checkout stays available.
