# Amazones Visual Identity and Design System

## Purpose
This document defines the visual identity of Amazones as a professional, scalable, agent-first prediction market brand. It covers brand philosophy, design principles, color architecture, typography, spacing, interaction patterns, accessibility rules, and misuse guidance.

The goal is not just to make the interface "look good." The goal is to make Amazones feel:
- trustworthy enough for money
- clear enough for non-technical users
- structured enough for power users and agents
- distinctive enough to avoid looking like a generic crypto dashboard

## Brand Thesis
Amazones should feel like a **financial intelligence product**, not a casino and not a hacker toy.

The visual identity should communicate:
- clarity
- speed
- institutional credibility
- Latin American energy without folklore cliches
- machine-readability and human confidence at the same time

## Brand Personality
### Core attributes
- precise
- composed
- strategic
- modern
- intelligent

### Not this
- neon cyberpunk
- meme-coin aesthetics
- generic SaaS pastel softness
- black-and-purple AI wallpaper branding
- red/green overload like an old retail trading terminal

## Visual Philosophy
### 1. Probability as a first-class visual object
Markets are about conviction, odds, uncertainty, and settlement. The UI should make probability feel tangible, not abstract.

### 2. Calm base, sharp highlights
The system should use a restrained neutral foundation, with deliberate, high-value accents for market state, action, and signal.

### 3. Human-legible, agent-structured
The visual system should help humans scan and understand, while the underlying hierarchy stays systematic enough for agent-facing interfaces and future automation tools.

### 4. Less noise, more hierarchy
Most prediction market products fail visually because every number screams. Amazones should emphasize hierarchy over density.

## Design Principles
### Clarity over ornament
Every visual decision must make the product easier to understand.

### Financial trust before novelty
Innovation should appear in structure and flow, not in visual gimmicks.

### Semantic consistency
The same color, spacing, and state logic must mean the same thing everywhere.

### Strong defaults
Users should understand the platform without customizing anything.

### Distinctive restraint
The brand should be memorable because it is intentional, not loud.

## Visual Direction
The recommended direction is:
- warm-light neutral surfaces
- deep ink text
- mineral green for positive / affirmative / active conviction
- clay red for negative / risk / loss / no-side semantics
- amber-gold for pending / resolving / caution
- electric cyan used sparingly for intelligence, system activity, and premium agent features

This creates a visual language that feels more editorial and financial than "crypto app."

## Color Architecture

## Color roles
The design system should define colors by **role**, not by raw hue:
- background
- surface
- text
- border
- action
- yes-state
- no-state
- warning
- premium
- informational

This prevents ad hoc color usage.

## Core palette

### Neutrals
| Token | Hex | Usage |
|---|---|---|
| `ink-950` | `#0F1720` | Primary text, strongest UI anchors |
| `ink-900` | `#18222D` | Headers, dense tables, nav text |
| `ink-700` | `#425466` | Secondary text |
| `ink-500` | `#6B7C8F` | Tertiary text, helper copy |
| `mist-50` | `#F8F7F3` | App background |
| `mist-100` | `#F1EFE8` | Subtle alt background |
| `paper-0` | `#FFFFFF` | Cards, overlays, raised surfaces |
| `stone-200` | `#D9D4C7` | Dividers and subtle borders |
| `stone-300` | `#C7C0B1` | Stronger borders and disabled states |

### Semantic market colors
| Token | Hex | Usage |
|---|---|---|
| `yes-600` | `#1F7A5C` | YES actions, positive fills, active conviction |
| `yes-500` | `#2E9B73` | YES hover and chart emphasis |
| `yes-100` | `#DDF3EA` | YES soft backgrounds |
| `no-600` | `#9A4B42` | NO actions, negative fills, downside semantics |
| `no-500` | `#B85E52` | NO hover and chart emphasis |
| `no-100` | `#F8E1DD` | NO soft backgrounds |

### Status and intelligence colors
| Token | Hex | Usage |
|---|---|---|
| `gold-600` | `#A56A18` | Resolving, caution, pending financial state |
| `gold-100` | `#F7E7C6` | Pending tags and soft warning backgrounds |
| `sky-600` | `#0E7490` | System info, premium intelligence cues |
| `sky-100` | `#D9F1F7` | Informational surfaces |
| `violet-600` | `#5B4DB2` | Reserved only for advanced agent features if needed |

### Utility colors
| Token | Hex | Usage |
|---|---|---|
| `success-600` | `#1E8E5A` | Non-market success states |
| `warning-600` | `#AD7A12` | Generic warnings |
| `danger-600` | `#B34343` | Errors, destructive actions |

## Recommended brand gradient
The system may use a controlled gradient for hero surfaces and premium agent experiences:

- `#F6F1E7` -> `#E8F2EE` -> `#E3EEF6`

This should feel atmospheric and intelligent, not glossy.

## Color usage rules

### Use `yes` and `no` only for market semantics
`yes-*` and `no-*` should be reserved for:
- buy YES / buy NO actions
- position chips
- price movements tied to those sides
- outcome probabilities

They should **not** be reused for generic app success/error states.

### Use gold for uncertainty, not for premium upsell
Gold should represent:
- resolving
- pending review
- caution
- challenge windows

Do not use gold as the main premium brand color because it creates confusion with market status.

### Use cyan/sky sparingly
`sky-*` should represent:
- system intelligence
- premium data
- agent automation
- structured metadata

If overused, it turns the whole interface into a generic "AI product."

### Neutrals should do most of the work
At least 75% of the interface should be neutral. Accent colors should be earned.

## How not to use color
- Do not put saturated YES green and NO red beside each other in large areas unless the user is making a trade decision.
- Do not use gradients inside data-dense components like tables or order books.
- Do not make every tag colorful.
- Do not use pure black backgrounds with glowing accents.
- Do not use green for all positive concepts and red for all negative concepts if those concepts are unrelated to market side.

## Thematic surface system
Use a layered surface model:

### `bg-app`
Main shell background, slightly warm neutral.

### `bg-subtle`
Secondary panel backgrounds, filters, and grouped sections.

### `bg-card`
Default market cards, portfolio cards, modal panels.

### `bg-elevated`
Dropdowns, command menus, and active overlays.

### `bg-semantic-soft`
Very soft semantic fills used only for tags, pills, and small highlight blocks.

## Typography System

## Typography philosophy
Prediction markets are information-dense. Typography should feel editorial and financial, not developer-default.

## Recommended font pairing
### Primary UI sans
- `Instrument Sans`, `Suisse Int'l`, or `IBM Plex Sans`

### Secondary display / editorial
- `Fraunces` or `Tiempos Headline` for marketing or hero moments only

### Monospace
- `IBM Plex Mono` or `JetBrains Mono`

If licensing or implementation complexity is a concern, use:
- `IBM Plex Sans`
- `IBM Plex Mono`

This is a strong, practical default.

## Type roles
| Role | Suggested size | Weight | Use |
|---|---|---|---|
| Display | 48-64px | 600 | Marketing hero, major stat moments |
| H1 | 36-44px | 600 | Page title |
| H2 | 28-32px | 600 | Section title |
| H3 | 22-24px | 600 | Card title / major panel heading |
| Body L | 18px | 400 | Explanatory copy |
| Body M | 16px | 400 | Default body |
| Body S | 14px | 400/500 | Secondary text |
| Label | 12-13px | 600 | Form labels, tags |
| Mono Data | 13-14px | 500 | IDs, balances, hashes, timestamps |

## Typography rules
- Use tight hierarchy and avoid too many font sizes.
- Do not use all-caps for long labels.
- Use monospace only for data, not for branding.
- Avoid center-aligned copy except in hero sections.

## Layout and Spacing

## Layout philosophy
The product should feel measured and institutional, with generous spacing around key decisions and tighter spacing only in high-density market views.

## Spacing scale
Use an 8px base grid:
- `4`
- `8`
- `12`
- `16`
- `24`
- `32`
- `40`
- `48`
- `64`

### Rules
- Most card padding: `24`
- Dense table cell padding: `12` to `16`
- Section spacing: `32` to `48`
- Hero spacing: `64+`

## Grid
- Desktop: 12-column layout
- Tablet: 8-column layout
- Mobile: 4-column layout

## Border Radius
| Token | Value | Usage |
|---|---|---|
| `radius-sm` | `8px` | inputs, pills |
| `radius-md` | `12px` | cards, dropdowns |
| `radius-lg` | `18px` | feature panels, modals |
| `radius-xl` | `24px` | hero containers only |

### Radius rules
- Avoid overly round "consumer fintech bubble" components.
- Most product surfaces should use `12px`.

## Elevation and Borders
The system should prefer **borders over heavy shadows**.

### Recommended shadow usage
- light ambient shadows only on overlays and modals
- cards should usually rely on contrast and border, not blur-heavy shadows

### Border philosophy
- use soft warm borders to structure the UI
- stronger borders signal active or selected states

## Iconography
### Style
- clean outlined icons with occasional filled active state
- geometric and precise, not playful

### Rules
- keep stroke widths consistent
- avoid mixing rounded cartoon icons with sharp financial UI

## Data Visualization

## Chart philosophy
Charts should reinforce decisions, not dominate the interface.

### Rules
- YES line/area uses `yes-500`
- NO line/area uses `no-500`
- Neutral axes and grid lines must stay subtle
- use gold only for resolution markers or event boundaries

### Do not
- use rainbow palettes for market charts
- use loud drop shadows or glowing lines
- fill large chart areas with opaque colors

## Component Design Guidance

## Buttons
### Primary button
- neutral dark fill or YES/NO semantic fill when action is market-side-specific

### Secondary button
- white or soft neutral with border

### Tertiary button
- text-only, low emphasis

### Destructive button
- only for deletion, revocation, or irreversible account actions

## Inputs
- high readability
- strong focus ring
- labels always visible
- helper text below field

## Cards
Cards should carry most of the interface structure.

### Market card should show
- question
- category
- close time
- yes probability
- no probability
- volume or liquidity
- resolution status

### Card tone
- mostly neutral
- color appears in controlled chips, buttons, and probabilities

## Tags and Chips
Tag categories:
- category tag
- status tag
- agent tag
- premium tag

### Rules
- use soft fills, never full-saturation backgrounds
- do not create too many one-off tag colors

## Motion System

## Motion philosophy
Motion should communicate state change and confidence, not entertainment.

### Use motion for
- panel transitions
- toast appearance
- expanding trade ticket
- hover/focus feedback
- live order book updates

### Motion characteristics
- short duration
- low bounce
- no exaggerated springiness

### Timing
- micro: `120ms`
- standard: `180ms`
- panel/overlay: `240ms`

## Accessibility

## Non-negotiables
- WCAG AA contrast minimum
- color cannot be the only indicator of meaning
- focus states must be clearly visible
- YES vs NO must also be labeled textually
- all live-updating components should remain readable at reduced motion settings

## Accessibility examples
- Use icons or labels alongside semantic colors.
- Show `YES` and `NO` in text, not color only.
- For agent status, use text like `Active`, `Paused`, `Draft`.

## Visual Identity by Surface

## Homepage / marketing
Can use:
- editorial headlines
- atmospheric gradient backgrounds
- larger type
- stronger storytelling visuals

Should not use:
- dense trading terminal visuals as the first impression

## Trading screens
Should use:
- stricter layout
- neutral base
- strong data hierarchy
- minimal decorative gradient use

Should not use:
- oversized brand expression that competes with decision-making

## Agent management screens
Should use:
- more structured system cues
- controlled use of `sky-*` to signal automation and intelligence
- clean step-by-step flows

Should not use:
- sci-fi AI imagery

## Voice of UI
The written tone should be:
- direct
- intelligent
- calm
- explicit about risk

Avoid:
- hype
- vague AI promises
- casino language like "bet big" or "win huge"

## Example token model
```css
:root {
  --bg-app: #F8F7F3;
  --bg-subtle: #F1EFE8;
  --bg-card: #FFFFFF;
  --text-primary: #0F1720;
  --text-secondary: #425466;
  --border-subtle: #D9D4C7;
  --border-strong: #C7C0B1;

  --yes-solid: #1F7A5C;
  --yes-soft: #DDF3EA;
  --no-solid: #9A4B42;
  --no-soft: #F8E1DD;
  --gold-solid: #A56A18;
  --gold-soft: #F7E7C6;
  --sky-solid: #0E7490;
  --sky-soft: #D9F1F7;
}
```

## Brand Misuse Guidelines
- Do not default every primary CTA to green.
- Do not use red and green as generic dashboard success/error colors everywhere.
- Do not fill large dashboard zones with semantic colors.
- Do not use more than one brand gradient on a single screen.
- Do not mix three visual personalities on one page.
- Do not use purple as the main brand color.
- Do not make the order book look like a legacy trading terminal unless that is a deliberate pro-mode screen.

## Recommended MVP Design System Deliverables
- foundational token file
- component usage guidelines
- button states
- input states
- tag and badge spec
- card templates
- market table spec
- order ticket spec
- chart palette spec
- marketing page art direction

## Final Recommendation
The Amazones identity should be built around a **warm-neutral financial base with controlled semantic color**, not around typical crypto dark-mode theatrics.

The strongest visual position is:
- editorial enough to feel premium
- systematic enough to scale
- restrained enough to be trusted
- distinct enough to be remembered

If implemented well, Amazones should look less like a crypto exchange clone and more like a new category: a market intelligence network for humans and agents.
