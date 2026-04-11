import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchReadings } from './api';

const mockReadings = [
	{
		id: 1,
		temperature_c: 22.5,
		humidity_pct: 55.0,
		pressure_hpa: 1012.0,
		recorded_at: '2026-04-11T10:00:00.000Z'
	}
];

beforeEach(() => {
	vi.restoreAllMocks();
});

function mockFetch(body: unknown, status = 200) {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue({
			ok: status >= 200 && status < 300,
			status,
			statusText: status === 200 ? 'OK' : 'Error',
			json: () => Promise.resolve(body)
		})
	);
}

// ── fetchReadings ─────────────────────────────────────────────────────────────

describe('fetchReadings', () => {
	it('calls /readings with no query params by default', async () => {
		mockFetch(mockReadings);
		await fetchReadings();
		const url = new URL((vi.mocked(fetch).mock.calls[0][0] as string));
		expect(url.pathname).toBe('/readings');
		expect([...url.searchParams.keys()]).toHaveLength(0);
	});

	it('appends from and limit when provided', async () => {
		mockFetch(mockReadings);
		await fetchReadings({ from: '2026-04-11T10:00:00Z', limit: 500 });
		const url = new URL((vi.mocked(fetch).mock.calls[0][0] as string));
		expect(url.searchParams.get('from')).toBe('2026-04-11T10:00:00Z');
		expect(url.searchParams.get('limit')).toBe('500');
	});

	it('does not append undefined params', async () => {
		mockFetch(mockReadings);
		await fetchReadings({ limit: 100 });
		const url = new URL((vi.mocked(fetch).mock.calls[0][0] as string));
		expect(url.searchParams.has('from')).toBe(false);
		expect(url.searchParams.has('to')).toBe(false);
	});

	it('returns parsed JSON on success', async () => {
		mockFetch(mockReadings);
		const result = await fetchReadings();
		expect(result).toEqual(mockReadings);
	});

	it('throws on non-ok response', async () => {
		mockFetch(null, 500);
		await expect(fetchReadings()).rejects.toThrow('API 500');
	});
});
