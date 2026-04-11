import type { SensorReading } from './api';

const RANGE_HOURS: Record<string, number> = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };

export function fromISO(range: string): string {
	const hours = RANGE_HOURS[range] ?? 24;
	return new Date(Date.now() - hours * 3_600_000).toISOString();
}

export function fmtVal(r: SensorReading | null, key: keyof SensorReading, dec = 1): string {
	if (!r) return '—';
	const v = r[key];
	return typeof v === 'number' ? v.toFixed(dec) : '—';
}

export function fmtLabel(t: string, range: string): string {
	const d = new Date(t);
	if (range === '7d') {
		return (
			d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
			' ' +
			d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		);
	}
	return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
