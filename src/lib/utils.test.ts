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
		expect(() => new Date(fromISO('1h'))).not.toThrow();
		expect(fromISO('1h')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('5m → exactly 5 minutes before now', () => {
		const result = new Date(fromISO('5m')).getTime();
		expect(result).toBe(FIXED_NOW - 5 * 60_000);
	});

	it('20m → exactly 20 minutes before now', () => {
		const result = new Date(fromISO('20m')).getTime();
		expect(result).toBe(FIXED_NOW - 20 * 60_000);
	});

	it('1h → exactly 1 hour before now', () => {
		const result = new Date(fromISO('1h')).getTime();
		expect(result).toBe(FIXED_NOW - 60 * 60_000);
	});

	it('5h → exactly 5 hours before now', () => {
		const result = new Date(fromISO('5h')).getTime();
		expect(result).toBe(FIXED_NOW - 5 * 60 * 60_000);
	});

	it('unknown range falls back to 1h', () => {
		const result = new Date(fromISO('banana')).getTime();
		expect(result).toBe(FIXED_NOW - 60 * 60_000);
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
	const ts = '2026-04-11T14:30:45.000Z';

	it('1h range returns HH:MM format', () => {
		const label = fmtLabel(ts, '1h');
		expect(label).toMatch(/^\d{1,2}:\d{2}/);
		expect(label).not.toMatch(/[A-Z][a-z]{2}\s\d/);
	});

	it('5h range returns HH:MM format', () => {
		const label = fmtLabel(ts, '5h');
		expect(label).toMatch(/^\d{1,2}:\d{2}/);
	});

	it('5m range returns HH:MM:SS format', () => {
		const label = fmtLabel(ts, '5m');
		expect(label).toMatch(/^\d{1,2}:\d{2}:\d{2}/);
	});

	it('20m range returns HH:MM:SS format', () => {
		const label = fmtLabel(ts, '20m');
		expect(label).toMatch(/^\d{1,2}:\d{2}:\d{2}/);
	});

	it('5m and 1h produce different formats for the same timestamp', () => {
		expect(fmtLabel(ts, '5m').length).toBeGreaterThan(fmtLabel(ts, '1h').length);
	});
});
