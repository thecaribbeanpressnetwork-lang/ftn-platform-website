(() => {
  const output = document.getElementById('boss-debt-estimate');
  if (!output) return;

  const panel = output.closest('details');
  const earlierDebt = 148_375_900_000;
  const baselineDebt = 148_969_300_000;
  const earlierDate = Date.parse('2026-03-31T23:59:59-04:00');
  const baselineDate = Date.parse('2026-06-30T23:59:59-04:00');
  const expires = Date.parse('2027-01-01T00:00:00-04:00');
  const rate = (baselineDebt - earlierDebt) / (baselineDate - earlierDate);
  const format = new Intl.NumberFormat('en-TT');
  let timer;

  function render() {
    const now = Date.now();
    if (now >= expires || now < baselineDate) {
      output.textContent = now >= expires ? 'Awaiting updated source figures' : 'Estimate unavailable for this date';
      clearInterval(timer);
      return false;
    }
    const estimatedDebt = baselineDebt + (now - baselineDate) * rate;
    output.textContent = 'TT$' + format.format(Math.round(estimatedDebt / 100) * 100);
    return true;
  }

  function sync() {
    clearInterval(timer);
    if (panel.open && !document.hidden && render()) timer = setInterval(render, 1000);
  }

  panel.addEventListener('toggle', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
})();
