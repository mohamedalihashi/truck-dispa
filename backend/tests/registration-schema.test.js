import { describe, expect, it } from "vitest";
import { registerSchema } from "../routes/auth.routes.js";

const password = "StrongPass1!";

describe("public registration validation", () => {
  it("accepts an individual customer", () => {
    const result = registerSchema.safeParse({
      name: "Customer One", email: "customer@example.com", phone: "+252610000001",
      password, role: "customer", customerProfile: { customerType: "Individual", city: "Mogadishu" },
    });
    expect(result.success).toBe(true);
  });

  it("requires business company fields", () => {
    const result = registerSchema.safeParse({
      name: "Business Owner", email: "business@example.com", phone: "+252610000002",
      password, role: "customer", customerProfile: { customerType: "Business", city: "Hargeisa" },
    });
    expect(result.success).toBe(false);
  });

  it("requires complete driver and truck data", () => {
    const result = registerSchema.safeParse({
      name: "Driver One", email: "driver@example.com", phone: "+252610000003", password, role: "driver",
      nationalIdNumber: "NID-1", driverLicense: "LIC-1", driverLicenseUrl: "https://cdn/lic.jpg",
      driverLicensePublicId: "lic", driverImageUrl: "https://cdn/profile.jpg", driverImagePublicId: "profile",
      truck: { truckNumber: "TR-1", plateNumber: "PL-1", capacity: "10 tons", truckType: "Flatbed",
        photoUrl1: "https://cdn/1.jpg", photoUrl2: "https://cdn/2.jpg", photoPublicId1: "one", photoPublicId2: "two",
        registrationDocumentUrl: "https://cdn/doc.pdf", registrationDocumentPublicId: "doc" },
    });
    expect(result.success).toBe(true);
  });

  it.each(["admin", "dispatcher"])("forbids public %s registration", (role) => {
    expect(registerSchema.safeParse({ name: "Blocked User", email: `${role}@example.com`, phone: "+252610009999", password, role }).success).toBe(false);
  });
});
