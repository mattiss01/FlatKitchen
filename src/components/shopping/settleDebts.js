import { FLATMATES } from "../../lib/constants";

export default function settleDebts(expenses) {
  const balances = {};
  FLATMATES.forEach(f => { balances[f.name] = 0; });
  expenses.forEach(e => {
    const participants = (e.split_between && e.split_between.length > 0)
      ? e.split_between
      : FLATMATES.map(f => f.name);
    const share = e.amount / participants.length;
    balances[e.paid_by] = (balances[e.paid_by] || 0) + e.amount;
    participants.forEach(name => { balances[name] = (balances[name] || 0) - share; });
  });

  const debtors = FLATMATES.filter(f => balances[f.name] < -0.01).map(f => ({ name: f.name, amount: -balances[f.name] }));
  const creditors = FLATMATES.filter(f => balances[f.name] > 0.01).map(f => ({ name: f.name, amount: balances[f.name] }));
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0, j = 0;
  const d = debtors.map(x => ({ ...x }));
  const c = creditors.map(x => ({ ...x }));
  while (i < d.length && j < c.length) {
    const amt = Math.min(d[i].amount, c[j].amount);
    transactions.push({ from: d[i].name, to: c[j].name, amount: amt });
    d[i].amount -= amt;
    c[j].amount -= amt;
    if (d[i].amount < 0.01) i++;
    if (c[j].amount < 0.01) j++;
  }
  return { balances, transactions };
}
