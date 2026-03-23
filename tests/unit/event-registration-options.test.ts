import { describe, it, expect } from "vitest";
import {
  REGISTRATION_STUDENT_FIELDS,
  REGISTRATION_STAND_NEEDS,
  REGISTRATION_LEVEL_OPTIONS,
  REGISTRATION_INVOICE_OPTIONS,
} from "@/lib/event-registration-options";

describe("REGISTRATION_STUDENT_FIELDS", () => {
  it("inneholder alle forventede engelske fagfelt", () => {
    expect(REGISTRATION_STUDENT_FIELDS).toContain("IT / Computer engineer");
    expect(REGISTRATION_STUDENT_FIELDS).toContain("Electrical engineer");
    expect(REGISTRATION_STUDENT_FIELDS).toContain("Mechanical engineer");
    expect(REGISTRATION_STUDENT_FIELDS).toContain("Construction engineer");
    expect(REGISTRATION_STUDENT_FIELDS).toContain("Economics and administration");
    expect(REGISTRATION_STUDENT_FIELDS).toContain("Human resources (HR)");
    expect(REGISTRATION_STUDENT_FIELDS).toContain("Management");
    expect(REGISTRATION_STUDENT_FIELDS).toContain("Biotechnology and Chemical Engineer");
    expect(REGISTRATION_STUDENT_FIELDS).toContain("Law");
    expect(REGISTRATION_STUDENT_FIELDS).toContain("Mathematical modelling");
    expect(REGISTRATION_STUDENT_FIELDS).toContain("Other");
  });

  it("inneholder ikke norske feltnavn", () => {
    expect(REGISTRATION_STUDENT_FIELDS).not.toContain("Bygg");
    expect(REGISTRATION_STUDENT_FIELDS).not.toContain("Data/IT");
    expect(REGISTRATION_STUDENT_FIELDS).not.toContain("Annet");
    expect(REGISTRATION_STUDENT_FIELDS).not.toContain("Maskin");
  });
});

describe("REGISTRATION_STAND_NEEDS", () => {
  it("inneholder forventede engelske verdier", () => {
    expect(REGISTRATION_STAND_NEEDS).toContain("Tables");
    expect(REGISTRATION_STAND_NEEDS).toContain("TV");
    expect(REGISTRATION_STAND_NEEDS).toContain("Food/snacks/drinks to serve the students");
    expect(REGISTRATION_STAND_NEEDS).toContain("Other");
  });

  it("inneholder ikke norske verdier", () => {
    expect(REGISTRATION_STAND_NEEDS).not.toContain("Bord");
    expect(REGISTRATION_STAND_NEEDS).not.toContain("Mat/snacks/drikke");
    expect(REGISTRATION_STAND_NEEDS).not.toContain("Annet");
  });
});

describe("REGISTRATION_LEVEL_OPTIONS", () => {
  it("inneholder bachelor, master og both", () => {
    const values = REGISTRATION_LEVEL_OPTIONS.map((o) => o.value);
    expect(values).toContain("bachelor");
    expect(values).toContain("master");
    expect(values).toContain("both");
  });
});

describe("REGISTRATION_INVOICE_OPTIONS", () => {
  it("inneholder ehf og email", () => {
    const values = REGISTRATION_INVOICE_OPTIONS.map((o) => o.value);
    expect(values).toContain("ehf");
    expect(values).toContain("email");
  });
});
