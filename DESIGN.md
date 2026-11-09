# Scopewise Design System

> The single source of truth for how Scopewise looks, behaves and reads.
> Product scope comes from the PRD (currently the README and `docs/handbook/`). This document decides **how** that scope is presented.
> When this file and the code disagree, fix one of them. Don't let both drift.

---

## 1. Product context

Scopewise is a personal finance decision companion for 18 to 30 year olds in India. It answers one question before someone spends: **"Can I afford this without affecting my other goals?"**

Every screen serves that question. Scopewise splits the bank balance into four layers up to the next payday (upcoming expenses, everyday essentials, savings to set aside, free to spend). That **money map** is the product's spine, and the design exists to make it legible.

**Who we design for**
- People in their first jobs, on phones and laptops, often checking in a spare minute before a purchase.
- They're comfortable with UPI and apps but not with finance jargon.
- Amounts are in rupees with Indian digit grouping (₹1,50,000).

**What the design must never do**
- Make a balance look spendable when it is already committed.
- Shame or alarm. Being short is information, not failure.
- Look like a generic SaaS dashboard: KPI card grids, gradient heroes, emoji, decorative illustration, red/green traffic lights.

---

## 2. Design principles

1. **One answer first.** Each page leads with the single figure or verdict it exists to give, in its lead colour block. Everything else explains or supports it.
2. **Every number has one source.** All figures come from the shared money map, so a number is identical on every screen. Never show a figure the store doesn't produce, and never round it differently on different pages.
3. **Quiet report, not dashboard.** Structure comes from space, type and 1px rules before boxes. A card is earned only by content that's a self-contained object: a form, a table, the calendar, a pop-up window.
4. **Meaning is never colour alone.** Every status carries a word, a sign or a shape as well. There's no red and no green.
5. **Plain words.** Write as a friend who's good with money would talk: "Free to spend", "Still to pay", "Wait until payday". Never use jargon like "liquidity" or "burn rate".
6. **Calm under pressure.** Overdue bills and shortfalls get the attention colour and a clear next step, never alarm styling, shaking or exclamation marks.
7. **Private and local.** Nothing suggests accounts, syncing or a server. No sign-in prompts and no cloud icons.
8. **Rules over exceptions.** If a page needs a new pattern, add it here as a reusable rule first.

---

## 3. Visual direction: "Periwinkle daylight"

A light, coloured interface. It reads as a calm sheet of paper laid on a periwinkle desk, with navy ink.

| Layer | What it is | Colour |
|---|---|---|
| **Frame** | The sidebar and the rim around the working sheet | Periwinkle `#C4D6FF` |
| **Sheet** | The ground every page sits on | Pale periwinkle `#E3EAFF` |
| **Surface** | Tables, the calendar, forms, pop-up windows: anything that holds a list or takes input | White `#FFFFFF` |
| **Lead block** | One per page, carrying the headline figure or verdict | Lavender `#B8C0FF` |
| **Second voice** | Savings and goals, the purchase being weighed, the caution verdict | Lilac `#E7C6FF` |
| **Ink** | All text, and small solid marks | Navy `#282E42` |

**Proportions.** Roughly 50% sheet, 30% white surface, 10% frame, under 10% lavender block, small touches of lilac. Navy is everywhere as text but **never fills a large area**.

**Character.** Editorial, not corporate. A serif display face gives titles and hero figures warmth. A clean sans carries everything people read and compare.

---

## 4. Colour

### 4.1 Brand colours and their jobs

Each brand colour has **one job**. Don't borrow a colour for a different meaning.

| Colour | Hex | Job |
|---|---|---|
| **Navy** | `#282E42` | Text and money figures. Small solids: the primary button, active nav marker, today's date, the logo tile, "paid" marks, switches that are on, the nav count badge |
| **Periwinkle** | `#C4D6FF` | The frame. Selection (pale tint `#E8F0FF`), focus, hover washes |
| **Lavender** | `#B8C0FF` | The lead block on each page. Deepened to `#5A67DB`, it's **the one data hue**: free to spend, the current month, goal progress, still to pay. Its light tint marks comparisons, such as last month |
| **Lilac** | `#E7C6FF` | Savings and goals, the purchase being weighed. Deepened to `#9440BE` (marks) and `#74278F` (text), it's the **only attention colour** |

### 4.2 Role tokens

Pages and components use **role tokens only**, never raw hex or scale steps. The scales (`--navy-*`, `--peri-*`, `--lav-*`, `--lilac-*`, `--gray-*`) live in `css/tokens.css` and exist only for defining roles.

| Role | Token | Use |
|---|---|---|
| Ground | `--sheet` | Page background |
| Surface | `--surface` | White panels, tables, forms, modals |
| Frame | `--frame` | Sidebar, rim |
| Lead block | `--block`, `--block-ink`, `--block-ink-2` | The page's one lavender block and its text |
| Text | `--text`, `--text-2`, `--text-3` | Primary, secondary and tertiary text, all navy steps |
| Lines | `--rule`, `--border`, `--control` | Dividers, panel edges, input borders |
| Primary action | `--primary`, `--on-primary` | Navy button with white text |
| Selection | `--selected`, `--accent`, `--accent-tint` | Chosen tab, day, option, row |
| Data | `--data`, `--data-soft`, `--data-dim`, `--data-prev` | Chart marks: main, secondary, track, comparison |
| Positive | `--pos` | Deep periwinkle text, always with a sign or word ("+₹60,000", "On track") |
| Attention | `--alert`, `--alert-ink`, `--alert-wash` | Overdue, due soon, behind plan, shortfall |
| Purchase | `--buy`, `--buy-ink` | The item being weighed on Purchase Decisions |
| Money map | `--seg-bills`, `--seg-everyday`, `--seg-goals`, `--seg-free` | The four segments of the money bar |

### 4.3 Status language

| Meaning | Colour | Always paired with |
|---|---|---|
| Positive, on track, income | Deep periwinkle text | A `+` sign or a word ("On track", "On time") |
| Neutral, paid, done | Navy or grey | A filled dot or a tick, plus the word "Paid" |
| Needs attention | Deep lilac | A word ("Overdue", "Due in 2 days", "Behind") and, where space allows, a diamond mark |
| Negative amount | Navy text | A minus sign. Spending is normal, so it isn't styled as bad |

**Banned:** red, green, amber, orange, traffic-light status, and colour-only legends.

### 4.4 Contrast rules

- Every tier that carries words reaches **4.5:1** on the surface it sits on, including text on the lavender block and on the periwinkle frame.
- Large display figures (24px and up) still meet 4.5:1, because they're the most important content.
- Non-text marks (chart bars, focus rings, input borders) reach **3:1**.
- `--text-faint` is decorative only, for things like adjacent-month dates in the calendar. It must be `aria-hidden` and never carry information.

---

## 5. Typography

### 5.1 Typefaces

| Face | Role | Rules |
|---|---|---|
| **Fraunces** (`--font-display`) | Page titles, the lead figure in the page's block, verdict titles, empty-state titles | Never in tables, lists or columns of numbers: it has no tabular figures. Never below 20px |
| **Figtree** (`--font`) | Everything else: UI, body text, labels, tables, form fields, chart labels | Use tabular figures wherever numbers sit in columns or are compared. Includes the ₹ glyph |

Both are self-hosted (`fonts/`). Don't load fonts from a CDN.

### 5.2 Scale

| Token | Size | Use |
|---|---|---|
| `--fs-title` | 38px (26px on phone) | Page title, Fraunces |
| `--fs-lead` | 36px (32–44px by context) | The lead figure in the page's block, Fraunces |
| `--fs-kpi` | 26px (20px on phone) | Secondary figures in a summary strip, Figtree tabular |
| `--fs-section` | 17px | Section and panel titles, Figtree semibold |
| `--fs-md` | 16px | Emphasised body text, form input text on phone |
| `--fs-base` | 15px | Body text, table cells, buttons |
| `--fs-sm` | 13px | Labels, metadata, table headers, chart axes |
| `--fs-xs` | 12px | Badges, chart ticks. Never body copy |

**Rules**
- Body line height is 1.5. Headings use 1.2. Display figures use 1.05.
- Use three weights only: 400 (body), 500 (labels and buttons) and 600 (titles and key figures). No bold-everything.
- Sentence case everywhere, including buttons, titles and column headers. Don't use all-caps labels.
- Keep lines of reading text to 72 characters at most.
- Money is formatted by the shared formatter only: `₹` prefix, `en-IN` grouping, no decimals unless the figure is under ₹100. Estimates use a leading `~`.
- Dates read naturally: "Tue, 12 Nov". Use relative words ("today", "in 3 days") wherever they help someone act.

---

## 6. Spacing and layout

### 6.1 Spacing scale

The base unit is 4px. Use only these steps:

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48`

| Use | Space |
|---|---|
| Label to its value, icon to its text | 4–8px |
| Between fields in a form | 16px |
| Panel padding (`--card-pad`) | 24px (18px on phone) |
| Grid gap (`--gap`) | 20px (14px on phone) |
| Between sections of a page | 40–48px |
| Page title to first content | 32px (20px on phone) |

Space separates ideas before lines do, and lines separate before boxes do.

### 6.2 Shape

| Token | Radius | Use |
|---|---|---|
| `--r-sheet` | 28px | The working sheet inside the frame |
| `--r-card` | 20px | Panels, the lead block, modals |
| `--r-inner` | 12px | Elements inside a panel (calendar field, inner wells) |
| `--r-control` | 10px | Buttons, inputs, selects, segmented controls |
| `--r-small` / `--r-chip` | 8px / 6px | Chips, tags, tooltips |
| `--r-pill` | 999px | Badges, the nav count, switches |

Radii step **down** as elements nest. A child never has a larger radius than its parent.

### 6.3 Elevation

The interface is flat. Depth comes from the sheet/surface contrast, not shadows.

| Level | Treatment | Use |
|---|---|---|
| 0 | No shadow | Everything on the page |
| 1 | `--shadow-lift` | A white panel that needs separating from a white neighbour (rare) |
| 2 | `--shadow-float` | Things that float above the page: modals, the phone drawer, popovers, toasts |

No inner shadows, glows, glassmorphism or gradients on surfaces.

### 6.4 App shell

```
┌ frame (periwinkle) ───────────────────────────────────────────┐
│ ┌ sidebar ─┐ ┌ sheet (pale periwinkle, 28px radius) ──────────┐│
│ │ brand    │ │  Page title                  [page actions]    ││
│ │ nav      │ │  Subtitle                                      ││
│ │ groups   │ │  ┌ lead block (lavender) ───────────────────┐  ││
│ │          │ │  │ the page's one answer                    │  ││
│ │          │ │  └──────────────────────────────────────────┘  ││
│ │ settings │ │  sections · tables · charts                    ││
│ │ account  │ │                                                ││
│ └──────────┘ └────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

- Sidebar: 252px labelled, 72px as a rail.
- Rim: 12px of periwinkle around the sheet (0 on phone).
- Content uses the full width beside the sidebar, up to `--content-max` (1680px). Reading text inside it keeps its own 72-character measure.
- Page padding: 40px desktop, 32/30px tablet, 22/16px phone.

### 6.5 Grids

- **Main + side** (`grid-main`): about two-thirds / one-third, for a primary object and its supporting list (for example, the goals plan beside "Coming up").
- **Two equal columns** (`grid-2`): paired charts or comparisons.
- **Summary strip** (`stat-strip`): 3–4 figures in one row, divided by vertical rules, with no boxes around each figure.
- Every grid collapses to one column on phone. Main + side collapses at 1080px.

---

## 7. Components

Every component below is reusable. Pages compose them and don't restyle them.

### 7.1 Buttons

| Variant | Look | Use |
|---|---|---|
| **Primary** | Navy fill, white text | The **one** main action on a screen or in a modal: "Add transaction", "Check purchase", "Save" |
| **Secondary** | White fill, `--border` outline, navy text | Other actions next to a primary one: "Cancel", "Export CSV" |
| **Soft** | Periwinkle tint fill, navy text | Repeated in-context actions in lists: "Mark paid", "Add money" |
| **Ghost** | No fill, navy text, tint on hover | Low-emphasis actions in toolbars and headers |
| **Danger** | White fill, lilac-ink text and outline | Destructive actions, always behind a confirmation |
| **Icon button** | 40px square (44px on phone), ghost style | Edit, delete, close. Always has an accessible name and a tooltip on pointer devices |

**Rules**
- Height is 40px (44px on phone). The small size is 32px desktop and 40px phone, used only in dense tables.
- Labels are a verb plus an object ("Add goal", not "Add" or "Submit"). Don't end with a full stop.
- Use at most one primary button per view. In a modal footer, the primary goes on the right.
- An icon sits on the left of the label only when it speeds up recognition ("+", download, export).
- When disabled, the button stays visible at reduced contrast with the reason given nearby. Don't hide actions without explaining why.

### 7.2 Form controls

| Control | Rules |
|---|---|
| **Text and number input** | 40px high, white, `--control` border, 10px radius. The label sits above, never as a placeholder replacement |
| **Money input** | A `₹` prefix affix. Formats with Indian grouping as you type. Accepts digits only. Right-aligned figures are not used in inputs |
| **Select** | Native select, styled to match inputs. Use it for 6+ options |
| **Segmented control** | Use it for 2–5 mutually exclusive options that are always visible (Income / Expense / Transfer, month ranges). The selected segment is white with navy text on a tinted track |
| **Switch** | Use it for settings that apply immediately. Navy when on. Its label states the on-meaning |
| **Checkbox** | Use it for multi-select and consent-style choices |
| **Date** | A native date input. Show the chosen date in words below it if the format is ambiguous |
| **Textarea** | Use it for notes only. Auto-grows to 6 lines |

**States** (every control):

| State | Treatment |
|---|---|
| Default | `--control` border |
| Hover | Border darkens one step |
| Focus | `--accent` border plus the `--ring` focus ring |
| Filled | Same as default; no special colour |
| Error | `--alert` border, an error message below in `--alert-ink` with a diamond icon, linked by `aria-describedby` |
| Disabled | `--sunken` fill, `--text-3` text, `not-allowed` cursor |
| Read-only | No border, value shown as text |

### 7.3 Panels

- A white surface with a `--border` edge, `--r-card` radius and `--card-pad` padding.
- The header holds a title (17px, semibold), an optional one-line description, and actions on the right.
- Use a panel only for **objects**: a table, the calendar, a form, a list someone acts on. Don't wrap a single figure or a paragraph in a panel.
- Don't nest panels. Inside a panel, group with space and rules.

### 7.4 Lead block

- **Exactly one per page.** Lavender (`--block`), `--r-card` radius, generous padding.
- It contains the page's answer: a Fraunces figure, a label, and one sentence of context.
- It can hold a money bar or a small summary strip, but not tables or forms.
- The cautious variant (`--block-alert`, lilac) is used **only** for a cautious purchase verdict.

| Page | Lead block holds |
|---|---|
| Overview | Free to spend until payday, per-day amount, money bar |
| Purchase Decisions | The verdict |
| Savings Goals | Total saved vs total target, goals on track |
| Upcoming Expenses | Still to pay this month, with the paid / overdue / total strip |
| Financial Insights | The month's statement |
| Spending Analysis | This month's spending against the usual |

Transactions and Settings have no lead block. They're tools, not answers.

### 7.5 Money bar

- A horizontal bar split into the four money-map segments, in fixed order: bills (navy), everyday (navy-grey), goals (lilac), free (data lavender).
- On Purchase Decisions, the purchase is shown as a lilac segment taken out of "free".
- 12–16px high, fully rounded ends, 2px white gaps between segments.
- Always paired with a **key** listing each layer's name and amount. The key is the accessible version, and the bar is `aria-hidden`.
- If free to spend is negative, the bar shows the overrun past the balance in an attention hatch, and the key says "Short by ₹X".

### 7.6 Figures and summary strips

- A figure is a label (13px, `--text-2`) above a value (Figtree tabular, or Fraunces only for the page's lead figure) with optional metadata below.
- In a strip, figures are separated by 1px vertical rules, with no individual boxes.
- A change from a comparison uses a word and a sign: "₹2,400 more than October". Arrows are optional and never the only signal.

### 7.7 Tables

- Use them for lists people scan, sort or act on: transactions, recurring payments, past decisions, goal plans.
- Header row in 13px `--text-2`, sentence case, with no fill and a 1px rule below.
- Rows are 52px minimum and separated by `--rule`. Don't use zebra striping.
- Money columns are right-aligned and tabular. Dates and text are left-aligned.
- Row actions (edit, delete) appear on hover or focus on pointer devices and are always visible on touch devices.
- The first column holds the title plus a secondary line (category, method).
- On phone, low-priority columns are hidden. The table never scrolls horizontally inside the page.
- Category dots: a filled navy-grey dot means essential, a hollow dot means non-essential.

### 7.8 Lists

Use them for short action lists inside a panel or side column ("Next payments", "Coming up"): title, secondary line, amount on the right, and an optional single action. Show at most 5–7 items, then a link to the full page.

### 7.9 Charts

- Hand-built responsive SVG. Every chart is a sentence first: a visible one-line summary sits above it.
- One main data hue (`--data`). Comparison series use `--data-prev` or `--data-soft`. Essentials vs non-essentials use `--chart-1` (navy) and `--chart-2` (data).
- Gridlines are faint (`--chart-grid`), horizontal only. Axis labels are 12–13px `--text-3`. Don't use chart borders.
- Tooltips appear on hover and on keyboard focus. They're white, with `--shadow-float`, and show a label, value and comparison.
- Use no more than 2 series per chart and no pie charts. Use a single horizontal bar or a category list with tracks instead.
- Each chart has an accessible text alternative (summary plus the data as a list or table for screen readers).
- Charts inside a collapsed `<details>` are drawn when it opens, not on page load.

### 7.10 Badges, chips and tags

| Element | Use |
|---|---|
| **Count badge** | A navy pill with white text. Shows only things needing action (the Upcoming count covers items due in 3 days) |
| **Status tag** | Text plus a small shape mark: "On track", "Behind", "Overdue", "Paid". The colour follows the status language |
| **Filter chip** | A removable active filter in a toolbar. Tinted fill, × button with an accessible name |
| **Verdict tag** | A short label above a verdict ("Comfortable", "Tight", "Not yet") |

### 7.11 Calendar (Upcoming Expenses)

- Seven equal columns with a fixed row height. All weeks are the same height, always.
- It sits on one soft field (`--r-inner`). Adjacent-month dates are faint and `aria-hidden`.
- Payments are marked by **shape**, plus a day total:
  - **Paid:** a grey filled dot
  - **Still to pay:** a data-lavender ring
  - **Overdue:** a lilac diamond
- Today is a navy disc with white numerals. The selected day has the periwinkle selection tint.
- No payment names inside cells. The selected day opens in a white sheet at the **foot** of the calendar field, never between weeks and never in a side column.
- The summary strip's label marks double as the calendar key.
- Arrow keys move between days, Enter selects, and Page Up / Page Down change month.

### 7.12 Modals

- Use them for focused, short tasks (add or edit a transaction, a new goal) and confirmations.
- Up to 560px wide, `--r-float` radius, `--shadow-float`, over a navy scrim at 50%.
- Header (title and close button), body (form) and footer (secondary, then primary on the right).
- On phone, the modal becomes a bottom sheet with full-width footer buttons.
- Closes with ×, Cancel, Esc, or a click on the scrim, unless there are unsaved changes, in which case it asks first.
- Focus moves to the first field on open, is trapped inside, and returns to the trigger on close.

### 7.13 Confirmations

- Required for anything destructive or hard to undo: delete a transaction, goal or decision, clear all data, restore example data.
- The title states the consequence: "Delete this goal?" The body says what will be lost, including amounts.
- Buttons name the action: "Delete goal" (danger) and "Keep it" (secondary). Never use "OK" or "Yes".
- Clearing all data first suggests "Export everything".

### 7.14 Toasts

- Short confirmation after a change: "Goal created", "Marked as paid", "Exported transactions.csv".
- Bottom-right on desktop, full-width bottom on phone. White, `--shadow-float`, with an icon and text.
- They disappear after about 3 seconds, pause on hover or focus, and are announced via a polite live region.
- Where an action is reversible, the toast offers **Undo** for 6 seconds instead of a confirmation dialog.
- Never use a toast for errors that need action. Show those inline.

### 7.15 Callouts and observations

- A callout is a plain-language finding inside a page ("You've spent 40% more on food delivery than usual").
- It has a small shape mark, a title and one or two sentences, plus an optional link to act ("See food spending").
- The tone is neutral or attention (lilac). Don't use an "info blue" or a "success green".

### 7.16 Icons

- One line-icon set (`js/icons.js`): 1.75px stroke, rounded joins, a 24px grid, rendered at 16, 18 or 20px.
- Icons support labels. They never replace them, except in the collapsed rail (which has tooltips) and universal icon buttons (close, edit, delete).
- Don't use filled, duotone, emoji or illustrative icons.

---

## 8. Navigation

### 8.1 Structure

| Group | Pages |
|---|---|
| *(top)* | Overview |
| **Track** | Transactions, Spending Analysis |
| **Plan & decide** | Purchase Decisions, Savings Goals, Upcoming Expenses, Financial Insights |
| *(bottom)* | Settings, account card (name, life stage, city), which opens Settings |

- Every page has a hash route (`#/goals`) that can be bookmarked and works with Back and Forward. Unknown routes open Overview.
- The brand opens Overview.

### 8.2 Sidebar states

| State | When | Behaviour |
|---|---|---|
| **Labelled** | Desktop, default | 252px, icon plus label, group headings |
| **Rail** | Desktop when chosen (remembered), tablet automatically | 72px, icons in one centred column, group headings become hairlines, tooltips on hover and focus, the count badge hangs off the icon corner |
| **Drawer** | Phone | Hidden behind a top bar with a menu button. Slides in from the left over a scrim. Closes on scrim tap, Esc or navigation |

- **Active page:** a white tile on the periwinkle frame, with a navy label and a short navy marker bar. `aria-current="page"`.
- **Hover:** a translucent white wash.
- The collapse toggle sits at the top of the sidebar and is hidden on tablet, where the rail is fixed.

### 8.3 In-page navigation

- **Tabs** switch between views of the same data (for example, Spending / Savings on Insights). The selected tab is underlined in navy.
- A **month switcher** (previous / month name / next) controls any month-based page, keeps its place in the URL where it matters, and can't move past the current month for history views.
- **Links** between pages use the destination's name: "See all upcoming", "Open Savings Goals". Every cross-page link is listed in the handbook's "Links to other pages" table.

---

## 9. Forms

### 9.1 Layout

- One column by default. Two columns only for short paired fields (amount and date, category and method). Everything is one column on phone.
- Order fields as the person thinks: what (name), how much (amount), when (date), then details (category, method, note).
- Group related fields under a quiet subheading instead of fieldset borders.
- Mark optional fields "(optional)". Don't use asterisks for required ones.
- The Purchase Decisions form is three columns on desktop, with no price slider. Its result appears **below** the form, never beside it.

### 9.2 Labels, hints and defaults

- Every field has a visible label. Placeholders show an example ("e.g. Sony headphones"), never the label.
- A hint sits below the label when the field needs explaining ("The least you want left before payday").
- Use smart defaults: today's date, the most recent payment method, the category inferred from type.

### 9.3 Validation

- Validate on blur and on submit, never on every keystroke.
- On submit with errors, focus moves to the first invalid field and a summary is announced.
- Error messages say what to do: "Enter an amount above ₹0", not "Invalid input".
- Never clear what someone has typed because of an error.

### 9.4 Submission

- The primary button shows the action while saving ("Saving…") and is disabled to prevent a double submit.
- On success, close the modal, show a toast, and highlight the new or changed row for 1.5 seconds.
- Money inputs are formatted on the fly but stored as plain numbers.

---

## 10. Loading, empty and error states

### 10.1 Loading

All data is local, so most reads are instant.

- **Don't show skeletons or spinners for local reads.** A flash of loading UI is worse than none.
- If any operation takes over 300ms (a large CSV export, a future import), show inline progress on the trigger itself ("Exporting…"), not a full-page spinner.
- Future network features (sync, statement import) use skeletons shaped like the final content, in `--sunken`, with no shimmer when reduced motion is set.
- Fonts load with `font-display: swap`, and fallback stacks are metric-close so layout doesn't jump.

### 10.2 Empty states

Every list, table, chart and page defines its empty state. The pattern is:

1. A small line icon in a soft circle
2. A Fraunces title saying what's missing ("No goals yet")
3. One sentence on why it's useful ("Goals set aside money each payday so your plans stay on track.")
4. One primary action ("Create a goal")

| Situation | Treatment |
|---|---|
| **First run, no data** | Overview shows a welcome with three set-up steps (balance and payday, first transaction, first goal) |
| **Filters match nothing** | "No transactions match these filters", plus a **Clear filters** action. Keep the toolbar visible |
| **Too little history for a chart** | Show the chart frame with a sentence: "Charts appear after your first full month." Don't draw a fake chart |
| **Nothing due** | A positive sentence, not an empty grid: "Nothing left to pay before payday." |

### 10.3 Error and special states

| Situation | Treatment |
|---|---|
| **Storage blocked** (private window) | A persistent, dismissible banner at the top of the sheet: "Changes won't be saved after you close this tab." Plus **Export everything** |
| **Field error** | Inline, see 9.3 |
| **Free to spend is negative** | Not an error. The lead block states "Short by ₹X before payday" in attention ink, with the next step ("Move a goal date" or "Review upcoming"). The figure itself stays navy |
| **Purchase doesn't fit** | The verdict uses the lilac caution block and always offers alternatives (wait until payday, save first and make it a goal) |
| **Overdue payment** | A lilac diamond, the word "Overdue", the number of days, and a **Mark paid** action |
| **Failed export or download** | Inline message next to the trigger with a retry option |
| **Unexpected error** | A calm message inside the page area ("Something went wrong showing this page. Your data is safe.") with **Reload**. The sidebar stays usable |

Error copy never blames the person and never uses "Oops", "Uh-oh" or exclamation marks.

---

## 11. Interaction and motion

### 11.1 Principles

Motion is **feedback only**: it confirms an action, shows where something came from, or keeps orientation. Nothing animates on its own, loops or decorates.

### 11.2 Timing

| Token | Value | Use |
|---|---|---|
| `--dur` | 160ms | Hover, press, focus, toggles, tooltips |
| `--dur-nav` | 240ms | Sidebar collapse, drawer, modal and sheet entry |
| — | 200ms | Fade-ins (scrim, toast) |
| `--ease` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | All motion: a quick start and a soft settle |

Exits are about 25% faster than entries.

### 11.3 Allowed motion

| Interaction | Motion |
|---|---|
| Button press | A slight darken. No scale bounce |
| Modal open | Fade plus a 8px rise. A bottom sheet on phone slides up |
| Drawer | Slides from the left with the scrim fading in |
| Sidebar collapse | Width transition. Labels fade out before the width shrinks |
| Calendar day select | The sheet at the foot expands in height. Rows don't move |
| New or edited row | A periwinkle tint that fades out over 1.5 seconds |
| Chart drawing | Bars grow from the baseline once, on first draw only (300ms) |
| Number updates | Swap instantly. No counting-up animations for money |

### 11.4 Banned motion

Parallax, scroll-triggered reveals, auto-playing carousels, confetti, shaking error fields, pulsing badges, skeleton shimmer on local data, and counting-up money.

### 11.5 Reduced motion

With `prefers-reduced-motion: reduce`, all transitions and animations collapse to an instant change. Behaviour and state stay the same.

### 11.6 Hover, focus and touch

- Every hover affordance also has a focus equivalent.
- Hover-only reveals (row actions, calendar tools) are always visible on touch devices (`hover: none`).
- Touch targets are 44 × 44px minimum on phone.

---

## 12. Responsive behaviour

### 12.1 Breakpoints

| Name | Width | Shell |
|---|---|---|
| **Phone** | up to 760px | Top bar plus drawer, no rim, single column, bottom-sheet modals |
| **Tablet** | 761–1080px | Fixed icon rail, single-column main grids |
| **Laptop** | 1081–1180px | Labelled or rail (remembered), money keys in 2 × 2 |
| **Desktop** | 1181px and up | Full layout, content up to 1680px |

### 12.2 Rules

- Design phone-first for content order and desktop-first for density. The **order of content never changes** between sizes, only the arrangement.
- There's no horizontal page scroll at any width, and no scroll areas inside the page except long modal bodies.
- Summary strips become stacked rows (label left, value right) on phone.
- Tables drop secondary columns on phone rather than scrolling sideways.
- Toolbars on phone put search full-width, put filters behind a **Filters** toggle, and stretch segmented controls full-width.
- Page actions on phone become full-width buttons under the title.
- Display figures scale down one step per breakpoint (for example, lead figure 44 → 40 → 32px) and never wrap mid-amount.
- Check every page at 375px, 768px, 1280px and 1600px.

---

## 13. Accessibility

Target: **WCAG 2.2 AA** throughout.

**Structure**
- A skip link to the main content is the first focusable element.
- One `<h1>` per page (the page title), then a logical heading order with no skipped levels.
- Use landmarks: `nav` for the sidebar, `main` for the page, and `aside` for side columns.
- Route changes move focus to the page title and update the document title ("Savings Goals · Scopewise").

**Keyboard**
- Everything is reachable and operable by keyboard in visual order.
- Focus is always visible: the `--ring` periwinkle ring plus an accent border on controls. Never remove outlines without a replacement.
- Modals and the drawer trap focus and return it on close. Esc closes them.
- Composite widgets (calendar, segmented controls, tabs) use arrow keys with roving tabindex.

**Screen readers**
- Icon-only buttons have accessible names ("Delete transaction: Rent").
- Money is read in full. Abbreviations like "₹1.5L" are not used in accessible text.
- Charts and the money bar have text equivalents. The visual is `aria-hidden` when a text version exists.
- Toasts and live figures (free to spend after a what-if change) are announced through polite live regions.
- Status is conveyed in text, never by colour or shape alone.

**Visual**
- Contrast follows section 4.4.
- Text resizes to 200% without loss of content or function. Layouts use relative units for text.
- Nothing flashes more than three times a second.

**Forms**
- Labels are programmatically linked, errors use `aria-describedby` and `aria-invalid`, and required fields are marked in text.
- Inputs use the right `inputmode` (`numeric` for money).

---

## 14. Page-level layout guidance

Every page follows the same header: **title (Fraunces) → one-line subtitle → page actions on the right** (stacking under the title on phone). Below that comes the lead block, then supporting sections in order of importance.

Planning pages (Purchase Decisions, Savings Goals, Upcoming Expenses, Financial Insights) follow the **quiet report** rule: no card grids, with structure from space, type and rules. Panels appear only for tables, the calendar and forms.

### 14.1 Overview: "How much can I actually spend?"
1. **Lead block:** free to spend until payday, per-day amount, available balance, money bar with key
2. **Coming up:** next payments list (main column) beside savings progress (a lilac-toned side panel)
3. **Last month at a glance:** a summary strip
4. **Worth knowing:** two or three observations with links
- First run replaces 1–4 with the three-step welcome.

### 14.2 Transactions: "Where did my money go, line by line?"
1. Header actions: **Add transaction** (primary), **Export CSV** (secondary)
2. A strip of three figures for the filtered period (in, out, to savings), with the savings tile in lilac
3. Toolbar: search, type segmented control, category and method filters, active filter chips
4. Table: title and category, date, method, amount, row actions
- No lead block. Filtering never hides the toolbar.

### 14.3 Spending Analysis: "What am I spending on?"
1. **Lead block:** this month's spending against the usual
2. Essentials vs non-essentials (a single split bar with words)
3. Categories: a ranked list with tracks and change vs last month
4. Month-by-month chart (current month in the data hue, previous in the comparison hue)
5. Patterns (day-of-week and size observations)

### 14.4 Purchase Decisions: "Can I afford this?"
1. **Form:** three columns (item, price, when / how to pay), with no slider and one primary **Check purchase** button
2. **Verdict** below the form, in the lead block (lilac when cautious): verdict tag, Fraunces title, one-sentence reason
3. **Available-to-spend equation:** a step-by-step waterfall from balance to what's left after the purchase, with the purchase as the lilac step
4. **Impact:** a table of what changes (free to spend, per day, cushion, goal dates)
5. **Alternative plans:** buy now / wait until payday / save first, as selectable options, with **Make it a goal**
6. **What-if adjustments** and **Past decisions** (table)
- The result never sits beside the form.

### 14.5 Savings Goals: "Am I on track for what I'm saving for?"
1. **Lead block:** total saved vs total target, how many goals are on track
2. One band per goal, separated by rules: name, progress track, status tag, monthly plan, **Add money**. Trajectory chart and milestones go inside a disclosure, drawn on open
3. The plan table (monthly amounts per goal) beside "Coming up" (next milestones and dates)

### 14.6 Upcoming Expenses: "What do I still have to pay?"
1. Month bar (previous / month / next)
2. **Lead block:** still to pay (lead figure), plus paid, overdue and total. Its label marks are the calendar key. A progress bar below it (paid grey, overdue lilac, still to pay data lavender)
3. **Calendar** on its soft field, with the selected-day sheet at its foot (payments, amounts, **Mark paid**)
4. Next payments list
5. Table of everything scheduled and recurring, with **Add upcoming expense**
- Don't add side columns or panels between weeks.

### 14.7 Financial Insights: "How did this month go?"
1. Month strip (selectable months)
2. **Lead block:** the month's statement in plain sentences with key figures
3. Tabs or sections: **Spending** (pace chart, categories vs last month) and **Savings** (performance vs plan), each with a pair of charts
4. Findings: observations with links to act

### 14.8 Settings: "Set up my numbers and manage my data"
1. Sections stacked as label-and-description on the left, fields on the right (stacking below 900px): **Your money** (balance, income, payday, safety cushion), **Profile** (name, life stage, city), **Your data** (export everything, restore example data, clear all data)
2. Destructive items sit last, in a section with the danger button style and a confirmation
- No lead block. Save confirms with a toast.

---

## 15. Content and voice

- Use "you" and "your". Write short sentences and use the active voice.
- Use the product's own terms consistently: **Free to spend**, **Upcoming expenses**, **Everyday essentials**, **Savings to set aside**, **Safety cushion**, **Pay cycle**, **Payday**.
- Explain numbers in one line wherever they appear ("After rent, groceries and your goals").
- Give advice as options, never commands: "You could wait until payday" rather than "Don't buy this".
- Purchase Decisions and Insights carry a quiet disclaimer: "Estimates to help you think it through, not financial advice."
- Don't use emoji, exclamation marks, "Oops", or jokes about money stress.

---

## 16. Governance

- **Tokens first.** A new colour, size, radius or duration goes into `css/tokens.css` as a role token, then gets documented here. Pages never use raw values.
- **New components** are added to section 7 with their variants, states and rules before they're used on a second page.
- **Page changes** update section 14, the matching handbook chapter in `docs/handbook/`, and the screenshots in `docs/screenshots/`.
- **Before merging UI work**, check:
  - [ ] Only role tokens. No new hex values in page styles
  - [ ] One lead block and one primary button per view
  - [ ] Every status has a word or shape as well as colour
  - [ ] Empty, error and edge states are defined
  - [ ] Keyboard path, focus ring and screen-reader text are verified
  - [ ] No horizontal overflow at 375, 768, 1280 and 1600px
  - [ ] Reduced motion is respected
  - [ ] Figures come from the shared money map, and are identical across pages
