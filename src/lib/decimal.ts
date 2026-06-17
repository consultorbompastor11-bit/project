import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function formatCurrency(value: Decimal | number): string {
  const num = value instanceof Decimal ? value.toNumber() : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function parseToDecimal(value: string | number): Decimal {
  return new Decimal(value);
}

export function sumDecimals(values: (Decimal | number)[]): Decimal {
  return values.reduce<Decimal>(
    (sum, value) => sum.plus(value instanceof Decimal ? value : new Decimal(value)),
    new Decimal(0)
  );
}

export { Decimal };
