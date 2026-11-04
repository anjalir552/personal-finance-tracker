/* Settings: profile, money setup and data */
SW.pages = SW.pages || {};
(function () {
  const F = SW.fmt, S = SW.store, ui = SW.ui, I = SW.icon;

  function render() {
    const s = S.state.settings;
    const m = S.moneyMap();
    return `
      ${ui.pageHeader({ title: 'Settings', sub: 'The few numbers Scopewise needs to answer “can I afford this?”, and your data.' })}

      <section class="settings-sec" aria-labelledby="s-money">
        <div><h2 class="s-title" id="s-money">Money setup</h2>
          <p class="s-desc">Your balance, what comes in each month and when. These drive free to spend and every purchase check.</p>
          <p class="s-desc" style="margin-top:14px">Right now: <b class="num" style="color:var(--text)">${F.inr(m.free)}</b> free to spend until ${F.date(m.payday, false)}.</p></div>
        <form class="settings-panel" data-form="money" onsubmit="return false" novalidate>
          <div class="form-grid">
            <label class="field"><span class="field-label">Bank balance today</span>${ui.moneyInput('balance', Math.max(0, S.balance()))}<span class="field-hint">Updates your starting point; past transactions stay as they are.</span></label>
            <label class="field"><span class="field-label">Monthly income</span>${ui.moneyInput('monthlyIncome', s.monthlyIncome)}<span class="field-hint">Salary, stipend or pocket money, after tax.</span></label>
            <label class="field"><span class="field-label">Income usually arrives on</span><select class="select" name="payday">${Array.from({ length: 28 }, (_, i) => i + 1).map(d => `<option value="${d}" ${d === s.payday ? 'selected' : ''}>The ${d}${['th', 'st', 'nd', 'rd'][(d % 10 > 3 || [11, 12, 13].includes(d)) ? 0 : d % 10]} of each month</option>`).join('')}</select></label>
            <label class="field"><span class="field-label">Safety cushion</span>${ui.moneyInput('cushion', s.cushion)}<span class="field-hint">The least you want left before payday. Purchase checks protect it.</span></label>
          </div>
          <div class="foot"><button class="btn btn-primary btn-sm" data-save="money">Save money setup</button></div>
        </form>
      </section>

      <section class="settings-sec" aria-labelledby="s-profile">
        <div><h2 class="s-title" id="s-profile">About you</h2><p class="s-desc">Used to personalise wording. Nothing leaves this browser.</p></div>
        <form class="settings-panel" data-form="profile" onsubmit="return false">
          <div class="form-grid">
            <label class="field"><span class="field-label">Name</span><input class="input" name="name" value="${F.esc(s.name)}" placeholder="Your name" autocomplete="name" /></label>
            <label class="field"><span class="field-label">City <span class="opt">Optional</span></span><input class="input" name="city" value="${F.esc(s.city)}" placeholder="e.g. Pune" /></label>
            <label class="field span-2"><span class="field-label">Where are you right now?</span>
              <div class="type-toggle" style="grid-template-columns:repeat(3,minmax(0,1fr))" role="radiogroup" aria-label="Life stage">
                ${[['student', 'College student'], ['first-job', 'First job'], ['working', 'Working a while']].map(([v, l]) => `<label><input type="radio" name="stage" value="${v}" ${s.stage === v ? 'checked' : ''} /><span>${l}</span></label>`).join('')}
              </div></label>
            <label class="field"><span class="field-label">Default reminder</span><select class="select" name="remindDays">${[[0, 'On the day'], [1, '1 day before'], [2, '2 days before'], [3, '3 days before'], [7, 'A week before']].map(([v, l]) => `<option value="${v}" ${s.remindDays === v ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="field-hint">For new upcoming expenses.</span></label>
            <div class="field"><span class="field-label">Currency</span><span style="height:44px;display:flex;align-items:center;font-weight:500">Indian rupee (₹)</span></div>
          </div>
          <div class="foot"><button class="btn btn-primary btn-sm" data-save="profile">Save</button></div>
        </form>
      </section>

      <section class="settings-sec" aria-labelledby="s-data">
        <div><h2 class="s-title" id="s-data">Your data</h2><p class="s-desc">Everything is saved in this browser only. Export it any time.</p></div>
        <div class="settings-panel">
          <div class="data-row"><div><div class="t">Export everything</div><div class="d">Transactions, goals, upcoming expenses and settings as a JSON file.</div></div>
            <button class="btn btn-secondary btn-sm" data-action="export">${I('download', 15)}Export JSON</button></div>
          <div class="data-row"><div><div class="t">Start fresh</div><div class="d">Clear the example data and set up with your own numbers.</div></div>
            <button class="btn btn-danger btn-sm" data-action="clear">${I('trash', 15)}Clear all data</button></div>
          <div class="data-row"><div><div class="t">Restore the example</div><div class="d">Bring back the sample profile (Aarav, a first-job designer in Pune).</div></div>
            <button class="btn btn-secondary btn-sm" data-action="reset">${I('reset', 15)}Restore example</button></div>
        </div>
      </section>`;
  }

  function mount(root) {
    ui.bindMoney(root);
    ui.on(root, 'click', '[data-save]', (e, b) => {
      const s = S.state.settings;
      const d = ui.formData(root.querySelector(`[data-form="${b.dataset.save}"]`));
      if (b.dataset.save === 'money') {
        S.setBalance(ui.money(d.balance));
        s.monthlyIncome = ui.money(d.monthlyIncome);
        s.payday = +d.payday || 1;
        s.cushion = ui.money(d.cushion);
        S.state.isNew = false;
      } else {
        s.name = d.name.trim();
        s.city = d.city.trim();
        s.stage = d.stage || s.stage;
        s.remindDays = +d.remindDays;
      }
      S.save(); SW.refresh(); ui.toast('Settings saved');
    });
    ui.on(root, 'click', '[data-action="export"]', () => {
      const blob = new Blob([JSON.stringify(S.state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'scopewise-data.json';
      document.body.appendChild(a); a.click(); a.remove();
      ui.toast('Exported scopewise-data.json', 'download');
    });
    ui.on(root, 'click', '[data-action="clear"]', async () => {
      const ok = await ui.confirm({ title: 'Clear all data?', text: 'Transactions, goals, upcoming expenses and decisions will be deleted from this browser. Export first if you want a copy.', confirmLabel: 'Clear everything', danger: true });
      if (!ok) return;
      S.clear(); SW.go('#/overview'); ui.toast('All clear. Let’s set up your own numbers.');
    });
    ui.on(root, 'click', '[data-action="reset"]', async () => {
      const ok = await ui.confirm({ title: 'Restore the example?', text: 'Your current data will be replaced by the sample profile.', confirmLabel: 'Restore example' });
      if (!ok) return;
      S.reset(); SW.refresh(); ui.toast('Example data restored');
    });
  }

  SW.pages.settings = { render, mount };
})();
