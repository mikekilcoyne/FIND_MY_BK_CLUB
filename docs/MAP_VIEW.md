> **Historical build spec.** The map view shipped from this document — it describes what
> was built, not what is planned. Phase 2 items below are tracked in
> [STATUS.md](./STATUS.md). Current state: [STATUS.md](./STATUS.md).

# Map View — V1 Build Spec

## Goal

A mobile-first interactive map letting users:
1. View all Breakfast Club locations globally.
2. Filter by region (Northeast US, Europe, UK, West Coast, etc.).
3. Tap cities to view details.
4. Navigate easily from one city to another.
5. Plan to "hit a few" across a short trip.

---

## UX Principles

- Mobile-first.
- Minimal UI. No clutter.
- Large tap targets.
- Smooth zoom and cluster behavior.
- Region filter clearly accessible.
- Clean card popups per location.

No complex dashboards.

---

## Core Features (V1 Only)

### 1. Interactive Map

Use **Leaflet.js** (lightweight, no API key required).

- Pins for each city.
- Clustering when zoomed out.

### 2. Region Filter

Dropdown or pill selector.

Regions:
- Northeast US
- Southeast US
- West Coast
- Europe
- UK
- Australia
- Other

Filtering should:
- Zoom to region.
- Show only relevant pins.

### 3. City Card (On Tap)

Bottom-sheet style on mobile. Show:
- City name
- Host name
- Upcoming date (if available)
- Link to details page
- "Open in Maps" button

### 4. Data Structure

Loaded from a static JSON file:

```json
{
  "city": "Brooklyn",
  "latitude": 40.6782,
  "longitude": -73.9442,
  "region": "Northeast US",
  "host": "Jane Doe",
  "link": "https://breakfastclubbing.com",
  "upcoming_date": "2026-03-15"
}
```

---

## Mobile Optimization

- Bottom-sheet popup on mobile.
- Large tap zones.
- Smooth scroll.
- No hover-only interactions.
- Works on iPhone Safari.

---

## Do NOT Include (V1)

- Accounts or authentication
- Route optimization
- Travel booking
- Advanced filtering

---

## Deliverables

1. Folder structure
2. Required dependencies
3. Sample JSON data file
4. Map component (`map-view.html`)
5. Region filter implementation
6. Local testing instructions
7. Deployment notes

---

## Tone / Feel

Not a corporate dashboard.

Playful but refined. Light. Intuitive. Cultural.

---

## Phase 2 (Do Not Build Yet)

- Multi-city itinerary builder
- "Hit 3 in 3 days" suggested loops
- Route line visualizations
- Save trip plan

---

## Strategic Note

Map View ships first.

Scale over novelty — map increases density and global reach. MadLib Missed Connections (depth per event) layers on after real-world map usage is tested.

This is step one toward Breakfast Club as global infrastructure.
