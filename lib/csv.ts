export function toCsv<T extends Record<string, unknown>>(rows: T[]) {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value).replace(/"/g, '""');
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue}"`;
    }
    return stringValue;
  };

  const lines = [headers.join(",")];

  rows.forEach((row) => {
    const line = headers.map((header) => escape(row[header])).join(",");
    lines.push(line);
  });

  return lines.join("\n");
}
