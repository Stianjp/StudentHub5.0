import { describe, it, expect } from "vitest";
import {
  ALL_STUDENT_FIELDS,
  SHARED_AREA,
  buildOrder,
  matchesStudentField,
  orderTicketAllowance,
  suggestArea,
  validStudentFields,
  type EventAddon,
} from "@/lib/event-order";
import { campaignStatus, parseOsloDateTime } from "@/lib/event-dates";
const addon: EventAddon = {
  id: "table",
  event_id: "event",
  name: "Bord",
  unit: "stk",
  description: null,
  unit_price_ore: 12550,
  is_active: true,
  sort_order: 0,
  kind: "item",
};
const pkg = {
  id: "pkg",
  public_name: "Standard",
  price_ore: 2000000,
  included_quantities: { table: 2, ticket: 3 },
};
describe("event order", () => {
  it("charges only extra quantities and preserves included items", () => {
    const order = buildOrder(pkg, [addon], { table: 4 });
    expect(order.totalOre).toBe(2050200);
    expect(order.lines[0]).toMatchObject({ included: 2, extra: 4 });
  });
  it("does not sell unpriced or inactive extras", () => {
    for (const item of [
      { ...addon, is_active: false },
      { ...addon, unit_price_ore: null },
    ])
      expect(() => buildOrder(pkg, [item], { table: 1 })).toThrow("available");
  });
  it("allows an explicitly free extra", () =>
    expect(
      buildOrder(pkg, [{ ...addon, unit_price_ore: 0 }], { table: 3 }).totalOre,
    ).toBe(2000000));
  it("preserves included tickets when extra tickets are not on sale", () => {
    const order = buildOrder(
      pkg,
      [
        {
          ...addon,
          id: "ticket",
          kind: "attendee_ticket",
          is_active: false,
          unit_price_ore: null,
        },
      ],
      {},
    );
    expect(orderTicketAllowance(order)).toBe(3);
  });
  it("rejects unknown IDs and invalid quantities", () => {
    for (const quantity of [-1, 0.5, NaN, Infinity, 10001])
      expect(() => buildOrder(pkg, [addon], { table: quantity })).toThrow();
    expect(() => buildOrder(pkg, [addon], { other: 1 })).toThrow();
  });
  it("snapshot is independent of subsequent catalog changes", () => {
    const item = { ...addon };
    const order = buildOrder(pkg, [item], { table: 1 });
    item.unit_price_ore = 99000;
    item.name = "Ny pris";
    expect(order.lines[0].name).toBe("Bord");
    expect(order.lines[0].unitPriceOre).toBe(12550);
    expect(JSON.stringify(buildOrder(pkg, [item], { table: 1 }))).not.toBe(
      JSON.stringify(order),
    );
  });
});
describe("audience grouping", () => {
  it("suggests a subject for one field, shared for multiple fields, and no guessed area for Other", () => {
    expect(suggestArea(["IT / Computer engineer"])).toBe(
      "IT / Computer engineer",
    );
    expect(
      suggestArea([
        "IT / Computer engineer",
        "Construction engineer",
        "Electrical engineer",
      ]),
    ).toBe(SHARED_AREA);
    expect(suggestArea([ALL_STUDENT_FIELDS])).toBe(SHARED_AREA);
    expect(suggestArea(["Other"])).toBeNull();
  });
  it("filters across areas and matches all-fields companies", () => {
    expect(
      matchesStudentField(
        ["IT / Computer engineer", "Electrical engineer"],
        "Electrical engineer",
      ),
    ).toBe(true);
    expect(
      matchesStudentField([ALL_STUDENT_FIELDS], "Construction engineer"),
    ).toBe(true);
    expect(matchesStudentField(["Electrical engineer"], "Law")).toBe(false);
  });
  it("rejects mixed all-fields selection and arbitrary field names", () => {
    expect(validStudentFields([ALL_STUDENT_FIELDS])).toBe(true);
    expect(validStudentFields([ALL_STUDENT_FIELDS, "Law"])).toBe(false);
    expect(validStudentFields(["Unknown"])).toBe(false);
    expect(validStudentFields([])).toBe(false);
  });
});
describe("publication scheduling", () => {
  it("uses Oslo timezone with DST", () => {
    expect(parseOsloDateTime("2026-11-01T09:00")).toBe(
      "2026-11-01T08:00:00.000Z",
    );
    expect(parseOsloDateTime("2026-07-01T09:00")).toBe(
      "2026-07-01T07:00:00.000Z",
    );
    expect(() => parseOsloDateTime("2026-03-29T02:30")).toThrow();
    expect(parseOsloDateTime("")).toBeNull();
  });
  it("event deactivation overrides a published campaign", () => {
    const campaign = { is_published: true, opens_at: null, closes_at: null };
    expect(campaignStatus(false, campaign, 0)).toBe("Skjult");
    expect(campaignStatus(true, campaign, 0)).toBe("Åpen");
    expect(
      campaignStatus(true, { ...campaign, opens_at: "2026-11-01T00:00Z" }, 0),
    ).toBe("Planlagt åpning");
  });
});
