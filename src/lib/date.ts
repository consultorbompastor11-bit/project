export const TIMEZONE = 'America/Sao_Paulo';

export function nowUTC(): Date {
  return new Date();
}

export function formatToBrazil(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTimeToBrazil(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function startOfMonth(date: Date = new Date()): Date {
  const d = new Date(date);
  const saoPauloDate = new Date(d.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return new Date(saoPauloDate.getFullYear(), saoPauloDate.getMonth(), 1);
}

export function endOfMonth(date: Date = new Date()): Date {
  const d = new Date(date);
  const saoPauloDate = new Date(d.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return new Date(saoPauloDate.getFullYear(), saoPauloDate.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getCurrentMonthYear(): string {
  const now = new Date();
  const saoPauloDate = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const year = saoPauloDate.getFullYear();
  const month = String(saoPauloDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getCurrentMonthYearDisplay(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: TIMEZONE,
    month: 'long',
    year: 'numeric',
  });
}

export function getCurrentMonthIndex(): number {
  const now = new Date();
  const saoPauloDate = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return saoPauloDate.getMonth();
}
