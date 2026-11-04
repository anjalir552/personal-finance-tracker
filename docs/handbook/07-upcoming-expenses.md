# Upcoming Expenses

> **The question this page answers:** "What is my money already needed for, and when?"

## 1. At a glance

| | |
|---|---|
| **Where to find it** | Sidebar → Plan & decide → Upcoming Expenses. A plum count shows how many are due in the next 3 days (overdue ones included) |
| **Web address** | `#/upcoming` |
| **Use it when** | You set up regular bills, plan a one-off cost, pay something, or look ahead at a month |
| **Main actions** | **Add expense**, **Mark paid**, edit, delete |
| **Saves data?** | Yes. Upcoming expenses, plus an expense transaction when marked paid |

## 2. Page layout

The calendar is the page.

1. **Header:** what's overdue or due in the next 7 days, and **Add expense**
2. **Month summary:** three figures for the month on screen: **Still to pay** (large), **Overdue** and **Paid**
3. **Calendar** (left, most of the width): the month name with its total, **Today** and previous/next buttons, the day grid with up to two payments per day, a **Week** column with each week's total still to pay (or paid), and a key
4. **Selected day** (right): the date and the day's total, then every payment on that day with **Mark paid**, edit and delete
5. **Next payments** (right, under the selected day): the next five payments, whichever month is on screen
6. **Scheduled and recurring:** a table of every planned expense (recurring first, then one-time) with how it repeats, next due date, amount and monthly cost, plus edit and delete. Clicking a name jumps the calendar to its next due date
7. **Explanation note** about recurring expenses

## 3. Features

### 3.1 Header summary
- When something is overdue: "**₹1,200 is overdue**: Society maintenance was due 31 Oct. Another ₹X is due in the next 7 days." The overdue part is in orange.
- Otherwise: "**₹X is due in the next 7 days** across N payments. Money for these isn't counted as free to spend."
- If nothing is due soon: "Nothing is due in the next 7 days…"

### 3.2 Month summary
| Figure | Shows |
|---|---|
| **Still to pay in \<Month\>** | Payments due later this month, and how many (overdue ones are counted separately) |
| **Overdue** (orange dot) | Payments whose date has passed without being paid. In the current month this includes items **carried over** from earlier months. Orange when there are any, or "Nothing late" |
| **Paid** (filled blue dot) | Payments already made for this month |

- The month's full total ("₹X across N payments") sits next to the month name above the calendar. The average monthly cost of recurring expenses is under **Scheduled and recurring**.

### 3.3 The calendar
- **What it does:** shows one month as a grid, Monday to Sunday. Weekends are lightly shaded.
- **Each day shows:**
  - The date number. **Today** has a dark filled date number; the selected day is shaded powder blue.
  - The day's total (for example ₹4k), top right. Grey when everything that day is paid, orange when something is overdue.
  - Up to two payments by name, each with its status mark, and "+N more" if there are others.

| Mark | Status | How the label looks |
|---|---|---|
| Filled blue dot | **Paid** | Name in grey |
| Hollow ring | **Upcoming** | Name in dark grey |
| Orange dot | **Overdue** | Orange dot, and the day total in orange |

- **The selected day** is pale blue with a blue outline.
- **The key** under the grid explains the three marks and today.
- **Good to know:** shape and colour both differ, so the marks still read if you can't tell the colours apart.

### 3.4 Moving around the calendar
| To | Do this |
|---|---|
| Pick a day | Click it |
| Go to the previous or next month | The **‹** and **›** buttons. The same day number stays selected (or the month's last day if it's shorter) |
| Come back to today | **Today** (greyed out when today is already selected) |
| Move one day or one week | Arrow keys. Moving past the first or last day switches month |
| Jump to the first or last day of the month | **Home** / **End** |
| Previous or next month | **Page Up** / **Page Down** |
| Jump to a payment | Click it in **Next payments** |

### 3.5 Selected day panel
- **Header:** the full date (for example "Tuesday, 3 November"), "Today" or how far away it is, the number of payments and the day's total.
- **Each payment shows:** its mark, name, state, category and how often it repeats, and the amount (`~` in front if it's an estimate).

| State | Means |
|---|---|
| **Paid** / **Paid on 1 Nov** | Paid. The second form appears when you paid on a different day from the due date |
| **2 days late** | Overdue, in orange |
| **Today** / **Tomorrow** / **In 3 days** | Upcoming |

| Status | Actions |
|---|---|
| Paid | **View** (opens Transactions) |
| Unpaid, next one due | **Mark paid** (solid orange if overdue), ✎ edit, 🗑 delete |
| Unpaid, a later repeat | "Pay the \<date\> one first", ✎ edit, 🗑 delete |

- **Add an expense on \<date\>:** at the bottom of the panel. Opens the form with that due date.
- If the day is empty: "Nothing is due on this day."

### 3.6 Next payments
- **What it does:** lists your next five unpaid payments in date order, including anything overdue. The heading note says how much is due before payday.
- **Each row shows:** the date (orange if overdue), name, "Overdue since \<date\>" or how far away it is, and the amount.
- **How to use it:** click a row to jump the calendar to that day.
- **Good to know:** if there are more, it says "N more scheduled after \<date\>".

### 3.7 Add / edit expense form
| Field | Options / notes |
|---|---|
| **Title** | Required |
| **Amount** | Required, above zero |
| **Due date** | The selected day if it's today or later, otherwise 7 days from today |
| **Category** | Any category. Defaults to Utilities & bills |
| **Repeats** | One-time, month, year. Defaults to month |
| **More options** → **Remind me** | No reminder, On the day, 1, 2 or 3 days before, A week before. Defaults to your setting in Settings |
| **More options** → **Pay with** | Any payment method |
| **More options** → **The amount is an estimate** | A switch |

- **Good to know:** editing a repeating expense changes this and every future repeat. After saving, the calendar jumps to the due date.

### 3.8 Mark paid
- **What it does:** records the expense in **Transactions** for today, then:
  - **Monthly/yearly:** moves the due date forward one month or year (keeping the same day, or the month's last day if shorter).
  - **One-time:** removes it from the scheduled list. It stays on the calendar as paid.
- **How to use it:** click **Mark paid**, read the confirmation (it tells you the next due date), then click **Mark paid**.
- **Good to know:** only the **next** occurrence of a repeating expense can be marked paid. Later months show "Pay the \<date\> one first". For estimates, the confirmation reminds you to edit the transaction if the final amount was different.

### 3.9 Delete
- Removes the expense and **all future repeats**. Past payments stay in Transactions and on the calendar as paid.

## 4. Step-by-step tasks

**How to add your rent**
1. Click the day rent is next due, then click **Add expense** (or **Add an expense on \<date\>**).
2. Title "Rent", amount, **Repeats: month**, category **Rent**.
3. Under **More options**, choose a reminder, such as **2 days before**.
4. Click **Add expense**.

**How to plan a one-off cost (for example, Diwali gifts)**
1. Click **Add expense**, then choose **One-time**.
2. Enter your best guess, open **More options** and switch on **The amount is an estimate**.
3. Click **Add expense**. This money is now kept out of free to spend.

**How to pay a bill**
1. Click its day on the calendar (or its row in **Next payments**).
2. Click **Mark paid** and confirm. If the real amount differed, edit the new transaction in Transactions.

**How to clear an overdue payment**
1. Look for the orange dot, or the orange **Overdue** figure in the summary.
2. Click the item in **Next payments** to jump to its day.
3. Click the orange **Mark paid**.

**How to see what next month looks like**
1. Click **›** or press **Page Down**.
2. Read the month summary, then click a busy day for the details.

## 5. How the numbers are worked out

| Figure | Source |
|---|---|
| **Paid** | Expense transactions linked to an upcoming expense. A transaction counts if it was made with **Mark paid**, or if its description matches an upcoming expense's name exactly. It's placed on the date it was due (or the date paid, if no due date was recorded) |
| **Upcoming** | Scheduled expenses due today or later. Repeating ones are projected forward month by month (or year by year) from their next due date |
| **Overdue** | A scheduled date earlier than today that hasn't been paid |
| **Carried over** | In the current month, unpaid expenses due before the 1st. They count in **Overdue** and the total, but sit on their original date |
| **\<Month\> total** | Paid + still to pay + overdue for the month |
| **% paid** | Paid ÷ total |
| **Recurring costs average** | Monthly amounts + (yearly amounts ÷ 12) |
| **Due before payday** (Next payments) | Sum of expenses due before the next payday, including overdue ones. This is the **Upcoming expenses** layer of the money map |
| **Next 7 days** (header) | Expenses due from today to today + 7 days |

## 6. Empty and special states

| Situation | What you see |
|---|---|
| No expenses at all | An empty calendar, ₹0 figures and no **Next payments** panel. Use **Add expense** to start |
| A day with nothing due | "Nothing is due on this day." |
| Nothing overdue | **Overdue** shows ₹0 and "Nothing late" |
| Something overdue | Orange header line, orange **Overdue** figure, an orange dot on the day and the late payment first in **Next payments** |
| A month with no payments | ₹0 total and an empty grid |
| On a phone | Days show coloured dots (up to four) instead of names and totals. An overdue day's date number turns orange. Tap the day to see the details |

The example data includes an overdue item, **Society maintenance (my share)**, ₹1,200 a month, due 31 Oct 2026. In November it appears as "1 payment carried over", and its 30 Nov repeat shows "Pay the 31 Oct one first".

## 7. Links to other pages

| From this page | Goes to | Why |
|---|---|---|
| **Mark paid** | Transactions | Creates an expense row |
| **View** (on a paid item) | Transactions | See or edit the payment |
| *(arrive from)* Overview, Insights, set-up checklist | — | "All upcoming expenses →", "View upcoming expenses" |

## 8. Tips and FAQ

- **Why does a monthly bill appear in every month?** Repeating expenses are projected forward so you can see what's ahead. Only the next one can be marked paid.
- **I paid a bill but it doesn't show as paid.** Use **Mark paid**, or make sure the transaction's description matches the expense's title exactly.
- **What does "carried over" mean?** Something from an earlier month is still unpaid. It's counted in this month's **Overdue** until you pay it.
- **Should I add my credit-card bill?** Yes. Purchase checks only count it if it's here.
- **What does the plum number in the sidebar mean?** The number of expenses due within the next 3 days, including overdue ones. The sidebar keeps the app's main colours, so it's plum rather than orange.
