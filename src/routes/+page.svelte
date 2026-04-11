<script lang="ts">
	import { connectSSE, fetchReadings, type SensorReading } from '$lib/api';
	import { fromISO, fmtVal, fmtLabel } from '$lib/utils';
	import MetricChart from '$lib/components/MetricChart.svelte';

	// Live state
	let latest = $state<SensorReading | null>(null);
	let connected = $state(false);
	let lastUpdate = $state('');
	let lastReadingAt = $state(0);
	let now = $state(Date.now());

	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 2000);
		return () => clearInterval(id);
	});

	let stale = $derived(connected && lastReadingAt > 0 && now - lastReadingAt > 5000);

	// History state
	let range = $state<'24h' | '7d'>('24h');
	let history = $state<SensorReading[]>([]);
	let loading = $state(false);
	let histError = $state<string | null>(null);

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
			}
		);
	});

	async function loadHistory(r: string) {
		loading = true;
		histError = null;
		try {
			const data = await fetchReadings({ from: fromISO(r), limit: 1000 });
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
</script>

<svelte:head>
	<title>Lode</title>
</svelte:head>

<main>
	<header>
		<h1>Lode</h1>
		<span class="status" class:connected class:stale>
			{#if stale}
				◌ No signal
			{:else if connected}
				● Live
			{:else}
				○ Offline
			{/if}
			{#if lastUpdate}&nbsp;· {lastUpdate}{/if}
		</span>
	</header>

	<section class="cards">
		<div class="card temp">
			<span class="label">Temperature</span>
			<span class="value">{fmtVal(latest, 'temperature_c')}<small>°C</small></span>
		</div>
		<div class="card humid">
			<span class="label">Humidity</span>
			<span class="value">{fmtVal(latest, 'humidity_pct')}<small>%</small></span>
		</div>
		<div class="card pres">
			<span class="label">Pressure</span>
			<span class="value">{fmtVal(latest, 'pressure_hpa', 1)}<small>hPa</small></span>
		</div>
	</section>

	<section class="history">
		<div class="history-header">
			<h2>History</h2>
			<div class="ranges">
				{#each ['24h', '7d'] as r}
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
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
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

	.status {
		font-size: 0.8rem;
		color: #4b5563;
		transition: color 0.3s;
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

	.card .label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #6b7280;
	}

	.card .value {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.03em;
	}

	.card .value small {
		font-size: 0.9rem;
		font-weight: 400;
		margin-left: 0.2em;
		color: #6b7280;
	}

	.card.temp .value { color: #f97316; }
	.card.humid .value { color: #06b6d4; }
	.card.pres .value { color: #a855f7; }

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
