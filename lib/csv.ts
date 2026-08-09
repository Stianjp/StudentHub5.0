export function toCsv<T extends Record<string, unknown>>(rows: T[], headers?: string[]) {
  const resolvedHeaders = headers ?? (rows.length > 0 ? Object.keys(rows[0]) : []);
  if (resolvedHeaders.length === 0) return "";

  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value).replace(/"/g, '""');
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue}"`;
    }
    return stringValue;
  };

  const lines = [resolvedHeaders.join(",")];

  rows.forEach((row) => {
    const line = resolvedHeaders.map((header) => escape(row[header])).join(",");
    lines.push(line);
  });

  return lines.join("\n");
}
