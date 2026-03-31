export function nowIso(): string {
  return new Date().toISOString();
}

export function minutesAgo(minutes: number, from = new Date()): string {
  return new Date(from.getTime() - minutes * 60_000).toISOString();
}

