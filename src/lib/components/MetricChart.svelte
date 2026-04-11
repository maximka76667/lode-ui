<script lang="ts">
	import Chart from 'chart.js/auto';

	let {
		label,
		unit,
		color,
		labels,
		values
	}: {
		label: string;
		unit: string;
		color: string;
		labels: string[];
		values: number[];
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let chart: Chart | undefined;

	$effect(() => {
		const el = canvas;
		// track reactive dependencies
		const ls = labels;
		const vs = values;

		if (!el) return;

		chart?.destroy();
		chart = new Chart(el, {
			type: 'line',
			data: {
				labels: ls,
				datasets: [
					{
						data: vs,
						borderColor: color,
						backgroundColor: color + '18',
						fill: true,
						tension: 0.3,
						pointRadius: vs.length > 300 ? 0 : 2,
						pointHoverRadius: 4,
						borderWidth: 1.5
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				interaction: { mode: 'index', intersect: false },
				scales: {
					x: {
						ticks: { maxTicksLimit: 8, color: '#6b7280', maxRotation: 0 },
						grid: { color: '#1f2937' },
						border: { color: '#374151' }
					},
					y: {
						ticks: {
							color: '#6b7280',
							callback: (v) => `${Number(v).toFixed(1)}`
						},
						grid: { color: '#1f2937' },
						border: { color: '#374151' }
					}
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: '#111827',
						borderColor: '#374151',
						borderWidth: 1,
						titleColor: '#9ca3af',
						bodyColor: '#f9fafb',
						callbacks: {
							label: (ctx) => ` ${Number(ctx.parsed.y).toFixed(2)} ${unit}`
						}
					}
				}
			}
		});

		return () => {
			chart?.destroy();
			chart = undefined;
		};
	});
</script>

<div class="chart-block">
	<div class="chart-label" style="color: {color}">{label}</div>
	<div class="chart-wrap">
		{#if values.length === 0}
			<div class="empty">No data</div>
		{:else}
			<canvas bind:this={canvas}></canvas>
		{/if}
	</div>
</div>

<style>
	.chart-block {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.chart-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.chart-wrap {
		position: relative;
		height: 160px;
		background: #0d1117;
		border: 1px solid #1f2937;
		border-radius: 8px;
		overflow: hidden;
	}

	canvas {
		width: 100% !important;
		height: 100% !important;
	}

	.empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #4b5563;
		font-size: 0.875rem;
	}
</style>
