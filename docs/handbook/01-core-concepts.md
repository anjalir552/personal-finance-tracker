# Core concepts

Read this chapter first. It explains the parts that every page shares.

## 1. The app layout

| Area | What it is |
|---|---|
| **Sidebar** (left) | The Scopewise logo, which links to Overview, a button to collapse it, plus all pages in three groups, your name and life stage at the bottom. Collapsed, it becomes a narrow icon rail with a tooltip for each item, and the page uses the freed width. Your choice is remembered; tablets start collapsed |
| **Top bar** (phones and small screens) | A ☰ menu button that opens the sidebar as a drawer. Tap outside it or press `Esc` to close it |
| **Main area** | The page you're on |
| **Pop-up windows** | Forms such as Add transaction or New goal, and "Are you sure?" confirmations. Close them with ✕, **Cancel**, `Esc` or by clicking outside |
| **Toasts** | Short messages at the bottom ("Goal created", "Settings saved") that disappear after about 3 seconds |

### Sidebar groups

| Group | Pages |
|---|---|
| *(top)* | Overview |
| **Track** | Transactions, Spending Analysis |
| **Plan & decide** | Purchase Decisions, Savings Goals, Upcoming Expenses, Financial Insights |
| *(bottom)* | Settings, plus your account card (name, stage, city), which also opens Settings |

**Badge on Upcoming Expenses:** a navy badge with a white number appears next to it when expenses are due **in the next 3 days**. It counts only things that need action.

### Web addresses

Each page has its own address after `#/`, for example `index.html#/goals`. You can bookmark a page or use the browser's back button. An unknown address opens Overview.

## 2. Where your data lives

- Everything is saved **in this browser only** (browser local storage, key `scopewise:personal:v1`). Nothing is sent to a server.
- Clearing your browser's site data deletes it. Use **Settings → Export JSON** to keep a copy.
- If the browser blocks storage (some private windows do), the app still works, but changes are lost when you close the tab.
- **"Today"** is fixed at **2 November 2026** in this version, so the example figures stay the same every time you open the app.

## 3. The four kinds of data

| Data | What it is | Managed on |
|---|---|---|
| **Transactions** | Every rupee in (income), out (expense) or moved to savings (transfer) | Transactions, Savings Goals, Upcoming Expenses (**Mark paid**) |
| **Upcoming expenses** | Bills and planned costs with a due date, either one-time, monthly or yearly | Upcoming Expenses |
| **Savings goals** | A target amount, a target date and a monthly plan | Savings Goals, Purchase Decisions (**Make it a goal**) |
| **Settings** | Balance, monthly income, payday, safety cushion, profile | Settings |

Past **purchase decisions** are also saved, on the Purchase Decisions page.

> **One rule:** every figure is calculated from these records. No total is typed in by hand, so the same number is identical on every page.

## 4. Categories

Every expense has a category. Each category is **essential** or **non-essential**, and has a **kind** that decides how Scopewise treats it.

| Kind | Meaning | Categories |
|---|---|---|
| **Bill** | Planned, usually tracked in Upcoming Expenses | Rent, Utilities & bills, Loan EMI, Insurance, Education, Family support *(essential)*; Subscriptions, Fitness *(non-essential)* |
| **Everyday** | Day-to-day essentials, estimated from your history | Groceries, Transport, Health |
| **Flexible** | Non-essential spending you choose day to day | Food & dining, Shopping, Entertainment, Personal care, Travel, Gifts, Other |

**Income categories:** Salary, Freelance, Pocket money, Scholarship, Refund, Other income.

**Payment methods:** UPI, Debit card, Credit card, Net banking, Cash, Bank transfer, Auto-debit.

In lists, a **filled dark grey dot** marks an essential category and a hollow dot marks a non-essential one.

## 5. The money map (the idea behind everything)

Scopewise splits your **bank balance today** into four layers, up to your next payday:

```
Available balance
 = Upcoming expenses   (bills due before payday)
 + Everyday essentials (estimated groceries, transport, health until payday)
 + Savings to set aside (what your goals still need this pay cycle)
 + Free to spend       (what's genuinely left)
```

| Layer | How it's calculated |
|---|---|
| **Upcoming expenses** | Sum of every upcoming expense due **before** the next payday, including overdue ones |
| **Everyday essentials** | Your average monthly spend on Groceries, Transport and Health over the **last 3 complete months**, scaled to the days left until payday |
| **Savings to set aside** | For each active goal: its monthly plan (or what's left of the target, if smaller) minus what you've already moved to it since the last payday |
| **Free to spend** | Balance − the three layers above. It can be negative |
| **Per day** | Free to spend ÷ days until payday |

The **money bar**, a horizontal coloured bar, shows these layers. It appears on Overview and Purchase Decisions.

### Pay cycle and payday

- **Payday** is the day of the month your income usually arrives (set in Settings, the 1st to the 28th).
- The **pay cycle** runs from the last payday to the next one.
- Income isn't counted until it arrives as a transaction.

### Balance

**Available balance** = opening balance + all income − all expenses − all transfers to savings, up to today. Changing "Bank balance today" in Settings adjusts the opening balance. Past transactions are never changed.

## 6. Colours and what they mean

One palette is used on every page.

| Colour | Meaning |
|---|---|
| **Navy** `#282E42` | All text and money figures, important icons, the one primary button on a screen (navy with white text), today's date, switches that are on, and the count badge on Upcoming Expenses in the sidebar |
| **Periwinkle** `#C4D6FF` | Selected states (the current page in the sidebar is a pale periwinkle pill with a navy label; the selected tab, month, plan or calendar day), focus rings, and the main data on each screen (free to spend, the current month's bars, goal progress, still to pay). Marks use the deeper `#4D73CF` and periwinkle text uses `#2D4789`. Positive figures, such as income `+₹60,000`, "on time" and **On track**, are deep periwinkle |
| **Lavender** `#B8C0FF` | Secondary accents: comparisons (such as last month's bars in Spending Analysis), the savings layer of the money bar, avatars and selected text |
| **Lilac** `#E7C6FF` | Used sparingly: the purchase you're weighing on Purchase Decisions, and anything that needs attention (overdue, due within 3 days, behind plan, past the deadline, a plan that's short, a big rise in a non-essential category). Marks use `#9C45AA` and lilac text uses `#7B2C88` |
| **White** `#FFFFFF` | Cards, panels and pop-up windows |
| **Pale periwinkle** `#E3EAFF` | The page background. The sidebar and the frame around the page use periwinkle `#C4D6FF` |

In the money bar, committed money is shown in navy steps: bills in dark navy and everyday essentials in a mid navy-grey. Savings are lavender and free to spend is periwinkle.

There's no red and green. Positive news is deep periwinkle, and anything that needs attention is lilac. Meaning is always carried by words and shapes too, never by colour alone.

## 7. Money inputs

Every ₹ field formats as you type with Indian digit grouping (typing `150000` shows `1,50,000`). Only digits are kept.

## 8. Glossary

| Term | Meaning |
|---|---|
| **Free to spend** | Money left after upcoming expenses, everyday essentials and this cycle's savings |
| **Safety cushion** | The least you want left in your account before payday. Purchase checks protect it |
| **Transfer** | Money moved from your balance to a savings goal. It lowers your available balance |
| **Typical month** | Monthly income − recurring bills − goal plans − average everyday essentials. It's used for "after payday" advice |
| **Flexible average** | Your average monthly spend on flexible categories over the last 3 complete months |
| **Complete month** | Any month before the current one that has at least one transaction |
| **Estimate** | An upcoming expense whose amount is a best guess (shown with `~`) |
