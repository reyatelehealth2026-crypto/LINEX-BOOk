# LINEX Design System

Reference direction: Linear, Stripe, Raycast, Apple-style material cards

## Brand idea
LINEX should feel like a premium SaaS booking platform, calm and polished, not like a generic LINE template.

## Core visual principles
- Calm luxury, not loud
- Product-first, not mascot-first
- Rounded modern surfaces
- Soft depth, not heavy skeuomorphism
- Spacious layout, clear hierarchy
- Plum-led palette instead of LINE green

## Palette
### Primary
- `linex-950`: `#171220`
- `linex-900`: `#221733`
- `linex-800`: `#34204d`
- `linex-700`: `#4d2b73`
- `linex-600`: `#6d3bff`
- `linex-500`: `#8f63ff`
- `linex-400`: `#b89cff`
- `linex-300`: `#d4c2ff`
- `linex-200`: `#eee6ff`
- `linex-100`: `#f7f2ff`
- `linex-50`: `#fcfaff`

### Accent
- `peach-500`: `#ff9b7a`
- `peach-400`: `#ffb59c`
- `peach-200`: `#ffe3d8`
- `ivory`: `#fff7fe`
- `graphite`: `#2a2433`

## Typography
- Primary UI: Inter
- Thai support: IBM Plex Sans Thai or Noto Sans Thai
- Tone: sharp, clean, restrained

## Surfaces
- Main app background: soft ivory to pale lilac wash
- Primary cards: ivory / white with subtle violet tint
- Dark premium surfaces: deep plum panels with soft glow
- Borders: low-contrast lilac-gray

## Shadows
- Default card shadow: soft, low spread
- Elevated panel shadow: longer blur, low opacity
- Glow accent: violet glow only on key CTA / hero surfaces

## Radius
- Buttons: 18 to 20px
- Inputs: 18 to 20px
- Cards: 24 to 28px
- Hero panels: 32px+

## Component direction
### Buttons
- Primary: plum to violet with soft glow
- Secondary: ivory surface with tinted border
- Ghost: transparent with subtle lilac hover

### Cards
- Booking cards: light, airy, premium spacing
- Admin cards: deeper contrast, stronger hierarchy
- Glass cards only for hero/marketing sections, not every screen

### Inputs
- Light surface, plum focus ring
- Avoid neon or harsh LINE green focus states

### Data display
- Use calm numbers and compact labels
- Prefer soft peach accent for status highlights
- Use violet for primary active states

## Product layout rules
### Mobile booking
- One primary action per screen
- Big, quiet cards
- Plenty of whitespace
- Service, date, time, and confirmation should each feel like a premium step

### Admin dashboard
- Darker shell with light cards inside, or light shell with one dark hero summary area
- Charts and summaries should use plum/peach accents, not rainbow colors

### Marketing / hero visuals
- Show mobile + admin surfaces together
- Use layered product composition
- No human characters unless campaign-specific

## Imagery system
Use semi-3D product visuals for:
- Hero banner
- Section illustrations
- Booking success
- Mobile booking visual
- Admin dashboard visual

Avoid:
- Generic flat icons as hero assets
- Cartoon mascots
- Default LINE green gradients
- Busy fintech-style neon overload

## Implementation rule
In product code, use this as a design language, not as a literal render-everything style. Real UI should stay fast, readable, and practical.
