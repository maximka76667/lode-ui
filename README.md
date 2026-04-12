# lode-ui

Dashboard for the Lode environmental sensor system. Displays live temperature, humidity, and pressure readings from a BME280 sensor running on an STM32H723 over Ethernet, via the [lode-api-rust](https://github.com/maximka76667/lode-api-rust) backend.

<img width="1119" height="1037" alt="lode-ui" src="https://github.com/user-attachments/assets/a3b5a7c4-e767-4709-913f-87c393cd98da" />

## Stack

- [SvelteKit](https://kit.svelte.dev/) + Svelte 5 (runes)
- [Chart.js](https://www.chartjs.org/) for history charts
- SSE for live data, polling every 5s for history

## Setup

```sh
cp .env.example .env
# edit VITE_API_URL to point at your lode-api-rust instance
bun install
bun dev
```

`.env`:

```
VITE_API_URL=http://192.168.1.136:3111
```

## Features

- **Live cards** — temperature, humidity, pressure updated in real time via SSE. Reconnects automatically every 3s on drop.
- **Connection status** — `● Live` / `◌ No signal` (board quiet, API keep-alive still open) / `○ Offline` (API unreachable)
- **History charts** — 24h or 7d line charts, refreshed every 5s
- **Dark theme**

## Related

- [lode-api-rust](https://github.com/maximka76667/lode-api-rust) — Axum/SQLite REST API + SSE broadcaster
- [lode-stm32h723](https://github.com/maximka76667/lode-stm32h723) — Embassy firmware for Nucleo-H723ZG, posts readings every 500ms
