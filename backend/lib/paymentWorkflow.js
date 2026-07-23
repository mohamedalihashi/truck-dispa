export function paymentSchedule({ amount, amountPaid = 0, deliveryConfirmedAt = null }) {
  const total = Number(amount || 0);
  const paid = Number(amountPaid || 0);
  const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
  const depositAmount = Math.round(total * 0.3 * 100) / 100;
  const completed = paid >= total - 0.01;
  const depositDue = paid <= 0 && !completed;
  const deliveryConfirmed = Boolean(deliveryConfirmedAt);
  return {
    depositAmount,
    balance,
    requiredAmount: completed ? 0 : depositDue ? depositAmount : deliveryConfirmed ? balance : 0,
    stage: completed ? "Completed" : depositDue ? "Deposit Due" : deliveryConfirmed ? "Balance Due" : "Awaiting Delivery Confirmation",
    canPay: !completed && (depositDue || deliveryConfirmed),
  };
}
