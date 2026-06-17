import { Decimal } from 'decimal.js';

export function sumSafe(values: number[]): number {
  return values.reduce((sum, val) => new Decimal(sum).plus(new Decimal(val)).toNumber(), 0);
}

export function divideSafe(a: number, b: number): number {
  if (b === 0) return 0;
  return new Decimal(a).dividedBy(new Decimal(b)).toNumber();
}

export function percentSafe(part: number, total: number): number {
  if (total === 0) return 0;
  return new Decimal(part).dividedBy(new Decimal(total)).times(100).toNumber();
}

export function multiplySafe(a: number, b: number): number {
  return new Decimal(a).times(new Decimal(b)).toNumber();
}

export function subtractSafe(a: number, b: number): number {
  return new Decimal(a).minus(new Decimal(b)).toNumber();
}

export function addSafe(a: number, b: number): number {
  return new Decimal(a).plus(new Decimal(b)).toNumber();
}

export function roundToCents(value: number): number {
  return new Decimal(value).toDecimalPlaces(2).toNumber();
}
