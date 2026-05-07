export const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3111';

export interface SensorReading {
	id: number;
	temperature_c: number;
	humidity_pct: number;
	pressure_hpa: number;
	recorded_at: string;
	presence_status: number | null;
	movement_distance_cm: number | null;
	movement_energy: number | null;
	stationary_distance_cm: number | null;
	stationary_energy: number | null;
	detection_distance_cm: number | null;
}

export async function fetchLatestReading(): Promise<SensorReading | null> {
	const res = await fetch(`${API_URL}/readings/latest`);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
	return res.json();
}

export async function fetchReadings(params?: {
	from?: string;
	to?: string;
	limit?: number;
}): Promise<SensorReading[]> {
	const url = new URL(`${API_URL}/readings`);
	if (params?.from) url.searchParams.set('from', params.from);
	if (params?.to) url.searchParams.set('to', params.to);
	if (params?.limit) url.searchParams.set('limit', String(params.limit));
	const res = await fetch(url.toString());
	if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
	return res.json();
}

export function connectSSE(
	onReading: (r: SensorReading) => void,
	onDisconnect: () => void,
	onOpen?: () => void
): () => void {
	let es: EventSource;
	let closed = false;

	function connect() {
		es = new EventSource(`${API_URL}/sse`);
		es.onopen = () => onOpen?.();
		es.onmessage = (e) => {
			try {
				onReading(JSON.parse(e.data) as SensorReading);
			} catch {
				// ignore malformed events
			}
		};
		es.onerror = () => {
			onDisconnect();
			es.close();
			if (!closed) setTimeout(connect, 3000);
		};
	}

	connect();
	return () => {
		closed = true;
		es?.close();
	};
}
