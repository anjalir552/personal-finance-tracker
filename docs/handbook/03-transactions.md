# Transactions

> **The question this page answers:** "What came in and what went out, and can I find it again?"

## 1. At a glance

| | |
|---|---|
| **Where to find it** | Sidebar → Track → Transactions |
| **Web address** | `#/transactions` |
| **Use it when** | You want to record income or spending, fix an entry, or look something up |
| **Main actions** | **Add transaction**, edit, delete, **Export CSV** |
| **Saves data?** | Yes. Adds, edits and deletes transactions |

## 2. Page layout

1. **Header:** title, explanation, **Export CSV** and **Add transaction**
2. **Summary strip:** Money in, Money out, Moved to savings for the current filter
3. **Toolbar:** search, type switch, **Filters** button (on small screens), month, category and payment method
4. **Transaction table:** grouped by day, newest first
5. **Footer:** "Showing X of Y transactions" and **Show more**

## 3. Features

### 3.1 Summary strip
- **What it does:** totals **Money in** (+, deep periwinkle), **Money out** and **Moved to savings** for everything that matches the current filters.
- **Good to know:** the label shows the month in view, for example "November 2026" or "All time".

### 3.2 Search
- **What it does:** finds transactions as you type, matching the description, category, payment method or note.
- **How to use it:** type in **Search, e.g. Swiggy**. Matching is not case-sensitive.

### 3.3 Type switch
- **What it does:** shows **All**, **Money in**, **Money out** or **Savings** (transfers to goals).

### 3.4 Filters
| Filter | Options | Default |
|---|---|---|
| **Month** | All months, or any month that has transactions | Current month |
| **Category** | All expense categories and income categories | All categories |
| **Payment method** | UPI, Debit card, Credit card, Net banking, Cash, Bank transfer, Auto-debit | Any payment method |

- **Good to know:** on phones the filters are hidden behind a **Filters** button. It shows how many filters are active ("Filters · 2"). A month other than the current one counts as active.

### 3.5 Transaction table
- **Columns:** Description (with category underneath), Category chip, Paid with, Amount, and actions.
- **Day headings:** "Today · Monday, 2 Nov 2026", "Yesterday · …" or the weekday and date.
- **Amount style:**
  | Type | Looks like |
  |---|---|
  | Income | `+₹60,000` in deep periwinkle |
  | Expense | `−₹386` |
  | Transfer to savings | `₹6,000`, with the subtitle "To savings goal" |
- **Show more:** loads **40 rows at a time**.
- **Good to know:** on small screens the category and method columns are hidden, and the method appears under the description instead.

### 3.6 Add / edit transaction form
| Field | Notes |
|---|---|
| **Money out / Money in** | Switching changes the category list (expense categories or income categories) |
| **Description** | Required |
| **Amount** | Required, above zero, ₹ formatted |
| **Date** | Defaults to today. Future dates aren't allowed |
| **Category** | Defaults to Food & dining (out) or Salary (in) |
| **Paid with** | Defaults to UPI |
| **Note** | Optional, and searchable |

- **How to use it:** click **Add transaction** (or the ✎ icon on a row), fill it in, then click **Add transaction** / **Save changes**. Pressing Enter also submits.
- **Good to know:** if the description or amount is missing, an error appears under the field and the cursor jumps there.

### 3.7 Delete
- **How to use it:** click the 🗑 icon, then **Delete** in the confirmation.
- **Good to know:** the confirmation reminds you that your balance will change.

### 3.8 Savings transfers are protected
- Transfers to goals have **no edit button**. If you try to edit one, a message says "Savings transfers are managed from Savings Goals." You can still delete a transfer.

### 3.9 Export CSV
- **What it does:** downloads `scopewise-transactions.csv` with **only the rows that match your current filters**.
- **Columns:** Date, Type, Description, Category, Payment method, Amount (INR), Note. Money out is negative.

## 4. Step-by-step tasks

**How to record your salary**
1. Click **Add transaction**, then choose **Money in**.
2. Description "Salary", amount, category **Salary**, method **Bank transfer**.
3. Click **Add transaction**.

**How to find everything you spent on Swiggy in October**
1. Set **Month** to October 2026.
2. Type "Swiggy" in search.
3. Read **Money out** in the summary strip.

**How to export a month for your records**
1. Choose the month (and any other filters).
2. Click **Export CSV**.

**How to clear filters when nothing shows**
1. Click **Clear filters** in the empty message. This resets to all months, all types and an empty search.

## 5. How the numbers are worked out

| Figure | Source |
|---|---|
| Money in / out / moved to savings | Sum of the filtered rows by type |
| Your balance (used everywhere) | Opening balance + income − expenses − transfers |
| "Showing X of Y" | Rows displayed vs rows that match the filters |

Every other page reads from this list, so an edit here changes figures across the app.

## 6. Empty and special states

| Situation | What you see |
|---|---|
| No transactions at all | "No transactions yet" with **Add your first transaction** |
| Filters match nothing | "Nothing matches these filters" with **Clear filters** |

## 7. Links to other pages

| From this page | Goes to | Why |
|---|---|---|
| Add form | *(also opened from Overview)* | Quick logging |
| Editing a transfer | Savings Goals | Transfers are managed there |
| Marked-paid bills | *(arrive from Upcoming Expenses)* | **Mark paid** creates an expense here |

## 8. Tips and FAQ

- **I marked a bill paid but the real amount was different.** Edit the new transaction here. It's dated today, with the bill's name.
- **Do filters stay when I leave the page?** Yes, while the tab is open. Reloading resets them.
- **Can I add future transactions?** No. Plan future costs in [Upcoming Expenses](07-upcoming-expenses.md).
