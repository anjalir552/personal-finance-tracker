# Overview

> **The question this page answers:** "How much of my money is actually free until payday?"

## 1. At a glance

| | |
|---|---|
| **Where to find it** | Sidebar → Overview (top item), or click the Scopewise logo |
| **Web address** | `#/overview` (also the default page) |
| **Use it when** | You open the app and want a quick picture of where you stand |
| **Main actions** | **Add transaction**, **Can I afford this?** |
| **Saves data?** | Only through the Add transaction form. Everything else is read-only |

## 2. Page layout

1. **Header:** the title, a one-line summary of the next 7 days, and two buttons
2. **Money map card:** free to spend, available balance, the money bar and four layer figures
3. **Coming up** (left) and **Savings progress** (right)
4. **Last month at a glance** (left) and **Worth knowing** (right)

On a brand-new, empty account the page shows the **set-up checklist** instead (see section 6).

## 3. Features

### 3.1 Header summary
- **What it does:** tells you in one sentence what matters right now. It's one of:
  - "**₹X goes out in the next 7 days**, including rent and …" when bills are due within a week
  - "**Your plans need ₹X more than you have** before payday …" when free to spend is negative
  - "Nothing is due in the next 7 days …" otherwise
- **Good to know:** the two largest bills in the next 7 days are named.

### 3.2 Add transaction button
- **What it does:** opens the same **Add transaction** form as the Transactions page.
- **How to use it:** click **Add transaction**, fill in the form, then click **Add transaction** again. See [Transactions §3.6](03-transactions.md).

### 3.3 Can I afford this? button
- **What it does:** takes you to [Purchase Decisions](05-purchase-decisions.md). It's plum because it's the main action in the app.

### 3.4 Money map card
- **Free to spend until \<payday\>:** the big number. Below it: "About ₹X a day for the next N days".
- **Available balance:** what's in your bank today.
- **Money bar:** the coloured segments for upcoming, essentials, savings and free.
- **Four layer figures:**
  | Figure | Shows |
  |---|---|
  | Upcoming expenses | Total due before payday and how many items |
  | Everyday essentials | `~₹X`, an estimate for groceries, transport and health |
  | Savings to set aside | What goals still need this month and how many goals |
  | Free to spend | The amount per day |
- **Good to know:** a note under the card says essentials is a 3-month estimate.

### 3.5 Coming up
- **What it does:** lists the **next 5 upcoming expenses**, soonest first, each with a date chip, name, "In 3 days" style timing and amount.
- **Good to know:**
  - The date chip turns plum if the expense is due within 3 days.
  - "Overdue" shows in plum for missed items.
  - Estimates show `~` before the amount and "· estimate".
  - The panel figure (top right) is the total due before payday.
  - Footer link: **All upcoming expenses →**

### 3.6 Savings progress
- **What it does:** shows up to **3 active goals**, each with saved vs target, a progress bar and a status line ("On track for …" or "Needs ₹X more a month …").
- **Good to know:** a box at the bottom says how much has moved to savings this month and how much is still to set aside. The panel figure is the total saved across active goals. Footer link: **All savings goals →**

### 3.7 Last month at a glance
- **What it does:** summarises the most recent **complete** month.
  - **Money in**, **Spent**, **Saved**, each with a change arrow vs the month before. For Spent, a fall counts as good.
  - **Top 7 categories** as bars, with an essential/non-essential dot.
- **Good to know:** the subtitle shows the current month so far ("November so far: ₹X spent in 2 days"). Footer link: **Spending analysis →**

### 3.8 Worth knowing
- **What it does:** shows the top **3 insights** from [Financial Insights](08-financial-insights.md), each with a coloured dot, a title, two lines of text and a link.
- **Good to know:** the "due in the next 7 days" insight is left out here because the header already covers it. The footer shows the total number of insights and **All insights →**

## 4. Step-by-step tasks

**How to check what you can spend today**
1. Open Overview.
2. Read **Free to spend until \<payday\>** and the per-day amount below it.

**How to quickly log a purchase**
1. Click **Add transaction**.
2. Leave **Money out** selected, then type a description and amount.
3. Choose a category and payment method, then click **Add transaction**.
4. The money map updates straight away.

**How to finish setting up a new account**
1. Follow each step in **Set up your money picture**, using the link on each step.
2. The full Overview replaces the checklist as soon as you save your money setup in Settings, or add a transaction, goal or upcoming expense.

## 5. How the numbers are worked out

| Figure | Source |
|---|---|
| Free to spend, balance, layers, per day | The money map ([Core concepts §5](01-core-concepts.md#5-the-money-map-the-idea-behind-everything)) |
| Next 7 days total | Upcoming expenses due before payday **and** within 7 days of today |
| Money in / Spent / Saved | Sum of income, expense and transfer transactions in that month |
| Change arrows | (this month − last month) ÷ last month. Under 0.5% shows "No change" |
| Goal "Needs ₹X more a month" | Needed per month − planned per month, rounded up to ₹100 |
| "Moved to savings this month" | Transfers to active goals since the last payday |

## 6. Empty and special states

| Situation | What you see |
|---|---|
| **Brand-new account** (after Clear all data, before anything is saved or added) | **Set up your money picture** with a progress bar ("0 of 3 done") and three steps: *Add your balance and income* → Settings, *List what's coming up* → Upcoming Expenses, *Set a savings goal* → Savings Goals. Each step shows **Done** when completed |
| Free to spend is negative | The big number is shown as negative. The text says "Committed money is more than your balance" and the per-day figure shows "—" |
| No upcoming expenses | "Nothing planned yet" with an **Add an expense** button |
| No goals | "No savings goals yet" with a **Create a goal** button |
| No complete month yet | "Not enough history yet" |
| No insights | "Insights appear after a month" |

## 7. Links to other pages

| From this page | Goes to | Why |
|---|---|---|
| **Can I afford this?** | Purchase Decisions | Check a purchase |
| **All upcoming expenses →** | Upcoming Expenses | See or pay every bill |
| **All savings goals →** | Savings Goals | Manage goals |
| **Spending analysis →** | Spending Analysis | Break down spending |
| **All insights →** / insight links | Financial Insights and others | Read more |
| Set-up steps | Settings, Upcoming, Goals | First-time set-up |

## 8. Tips and FAQ

- **Why is free to spend lower than my bank balance?** Because rent, bills, your savings plan and everyday essentials until payday are already set aside.
- **Why does the essentials figure start with `~`?** It's an estimate from your last 3 months, not a fixed bill.
- **My salary arrived but free to spend didn't change.** Add the income as a transaction. Scopewise only counts income once it's recorded.
