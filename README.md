# Charger Shelf

A small calculator for estimating how long a battery will take to charge from a charger’s voltage and current. It is a one-screen helper, not a device battery dashboard.

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

Charger power is voltage times current, in watts. Estimated charge time is the energy still needed divided by that power. Energy still needed is the battery capacity in watt-hours times the share of the battery that is still empty: capacity × (100 − remaining %) / 100. If remaining charge is left blank, the battery is treated as empty (0%). Capacity is watt-hours, not milliamp-hours, so it lines up directly with watts. The estimate assumes the charger holds constant voltage and current, and it ignores conversion loss, heat, and the taper near a full charge. If capacity is omitted, the screen still shows power but not a time.
