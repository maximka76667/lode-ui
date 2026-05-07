<script lang="ts">
	import { connectSSE, fetchLatestReading, fetchReadings, type SensorReading } from '$lib/api';
	import { fromISO, fmtVal, fmtLabel } from '$lib/utils';
	import MetricChart from '$lib/components/MetricChart.svelte';

	// Live state
	let latest = $state<SensorReading | null>(null);
	let connected = $state(false);
	let connecting = $state(true);
	let lastUpdate = $state('');
	let lastReadingAt = $state(0);
	let now = $state(Date.now());

	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 10_000);
		return () => clearInterval(id);
	});

	let stale = $derived(connected && lastReadingAt > 0 && now - lastReadingAt > 120_000);

	// History state
	let range = $state<'5m' | '20m' | '1h' | '5h'>('1h');
	let history = $state<SensorReading[]>([]);
	let loading = $state(false);
	let histError = $state<string | null>(null);

	// Seed cards with latest reading on startup
	$effect(() => {
		fetchLatestReading().then((r) => {
			if (r && !latest) latest = r;
		});
	});

	// SSE — auto-reconnects every 3s on error
	$effect(() => {
		return connectSSE(
			(r) => {
				latest = r;
				connected = true;
				lastReadingAt = Date.now();
				lastUpdate = new Date().toLocaleTimeString();
			},
			() => {
				connected = false;
				connecting = false;
			},
			() => {
				connecting = false;
			}
		);
	});

	async function loadHistory(r: string) {
		loading = true;
		histError = null;
		try {
			const data = await fetchReadings({ from: fromISO(r) });
			history = data.toReversed();
		} catch (e) {
			histError = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	// Reload when range changes
	$effect(() => {
		void loadHistory(range);
	});

	// Auto-refresh every 5s
	$effect(() => {
		const id = setInterval(() => void loadHistory(range), 5_000);
		return () => clearInterval(id);
	});

	let chartLabels = $derived(history.map((r) => fmtLabel(r.recorded_at, range)));
	let tempValues = $derived(history.map((r) => r.temperature_c));
	let humidValues = $derived(history.map((r) => r.humidity_pct));
	let pressValues = $derived(history.map((r) => r.pressure_hpa));
	let presenceValues = $derived(history.map((r) => r.presence_status));
	let movementDistValues = $derived(history.map((r) => r.movement_distance_cm));
	let movementEnergyValues = $derived(history.map((r) => r.movement_energy));
	let stationaryDistValues = $derived(history.map((r) => r.stationary_distance_cm));
	let stationaryEnergyValues = $derived(history.map((r) => r.stationary_energy));
	let detectionDistValues = $derived(history.map((r) => r.detection_distance_cm));

	const PRESENCE_LABELS: Record<number, string> = { 0: 'None', 1: 'Moving', 2: 'Still', 3: 'Both' };
	let presenceLabel = $derived(
		latest?.presence_status != null ? (PRESENCE_LABELS[latest.presence_status] ?? '—') : '—'
	);
	let presenceColor = $derived(latest?.presence_status === 2 ? '#f8fafc' : '#22c55e');
	let detectionDist = $derived(
		latest?.detection_distance_cm != null ? `${latest.detection_distance_cm} cm` : ''
	);
</script>

<svelte:head>
	<title>Lode</title>
</svelte:head>

<main>
	<header>
		<h1>Lode</h1>
		<span class="status" class:connected class:stale>
			{#if connecting}
				◎ Connecting
			{:else if stale}
				◌ No signal
			{:else if connected}
				● Live
			{:else if lastReadingAt === 0}
				◎ Waiting for data
			{:else}
				○ Offline
			{/if}
			{#if lastUpdate}&nbsp;· {lastUpdate}{/if}
		</span>
	</header>

	<section class="cards">
		<div class="card temp">
			<span class="label"><span class="latest">Latest</span> Temperature</span>
			<span class="value">{fmtVal(latest, 'temperature_c')}<small>°C</small></span>
		</div>
		<div class="card humid">
			<span class="label"><span class="latest">Latest</span> Humidity</span>
			<span class="value">{fmtVal(latest, 'humidity_pct')}<small>%</small></span>
		</div>
		<div class="card pres">
			<span class="label"><span class="latest">Latest</span> Pressure</span>
			<span class="value">{fmtVal(latest, 'pressure_hpa', 1)}<small>hPa</small></span>
		</div>
	</section>

	<section class="cards presence-cards">
		<div class="card presence">
			<span class="label"><span class="latest">Latest</span> Presence</span>
			<span class="value presence-status" style="color: {presenceColor}">{presenceLabel}</span>
		</div>
		<div class="card presence">
			<span class="label"><span class="latest">Latest</span> Detection Distance</span>
			<span class="value">{latest?.detection_distance_cm ?? '—'}<small>cm</small></span>
		</div>
		<div class="card presence">
			<span class="label"><span class="latest">Latest</span> Movement Distance</span>
			<span class="value">{latest?.movement_distance_cm ?? '—'}<small>cm</small></span>
		</div>
		<div class="card presence">
			<span class="label"><span class="latest">Latest</span> Movement Energy</span>
			<span class="value">{latest?.movement_energy ?? '—'}</span>
		</div>
		<div class="card still">
			<span class="label"><span class="latest">Latest</span> Stationary Distance</span>
			<span class="value">{latest?.stationary_distance_cm ?? '—'}<small>cm</small></span>
		</div>
		<div class="card still">
			<span class="label"><span class="latest">Latest</span> Stationary Energy</span>
			<span class="value">{latest?.stationary_energy ?? '—'}</span>
		</div>
	</section>

	<section class="history">
		<div class="history-header">
			<h2>History</h2>
			<div class="ranges">
				{#each ['5m', '20m', '1h', '5h'] as r}
					<button class:active={range === r} onclick={() => (range = r as typeof range)}>{r}</button>
				{/each}
			</div>
			{#if loading}<span class="spinner">Loading…</span>{/if}
		</div>

		{#if histError}
			<div class="error">{histError}</div>
		{:else}
			<div class="charts">
				<MetricChart label="Temperature" unit="°C" color="#f97316" labels={chartLabels} values={tempValues} />
				<MetricChart label="Humidity" unit="%" color="#06b6d4" labels={chartLabels} values={humidValues} />
				<MetricChart label="Pressure" unit="hPa" color="#a855f7" labels={chartLabels} values={pressValues} />
				<MetricChart label="Presence Status" unit="" color="#22c55e" labels={chartLabels} values={presenceValues} note="0 = None · 1 = Moving · 2 = Still · 3 = Both" />
				<MetricChart label="Detection Distance" unit="cm" color="#22c55e" labels={chartLabels} values={detectionDistValues} />
				<MetricChart label="Movement Distance" unit="cm" color="#4ade80" labels={chartLabels} values={movementDistValues} />
				<MetricChart label="Movement Energy" unit="" color="#86efac" labels={chartLabels} values={movementEnergyValues} />
				<MetricChart label="Stationary Distance" unit="cm" color="#f8fafc" labels={chartLabels} values={stationaryDistValues} />
				<MetricChart label="Stationary Energy" unit="" color="#f8fafc" labels={chartLabels} values={stationaryEnergyValues} />
			</div>
		{/if}
	</section>
</main>

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		background: #080c10;
		color: #e2e8f0;
		font-family: system-ui, -apple-system, sans-serif;
		min-height: 100vh;
	}

	main {
		max-width: 1800px;
		margin: 0 auto;
		padding: 2rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	@media (min-width: 1024px) {
		main {
			padding: 3rem 3rem;
			gap: 3rem;
		}
	}

	/* Header */
	header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: #f8fafc;
	}

	@media (min-width: 1024px) {
		h1 { font-size: 2rem; }
	}

	.status {
		font-size: 0.8rem;
		color: #4b5563;
		transition: color 0.3s;
	}

	@media (min-width: 1024px) {
		.status { font-size: 0.95rem; }
	}

	.status.connected {
		color: #22c55e;
	}

	.status.stale {
		color: #f59e0b;
	}

	/* Cards */
	.cards {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.presence-cards {
		grid-template-columns: repeat(3, 1fr);
	}

	@media (min-width: 1024px) {
		.cards { gap: 1.5rem; }
		.presence-cards { grid-template-columns: repeat(6, 1fr); }
	}

	@media (max-width: 500px) {
		.cards {
			grid-template-columns: 1fr;
		}
	}

	.card {
		background: #0d1117;
		border: 1px solid #1f2937;
		border-radius: 10px;
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	@media (min-width: 1024px) {
		.card {
			border-radius: 14px;
			padding: 2rem 2.25rem;
			gap: 0.75rem;
		}
	}

	.card .label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #6b7280;
	}

	@media (min-width: 1024px) {
		.card .label { font-size: 0.85rem; }
	}

	.card .value {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.03em;
	}

	@media (min-width: 1024px) {
		.card .value { font-size: 3.5rem; }
	}

	.card .value small {
		font-size: 0.9rem;
		font-weight: 400;
		margin-left: 0.2em;
		color: #6b7280;
	}

	@media (min-width: 1024px) {
		.card .value small { font-size: 1.25rem; }
	}

	.card.temp .value { color: #f97316; }
	.card.humid .value { color: #06b6d4; }
	.card.pres .value { color: #a855f7; }

	.card.temp .latest { color: #f97316; }
	.card.humid .latest { color: #06b6d4; }
	.card.pres .latest { color: #a855f7; }
	.card.presence .value { color: #22c55e; }
	.card.presence .latest { color: #22c55e; }
	.card.presence { justify-content: space-between; }
	.presence-status { margin-top: auto; }
	.card.still .value { color: #f8fafc; }
	.card.still .latest { color: #f8fafc; }

	/* History */
	.history {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.history-header {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	h2 {
		font-size: 0.95rem;
		font-weight: 600;
		color: #9ca3af;
	}

	@media (min-width: 1024px) {
		h2 { font-size: 1.1rem; }
	}

	.ranges {
		display: flex;
		gap: 0.25rem;
	}

	.ranges button {
		background: none;
		border: 1px solid #1f2937;
		border-radius: 6px;
		color: #6b7280;
		font-size: 0.75rem;
		padding: 0.25rem 0.6rem;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}

	@media (min-width: 1024px) {
		.ranges button {
			font-size: 0.875rem;
			padding: 0.35rem 0.9rem;
		}
	}

	.ranges button:hover {
		border-color: #374151;
		color: #d1d5db;
	}

	.ranges button.active {
		background: #1f2937;
		border-color: #374151;
		color: #f9fafb;
	}

	.spinner {
		font-size: 0.75rem;
		color: #4b5563;
	}

	.charts {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.error {
		background: #1c0a0a;
		border: 1px solid #7f1d1d;
		border-radius: 8px;
		padding: 1rem;
		color: #f87171;
		font-size: 0.875rem;
	}
</style>
