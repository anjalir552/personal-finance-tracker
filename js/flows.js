/* Shared workflows, opened from several pages:
   - Smart Financial Recovery: detect → explain → review → options → revised budget → goal impact → approve or reject
   - Emergency Expense Manager: record an unexpected expense and see its effect before saving it
   - Adaptive Budgeting: compare the current plan with one that matches how money is really spent
   - Budget editor: change the monthly allocation directly
   Nothing here changes the plan until the user approves; every figure comes from SW.store. */
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon;
  const SEED = SW.seed;
  const short = n => n.split(' · ')[0].replace(/\s*\(.*\)$/, '');
  const monthYear = k => (k ? `${S.monthName(k)} ${k.slice(0, 4)}` : 'No date');
  const delayText = r => {
    if (r.delay === 0) return '<span class="rc-delay same">No change</span>';
    if (r.delay == null || r.delay === Infinity) return '<span class="rc-delay late">No finish date</span>';
    if (r.delay < 0) return `<span class="rc-delay early">${-r.delay} month${r.delay === -1 ? '' : 's'} sooner</span>`;
    return `<span class="rc-delay late">${r.delay} month${r.delay === 1 ? '' : 's'} later</span>`;
  };

  /** Goal impact table, shared by recovery, adaptive budgeting and purchase decisions */
  function goalTable(rows, { caption = 'Effect on your savings goals', showTransfer = true, showSaved = false } = {}) {
    if (!rows.length) return '';
    return `<div class="table-wrap"><table class="table rc-goals">
      <caption class="sr-only">${caption}</caption>
      <thead><tr><th scope="col">Goal</th>${showTransfer ? '<th scope="col" class="r">This month’s transfer</th>' : ''}${showSaved ? '<th scope="col" class="r">Saved</th>' : ''}<th scope="col" class="r">Reaches target</th><th scope="col" class="r">Change</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <th scope="row" class="cell-title">${F.esc(r.g.name)}<span class="cell-sub">${F.inr(r.saved)} of ${F.inr(r.target)} · deadline ${F.date(r.deadline, true)}</span></th>
        ${showTransfer ? `<td class="r num">${r.monthlyAfter !== r.monthly ? `<s class="subtle">${F.inr(Math.max(0, r.monthly - S.goalTransferredThisMonth(r.g)))}</s> ${F.inr(Math.max(0, r.monthlyAfter - S.goalTransferredThisMonth(r.g)))}` : F.inr(Math.max(0, r.monthly - S.goalTransferredThisMonth(r.g)))}</td>` : ''}
        ${showSaved ? `<td class="r num">${r.savedAfter !== r.saved ? `<s class="subtle">${F.inr(r.saved)}</s> ${F.inr(r.savedAfter)}` : F.inr(r.saved)}</td>` : ''}
        <td class="r num">${r.after !== r.before ? `<s class="subtle">${monthYear(r.before)}</s> <b class="${r.lateAfter ? 'warn' : ''}">${monthYear(r.after)}</b>` : monthYear(r.before)}${r.lateAfter && !r.lateBefore ? '<span class="cell-sub warn">After the deadline</span>' : ''}</td>
        <td class="r">${delayText(r)}</td></tr>`).join('')}</tbody></table></div>`;
  }



  SW.flows = { goalTable, delayText };
})();
