import { describe, expect, it } from "vitest";
import {
  DRIVER_TRIP_NEXT,
  cargoStatusFromTripStatus,
  validateTripStatusChange,
} from "../lib/tripStatus.js";

describe("driver trip status chain", () => {
  it("defines the forward-only driver path", () => {
    expect(DRIVER_TRIP_NEXT).toEqual({
      Assigned: "Accepted",
      Accepted: "Arrived Pickup",
      "Arrived Pickup": "Loaded",
      Loaded: "In Transit",
      "In Transit": "Delivered",
    });
  });

  it("allows each valid driver step", () => {
    for (const [from, to] of Object.entries(DRIVER_TRIP_NEXT)) {
      const needsProof = to === "Delivered";
      expect(
        validateTripStatusChange({
          currentStatus: from,
          nextStatus: to,
          role: "driver",
          hasDeliveryProof: needsProof,
        })
      ).toEqual({ ok: true });
    }
  });

  it("rejects skipping or going backwards", () => {
    const bad = validateTripStatusChange({
      currentStatus: "Assigned",
      nextStatus: "In Transit",
      role: "driver",
    });
    expect(bad.ok).toBe(false);
    expect(bad.status).toBe(400);
    expect(bad.message).toMatch(/Assigned to Accepted/);
  });

  it("requires POD before Delivered", () => {
    const noProof = validateTripStatusChange({
      currentStatus: "In Transit",
      nextStatus: "Delivered",
      role: "driver",
      hasDeliveryProof: false,
    });
    expect(noProof).toMatchObject({ ok: false, status: 400 });
    expect(noProof.message).toMatch(/proof of delivery/i);

    expect(
      validateTripStatusChange({
        currentStatus: "In Transit",
        nextStatus: "Delivered",
        role: "driver",
        hasDeliveryProof: true,
      })
    ).toEqual({ ok: true });
  });
});

describe("dispatcher trip status rules", () => {
  it("only allows Delayed or Cancelled", () => {
    expect(
      validateTripStatusChange({
        currentStatus: "In Transit",
        nextStatus: "Delayed",
        role: "dispatcher",
      })
    ).toEqual({ ok: true });

    expect(
      validateTripStatusChange({
        currentStatus: "In Transit",
        nextStatus: "Cancelled",
        role: "dispatcher",
      })
    ).toEqual({ ok: true });

    const blocked = validateTripStatusChange({
      currentStatus: "Accepted",
      nextStatus: "Loaded",
      role: "dispatcher",
    });
    expect(blocked).toMatchObject({ ok: false, status: 403 });
  });
});

describe("cargoStatusFromTripStatus", () => {
  it("maps Delayed to In Transit and passes other statuses through", () => {
    expect(cargoStatusFromTripStatus("Delayed")).toBe("In Transit");
    expect(cargoStatusFromTripStatus("Cancelled")).toBe("Cancelled");
    expect(cargoStatusFromTripStatus("Loaded")).toBe("Loaded");
  });
});
