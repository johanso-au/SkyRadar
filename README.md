# SkySweep Radar V4.2

A real-time ADS-B flight tracking dashboard with a retro-futuristic radar interface. This application pulls live aircraft data from the `adsb.fi` network and resolves flight routes using `adsbdb.com`.

## Features

- **Live Radar Display**: Real-time tracking of aircraft within a configurable radius.
- **Flight Route Resolution**: Automatically looks up origin and destination airports for active flight codes.
- **Interactive Map**: Integrated dark-themed OpenStreetMap (via Leaflet) for geographic context.
- **Bento Box UI**: A structured, high-tech dashboard layout showcasing flight stats and technical diagnostics.
- **Retro Mode**: A specialized 320x240 "mini-radar" view for a classic CRT display feel.
- **Geolocation**: Automatically centers the radar on your current GPS coordinates.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS.
- **Backend**: Express.js (Node.js) acting as a CORS proxy and route resolver.
- **Mapping**: Leaflet + React-Leaflet with CartoDB Dark Matter tiles.
- **Animations**: Framer Motion / Motion.
- **Icons**: Lucide React.

## Deployment

### Within AI Studio
- Use the **Share** button to generate a public preview link.
- Use the **Deploy** option to launch on Google Cloud Run.

### Manual Deployment
1. **Build**: `npm run build`
2. **Start**: `npm start` (runs the Express server which serves the static frontend).
3. **Environment**: Ensure port 3000 is open if running on a custom server.

## API Credits
- Data provided by [adsb.fi](https://adsb.fi)
- Route information via [adsbdb.com](https://adsbdb.com)
- Maps &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors &copy; [CARTO](https://carto.com/attributions)
