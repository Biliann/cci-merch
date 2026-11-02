import boundary from './kazakhstan-boundary.json';

export type Region = 'Юг' | 'Север' | 'Запад' | 'Восток';

// Provisional routing until delivery territories are supplied: choose the nearest
// catalogue hub by great-circle distance, only for locations within Kazakhstan.
// The bundled Natural Earth outline is approximate, especially near borders.
const hubs: { region: Region; latitude: number; longitude: number }[] = [
  { region: 'Юг', latitude: 43.2389, longitude: 76.8897 }, // Алматы
  { region: 'Север', latitude: 51.1694, longitude: 71.4491 }, // Астана
  { region: 'Запад', latitude: 47.0945, longitude: 51.9238 }, // Атырау
  { region: 'Восток', latitude: 49.9483, longitude: 82.6285 }, // Усть-Каменогорск
];

function isInKazakhstan(latitude: number, longitude: number): boolean {
  const ring = boundary.ring;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    if (
      (y1 > latitude) !== (y2 > latitude) &&
      longitude < ((x2 - x1) * (latitude - y1)) / (y2 - y1) + x1
    ) {
      inside = !inside;
    }
  }
  return inside;
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;

// The Haversine value is monotonic with distance, so comparing it avoids the
// final Earth-radius multiplication and inverse trigonometry for each hub.
function haversine(latitude: number, longitude: number, hub: (typeof hubs)[number]): number {
  return (
    Math.sin(radians(hub.latitude - latitude) / 2) ** 2 +
    Math.cos(radians(latitude)) *
      Math.cos(radians(hub.latitude)) *
      Math.sin(radians(hub.longitude - longitude) / 2) ** 2
  );
}

export function resolveRegion(latitude: number, longitude: number): Region | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    !isInKazakhstan(latitude, longitude)
  ) {
    return null;
  }

  let nearest = hubs[0];
  let shortest = Infinity;
  for (const hub of hubs) {
    const distance = haversine(latitude, longitude, hub);
    if (distance < shortest) {
      nearest = hub;
      shortest = distance;
    }
  }
  return nearest.region;
}
