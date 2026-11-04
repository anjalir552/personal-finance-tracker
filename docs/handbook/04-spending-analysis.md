# Spending Analysis

> **The question this page answers:** "Where did my money go, and is that changing?"

## 1. At a glance

| | |
|---|---|
| **Where to find it** | Sidebar → Track → Spending Analysis |
| **Web address** | `#/spending` |
| **Use it when** | At the end of a month, or when you feel you spent "too much" and want to know on what |
| **Main actions** | Pick a month |
| **Saves data?** | No, read-only |

## 2. Page layout

1. **Header:** a one-sentence summary and the **month switch**
2. **Where it went** (left): spending by category vs the month before
3. **Essentials vs non-essentials** (right, top): split bar and totals
4. **Patterns** (right, bottom): what stands out in the month
5. **Month by month** (full width): a bar chart of complete months

## 3. Features

### 3.1 Header summary
- **What it does:** "You spent **₹X** in October, Y% more than September. The biggest change was shopping (+₹Z)."
- **Good to know:** the comparison only appears for complete months. The "biggest change" line only appears if a category rose by more than ₹500.

### 3.2 Month switch
- **What it does:** switches every panel to another month.
- **How to use it:** click a month in the switch at the top right. It shows up to the **last 5 months** that have spending. The current month is labelled **(so far)**.
- **Good to know:** the page opens on the most recent **complete** month, not the current partial one.

### 3.3 Where it went
- **What it does:** lists every category with spending this month or last month, largest first.
  - **Dark bar:** the selected month. **Light bar underneath:** the month before.
  - **Figure:** the amount, with the change below it (`+₹1,200`, `−₹300`, "about the same", or "new").
  - **Dot:** filled dark grey for essential, hollow for non-essential.
- **Good to know:** a change is shown in **plum** only when a **non-essential** category rose by **more than 25%**. Falls of more than ₹100 are shown as positive.

### 3.4 Essentials vs non-essentials
- **What it does:** a two-part bar and two figures: **Essentials** (rent, bills, groceries, transport…) and **Non-essentials** (eating out, shopping, fun…), each with its share of the total.
- **Good to know:** a note below compares non-essentials with the month before ("Non-essentials were **₹X higher** than in September, while essentials stayed about the same"). For the current month, it shows last month's non-essential total instead.

### 3.5 Patterns
Up to four findings for the selected month:

| Pattern | Shown when | Example |
|---|---|---|
| **Most frequent** | One place appears 3+ times (bills excluded) | "Swiggy, 9 times · ₹3,400 in total, about ₹380 each time" |
| **Small purchases** | 5+ payments under ₹300 | "14 payments under ₹300 · together …" |
| **Weekends** | Any flexible spending | "42% of flexible spending" happened on Saturday or Sunday |
| **Largest one-off** | Any non-bill expense | The biggest single purchase, its category and date |

### 3.6 Month by month chart
- **What it does:** stacked bars for up to the **last 6 complete months**, showing essentials and non-essentials.
- **How to use it:** hover over (or tap) a bar for a tooltip with essentials, non-essentials and the total. The selected month is highlighted.
- **Good to know:** the chart needs at least **2 complete months**.

## 4. Step-by-step tasks

**How to see why last month cost more**
1. Open Spending Analysis. It opens on last month.
2. Read the header for the biggest change.
3. In **Where it went**, look for plum changes.
4. Check **Patterns** for frequent places and small purchases.

**How to compare two months**
1. Choose the later month in the month switch.
2. Each category shows that month (dark) against the month before (light).

**How to check this month so far**
1. Click the month marked **(so far)**.

## 5. How the numbers are worked out

| Figure | Source |
|---|---|
| Category totals | Sum of expense transactions in each category for the month |
| Essential / non-essential | Based on each category's essential flag ([Core concepts §4](01-core-concepts.md#4-categories)) |
| Change | This month's category total − last month's |
| Weekend share | Flexible spending on Sat/Sun ÷ all flexible spending |

Transfers to savings and income aren't counted as spending.

## 6. Empty and special states

| Situation | What you see |
|---|---|
| No expenses recorded | "No spending recorded yet" with **Add transactions** |
| Only one month of data | No comparison bars or change figures |
| Fewer than 2 complete months | The chart shows "The chart appears once you have two complete months." |

## 7. Links to other pages

| From this page | Goes to | Why |
|---|---|---|
| Empty state button | Transactions | Add data |
| *(arrive from)* Overview, Insights | — | "Spending analysis →" and "See spending by category" links |

## 8. Tips and FAQ

- **Why doesn't the page open on this month?** A partial month always looks cheaper. Complete months give a fair comparison.
- **Why is rent missing from "Largest one-off"?** Rent and regular bills are left out so the pattern shows choices you actually make.
- **Is "Gifts" essential?** No. Only rent, bills, EMI, insurance, education, family support, groceries, transport and health are essential.
