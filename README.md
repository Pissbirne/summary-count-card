# Summary Count Card

A compact Home Assistant Lovelace card that counts entities in a given state and navigates to a target view when tapped. Lightweight and dependency-free.

## Features

- **Count entities** — lights on, critical batteries, open covers, security issues, switches on, sensors on
- **Critical batteries** — counts `unavailable`/`unknown` AND values below 20% (device_class: battery)
- **Tap navigation** — navigate to any dashboard view on tap (e.g. `/dashboard-neu/batteries`)
- **Optional icon animation** — same look as the animated lock card: pulsing glow halo + swinging icon, in the current state colour (red = something to do, green = all clear)
- **Optional icon animation** — same look as the animated lock card: pulsing glow halo + swinging icon, in the current state colour (red = something to do, green = all clear)
- **Theme-compatible** — uses only CSS variables, adapts to any HA theme
- **Visual editor** — choose count type and target path via UI, no YAML needed
- **No dependencies** — pure HTMLElement, no Lit runtime, no external libraries
- **German labels** — auto-labels in German (e.g. "Batterien kritisch", "Alles gesichert")

## Installation

### HACS (recommended)
1. Add this repo as a custom repository in HACS (type: Dashboard)
2. Install
3. Restart Home Assistant
4. Add card to your dashboard

### Manual
1. Copy `summary-count-card.js` to your `www/custom/` directory
2. Add resource: `/local/custom/summary-count-card.js` (type: JavaScript Module)
3. Restart Home Assistant
4. Add card to your dashboard

## Configuration

### Visual Editor
Add a new card and search for "Summary Count". Choose the count type and target path in the editor.

### YAML
```yaml
type: custom:summary-count-card
count_type: batteries_critical
target_path: /dashboard-neu/batteries
```

### Card Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `count_type` | string | `batteries_critical` | What to count (see below) |
| `target_path` | string | `""` | Dashboard view to navigate to on tap (e.g. `/dashboard-neu/batteries`) |
| `label` | string | `""` | Custom label (empty = auto) |
| `icon` | string | `""` | Custom icon (empty = auto) |
| `show_label` | bool | `true` | Show the label |
| `show_icon` | bool | `true` | Show the icon |
| `color_mode` | string | `"auto"` | `"auto"` or `"none"` |
| `animate` | bool | `false` | Animate the icon (glow halo + swing) |
| `animate_active_only` | bool | `true` | Only animate while the count is above 0 |

### Count Types

| `count_type` | Counts | Auto label | Auto icon |
|--------------|--------|-----------|-----------|
| `batteries_critical` | unavailable/unknown + <20% (device_class: battery) | "kritisch" | `mdi:battery-alert` |
| `lights` | lights that are `on` | "Lichter an" | `mdi:lamps` |
| `switches_on` | switches that are `on` | "Schalter an" | `mdi:toggle-switch` |
| `sensors_on` | binary_sensors that are `on` | "Sensoren an" | `mdi:motion-sensor` |
| `covers_open` | covers that are `open`/`opening` | "Rollos offen" | `mdi:blinds-horizontal` |
| `security` | unlocked locks, open doors/garages/gates, open windows | "Alles gesichert" / "unsicher" | `mdi:security` |

### Security counting details

The `security` count type considers an entity "unsafe" when:
- a `lock` is `unlocked`
- a `cover` with `device_class` door/garage/gate is `open`/`opening`
- a `binary_sensor` with `device_class` door/window/garage_door/opening is `on`

When the count is 0, the card shows "Alles gesichert" in green (no number). Otherwise it shows "N unsicher" in red.

### Animation

Two switches in the visual editor: **Animieren** and **Nur größer 0**.

- `animate: true` turns the effect on — the icon swings and glows in the current state colour.
- `animate_active_only: true` (default) keeps the icon still while the count is 0; with it off the icon also animates in the quiet state, with a much subtler motion.

The glow halo takes the icon's own colour, so it turns red while there is something to act on and green (or the theme's text colour) when everything is fine. `prefers-reduced-motion` is respected.

```yaml
type: custom:summary-count-card
count_type: security
target_path: /dashboard-neu/security
animate: true
animate_active_only: true
```

## License

MIT
