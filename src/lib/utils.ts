import type { SensorReading } from './api';

const RANGE_MS: Record<string, number> = {
	'5m': 5 * 60_000,
	'20m': 20 * 60_000,
	'1h': 60 * 60_000,
	'5h': 5 * 60 * 60_000,
	'1d': 24 * 60 * 60_000,
	'2d': 2 * 24 * 60 * 60_000,
	'5d': 5 * 24 * 60 * 60_000,
	'1w': 7 * 24 * 60 * 60_000
};

export function fromISO(range: string): string {
	const ms = RANGE_MS[range] ?? 60 * 60_000;
	return new Date(Date.now() - ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function fmtVal(r: SensorReading | null, key: keyof SensorReading, dec = 1): string {
	if (!r) return '—';
	const v = r[key];
	return typeof v === 'number' ? v.toFixed(dec) : '—';
}

export function fmtLabel(t: string, range: string): string {
	const d = new Date(t);
	if (range === '5m' || range === '20m') {
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}
	if (range === '1d' || range === '2d' || range === '5d' || range === '1w') {
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
	return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
