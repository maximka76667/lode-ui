import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fromISO, fmtVal, fmtLabel } from './utils';
import type { SensorReading } from './api';

const FIXED_NOW = new Date('2026-04-11T12:00:00.000Z').getTime();

const reading: SensorReading = {
	id: 1,
	temperature_c: 23.456,
	humidity_pct: 58.1,
	pressure_hpa: 1013.25,
	recorded_at: '2026-04-11T11:00:00.000Z'
};

// ── fromISO ──────────────────────────────────────────────────────────────────

describe('fromISO', () => {
	beforeEach(() => vi.setSystemTime(FIXED_NOW));
	afterEach(() => vi.useRealTimers());

	it('returns a valid ISO string', () => {
		expect(() => new Date(fromISO('24h'))).not.toThrow();
		expect(fromISO('24h')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('24h → exactly 24 hours before now', () => {
		const result = new Date(fromISO('24h')).getTime();
		expect(result).toBe(FIXED_NOW - 24 * 3_600_000);
	});

	it('7d → exactly 168 hours before now', () => {
		const result = new Date(fromISO('7d')).getTime();
		expect(result).toBe(FIXED_NOW - 168 * 3_600_000);
	});

	it('unknown range falls back to 24h', () => {
		const result = new Date(fromISO('banana')).getTime();
		expect(result).toBe(FIXED_NOW - 24 * 3_600_000);
	});
});

// ── fmtVal ───────────────────────────────────────────────────────────────────

describe('fmtVal', () => {
	it('returns — for null reading', () => {
		expect(fmtVal(null, 'temperature_c')).toBe('—');
	});

	it('formats temperature to 1 decimal by default', () => {
		expect(fmtVal(reading, 'temperature_c')).toBe('23.5');
	});

	it('formats pressure to 2 decimals when asked', () => {
		expect(fmtVal(reading, 'pressure_hpa', 2)).toBe('1013.25');
	});

	it('returns — for non-numeric field (id is number, recorded_at is string)', () => {
		expect(fmtVal(reading, 'recorded_at')).toBe('—');
	});
});

// ── fmtLabel ─────────────────────────────────────────────────────────────────

describe('fmtLabel', () => {
	const ts = '2026-04-11T14:30:00.000Z';

	it('24h range returns a time string (HH:MM)', () => {
		const label = fmtLabel(ts, '24h');
		expect(label).toMatch(/^\d{1,2}:\d{2}/);
		// should not contain a date part like "Apr 11"
		expect(label).not.toMatch(/[A-Z][a-z]{2}\s\d/);
	});

	it('7d range includes a month+day prefix', () => {
		const label = fmtLabel(ts, '7d');
		// e.g. "Apr 11 14:30" — has a letter-then-space-then-digit pattern
		expect(label).toMatch(/[A-Z][a-z]{2}\s\d/);
	});

	it('7d and 24h produce different formats for the same timestamp', () => {
		expect(fmtLabel(ts, '7d')).not.toBe(fmtLabel(ts, '24h'));
	});
});
