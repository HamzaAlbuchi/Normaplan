/** Always 2 decimal places with unit — never render raw floats from the rule engine. */
export function fmt(val: number, unit: string): string {
  return `${val.toFixed(2)} ${unit}`;
}
