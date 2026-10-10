import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, resetSchema, safeNext } from "@/features/auth/schemas";
import { fieldSchema, soilSchema, farmSchema } from "@/features/farms/schemas";

const t = (k: string) => k;

describe("auth schemas", () => {
  it("login requires a valid email and password", () => {
    const r = loginSchema(t).safeParse({ email: "nope", password: "" });
    expect(r.success).toBe(false);
    expect(loginSchema(t).safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
  it("register enforces 10..128 password", () => {
    expect(registerSchema(t).safeParse({ email: "a@b.co", password: "123456789" }).success).toBe(false);
    expect(registerSchema(t).safeParse({ email: "a@b.co", password: "1234567890" }).success).toBe(true);
    expect(registerSchema(t).safeParse({ email: "a@b.co", password: "x".repeat(129) }).success).toBe(false);
  });
  it("reset requires matching passwords", () => {
    const r = resetSchema(t).safeParse({ newPassword: "1234567890", confirm: "other" });
    expect(r.success).toBe(false);
  });
  it("safeNext blocks open redirects", () => {
    expect(safeNext("//evil.com", "/overview")).toBe("/overview");
    expect(safeNext("https://evil.com", "/overview")).toBe("/overview");
    expect(safeNext("/crop-advice?x=1", "/overview")).toBe("/crop-advice?x=1");
  });
});

describe("farm/field/soil schemas", () => {
  it("field needs positive area; soil is never part of it", () => {
    expect(fieldSchema(t).safeParse({ name: "F", areaAcres: "0" }).success).toBe(false);
    expect(fieldSchema(t).safeParse({ name: "F", areaAcres: "2.5" }).success).toBe(true);
    expect(Object.keys(fieldSchema(t).shape)).toEqual(["name", "areaAcres"]);
  });
  it("farm needs a district", () => {
    expect(farmSchema(t).safeParse({ name: "F", stateKey: "S", districtKey: "" }).success).toBe(false);
  });
  it("soil values are all optional but validated when given", () => {
    const empty = { nitrogen: "", phosphorus: "", potassium: "", ph: "", testedOn: "" };
    expect(soilSchema(t).safeParse(empty).success).toBe(true);
    expect(soilSchema(t).safeParse({ ...empty, ph: "11" }).success).toBe(false);
    expect(soilSchema(t).safeParse({ ...empty, nitrogen: "-1" }).success).toBe(false);
  });
});
