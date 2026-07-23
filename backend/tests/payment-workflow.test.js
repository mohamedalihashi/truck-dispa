import { describe, expect, it } from "vitest";
import { paymentSchedule } from "../lib/paymentWorkflow.js";

describe("30/70 cargo payment workflow", () => {
  it("requires exactly 30% before trip confirmation", () => {
    expect(paymentSchedule({ amount: 1000 })).toEqual({
      depositAmount: 300,
      balance: 1000,
      requiredAmount: 300,
      stage: "Deposit Due",
      canPay: true,
    });
  });

  it("locks the remaining 70% until delivery confirmation", () => {
    expect(paymentSchedule({ amount: 1000, amountPaid: 300 })).toMatchObject({
      balance: 700,
      requiredAmount: 0,
      stage: "Awaiting Delivery Confirmation",
      canPay: false,
    });
  });

  it("releases the 70% after confirmation and closes at full payment", () => {
    expect(paymentSchedule({ amount: 1000, amountPaid: 300, deliveryConfirmedAt: new Date() })).toMatchObject({
      requiredAmount: 700,
      stage: "Balance Due",
      canPay: true,
    });
    expect(paymentSchedule({ amount: 1000, amountPaid: 1000, deliveryConfirmedAt: new Date() })).toMatchObject({
      requiredAmount: 0,
      stage: "Completed",
      canPay: false,
    });
  });
});
