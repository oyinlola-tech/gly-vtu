function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvSanitize(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(str)) return `'${str}`;
  return str;
}

export function toCsv(lines) {
  return (lines || [])
    .map((row) =>
      row
        .map((cell) => csvEscape(csvSanitize(cell)))
        .join(',')
    )
    .join('\n');
}

export function csvRow(...cells) {
  return cells;
}
