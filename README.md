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

Requires Node.js 22 or newer.

## Charge-time assumption

Charger power is voltage times current, in watts. Estimated charge time is the energy still needed divided by that power. Energy still needed is the battery capacity in watt-hours times the share of the battery that is still empty: capacity × (100 − remaining %) / 100. If remaining charge is left blank, the battery is treated as empty (0%). Capacity can be entered in watt-hours, or in milliamp-hours. Milliamp-hours convert with the entered voltage: Wh = (mAh / 1000) × V. If that voltage is missing, zero, or negative, the screen asks for a voltage instead of showing a time. The estimate assumes the charger holds constant voltage and current, and it ignores conversion loss, heat, and the taper near a full charge. If capacity is omitted, the screen still shows power but not a time.
