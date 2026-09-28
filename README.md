# Полка зарядок

Небольшой калькулятор: сколько займёт зарядка аккумулятора по напряжению и току зарядки. Один экран, не панель батареи устройства.

Queue: [docs/issues-priority.md](docs/issues-priority.md). Workflow: [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md).

## Run

```bash
npm i
npm run dev
```

Production check:

```bash
npm run build
npm test
```

Requires Node.js 22 or newer. CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `npm ci`, `npm test`, and `npm run build` on Node 22 for every push to `main` and for pull requests. Live site: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) builds with base `/charger-shelf/` and deploys `dist/` to GitHub Pages on every push to `main`.

## Charge-time assumption

Charger power is voltage times current, in watts. Estimated charge time is the energy still needed divided by that power and by charging efficiency: time (h) = energy (Wh) / (V × A × efficiency). Efficiency is a percent from 50 to 100; the default is 85%, and a blank field uses that default. A value outside 50–100 does not produce a time. At 100% the estimate matches power alone; at 50% the same inputs take twice as long. Energy still needed is the battery capacity in watt-hours times the share of the battery that is still empty: capacity × (100 − remaining %) / 100. If remaining charge is left blank, the battery is treated as empty (0%). Capacity can be entered in watt-hours, or in milliamp-hours. Milliamp-hours convert with the entered voltage: Wh = (mAh / 1000) × V. If that voltage is missing, zero, or negative, the screen asks for a voltage instead of showing a time. The estimate assumes the charger holds constant voltage and current. Efficiency stands in for conversion loss and heat. The taper near a full charge is still ignored. If capacity is omitted, the screen still shows power but not a time. Efficiency is stored with the other calculator inputs.
