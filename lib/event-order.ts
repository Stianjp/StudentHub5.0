import { REGISTRATION_STUDENT_FIELDS } from "@/lib/event-registration-options";

export const ALL_STUDENT_FIELDS = "All study fields";
export const SHARED_AREA = "Flere fagområder";
export type EventAddon = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price_ore: number | null;
  is_active: boolean;
  sort_order: number;
  kind: "item" | "attendee_ticket";
};
export type OrderPackage = {
  id: string;
  public_name: string;
  price_ore?: number | null;
  included_quantities?: Record<string, number> | unknown;
};
export type OrderLine = {
  id: string;
  name: string;
  unit: string;
  included: number;
  extra: number;
  unitPriceOre: number;
  kind: "item" | "attendee_ticket";
};
export type OrderSnapshot = {
  version: 1;
  packageId: string;
  packageName: string;
  packagePriceOre: number;
  lines: OrderLine[];
  totalOre: number;
};
export function suggestArea(fields: string[]): string | null {
  const unique = [...new Set(fields)];
  if (unique.includes(ALL_STUDENT_FIELDS) || unique.length > 1)
    return SHARED_AREA;
  return unique.length === 1 && unique[0] !== "Other" ? unique[0] : null;
}
export function matchesStudentField(fields: string[], field: string) {
  return (
    !field || fields.includes(ALL_STUDENT_FIELDS) || fields.includes(field)
  );
}
export function validStudentFields(fields: string[]) {
  return (
    fields.length > 0 &&
    fields.every(
      (field) =>
        field === ALL_STUDENT_FIELDS ||
        (REGISTRATION_STUDENT_FIELDS as readonly string[]).includes(field),
    ) &&
    new Set(fields).size === fields.length &&
    (!fields.includes(ALL_STUDENT_FIELDS) || fields.length === 1)
  );
}
export function includedQuantities(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value);
  if (
    entries.some(
      ([, n]) =>
        typeof n !== "number" || !Number.isSafeInteger(n) || n < 0 || n > 10000,
    )
  )
    throw new Error("Invalid included quantities.");
  return Object.fromEntries(entries);
}
export function buildOrder(
  pkg: OrderPackage,
  addons: EventAddon[],
  quantities: Record<string, number>,
): OrderSnapshot {
  if (!Number.isSafeInteger(pkg.price_ore) || pkg.price_ore! < 0)
    throw new Error("This package has no valid price.");
  const included = includedQuantities(pkg.included_quantities);
  for (const [id, quantity] of Object.entries(quantities)) {
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 10000)
      throw new Error("Choose a valid quantity between 0 and 10000.");
    if (
      quantity > 0 &&
      !addons.some(
        (a) => a.id === id && a.is_active && a.unit_price_ore !== null,
      )
    )
      throw new Error("This add-on is no longer available.");
  }
  const lines = addons
    .filter(
      (a) =>
        (a.is_active && a.unit_price_ore !== null) || (included[a.id] ?? 0) > 0,
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => ({
      id: a.id,
      name: a.name,
      unit: a.unit,
      included: included[a.id] ?? 0,
      extra: quantities[a.id] ?? 0,
      unitPriceOre: a.unit_price_ore ?? 0,
      kind: a.kind,
    }));
  const totalOre =
    pkg.price_ore! +
    lines.reduce((sum, line) => sum + line.extra * line.unitPriceOre, 0);
  if (!Number.isSafeInteger(totalOre))
    throw new Error("Order total is too large.");
  return {
    version: 1,
    packageId: pkg.id,
    packageName: pkg.public_name,
    packagePriceOre: pkg.price_ore!,
    lines,
    totalOre,
  };
}
export function readOrder(value: unknown): OrderSnapshot | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1
  )
    return null;
  return value as OrderSnapshot;
}
export function formatNok(ore: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
  }).format(ore / 100);
}
export function orderTicketAllowance(order: OrderSnapshot) {
  return order.lines
    .filter((l) => l.kind === "attendee_ticket")
    .reduce((sum, l) => sum + l.included + l.extra, 0);
}
