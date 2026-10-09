/**
 * Local wall-clock ISO 8601 timestamp with the machine's UTC offset, second precision
 * (ip-data-contract §8.1; SCHEMA §10.1 example `2026-10-09T14:03:12+05:30`).
 */
const p2 = (n: number) => String(n).padStart(2, "0");

export function localIso(d: Date = new Date()): string {
  const off = -d.getTimezoneOffset(); // minutes east of UTC
  const sign = off >= 0 ? "+" : "-";
  const a = Math.abs(off);
  return (
    `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` +
    `T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}` +
    `${sign}${p2(Math.floor(a / 60))}:${p2(a % 60)}`
  );
}
