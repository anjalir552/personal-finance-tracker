# Handbook blueprint

Every page chapter in this handbook (chapters 02 to 09) follows this template. The sections always come in the same order, so a reader who learns one chapter can find anything in the others.

If a section doesn't apply to a page, keep the heading and write "None on this page." so the structure stays the same.

---

## Template

```markdown
# <Page name>

> **The question this page answers:** "<one sentence, in the user's words>"

## 1. At a glance

| | |
|---|---|
| **Where to find it** | Sidebar → <group> → <Page name> |
| **Web address** | `#/<route>` |
| **Use it when** | <the moment someone opens this page> |
| **Main actions** | <the buttons that change data> |
| **Saves data?** | <what this page writes, or "No, read-only"> |

## 2. Page layout

What's on screen from top to bottom, as a numbered list of areas.
Each area gets one line saying what it shows.

## 3. Features

One sub-heading per feature (### 3.1, ### 3.2 …). Each feature covers:
- **What it does:** one or two sentences
- **How to use it:** what to click or type
- **Good to know:** rules, limits, edge cases

## 4. Step-by-step tasks

Numbered steps for the common jobs on this page ("How to …").

## 5. How the numbers are worked out

Plain-language explanation of every figure the page shows and where it
comes from. No code; name the source (transactions, goals, upcoming
expenses, settings).

## 6. Empty and special states

What the page shows when there's no data, when filters match nothing,
when money is short, and so on.

## 7. Links to other pages

| From this page | Goes to | Why |
|---|---|---|

## 8. Tips and FAQ

Short questions and answers that come up often.
```

---

## Writing rules

1. **Write for the person using the app**, an 18 to 30 year old managing their own money in India. Say "you", not "the user".
2. **Use the words on screen.** If a button says "Mark paid", write **Mark paid** in bold, exactly as shown.
3. **Amounts are in rupees (₹)** with Indian digit grouping (₹1,50,000).
4. **Explain the numbers in plain words.** Every figure must trace back to transactions, goals, upcoming expenses or settings.
5. **Keep sections short.** Use tables and lists, and avoid long paragraphs.
6. **Same order, every time.** Sections 1 to 8 appear in every page chapter.

## Colours in page chapters

The four planning pages (Purchase Decisions, Savings Goals, Upcoming Expenses, Financial Insights) use their own palette on white with charcoal `#1E2427` text: **powder blue** `#ABC9C8` for data at rest (saved, paid, free to spend; deeper `#5B8C8A` for marks and `#3D6866` for text) and **racing orange** `#F45B0B` for the main button (charcoal text), overdue payments, shortfalls, the purchase being weighed and the chosen plan (`#B84305` for orange text). Structure on these pages comes from space, type and thin rules rather than cards. The sidebar and the other pages keep sage olive and deep plum, so chapters 05 to 08 say "blue" and "orange" and the rest say "sage" and "plum".
