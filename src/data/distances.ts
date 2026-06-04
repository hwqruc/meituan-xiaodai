// Mock map distance between Beijing districts — simulates Amap / Baidu Maps result
// Varies slightly each call to feel dynamic (GPS fluctuation, traffic routing)

const districtCoords: Record<string, { lat: number; lng: number }> = {
  '朝阳区': { lat: 39.9219, lng: 116.4435 },
  '海淀区': { lat: 39.9562, lng: 116.3107 },
  '东城区': { lat: 39.9289, lng: 116.4164 },
  '西城区': { lat: 39.9123, lng: 116.3659 },
  '丰台区': { lat: 39.8585, lng: 116.2870 },
  '石景山区': { lat: 39.9056, lng: 116.2229 },
  '通州区': { lat: 39.9023, lng: 116.6564 },
  '大兴区': { lat: 39.7268, lng: 116.3380 },
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

export function getMapDistance(districtA: string, districtB: string): number {
  const a = districtCoords[districtA];
  const b = districtCoords[districtB];
  if (!a || !b) return 5 + Math.random() * 8; // unknown → random 5-13km

  const direct = haversineKm(a, b);
  // Road multiplier: 1.2–1.6× direct distance
  const road = direct * (1.2 + Math.random() * 0.4);
  return Math.round(road * 10) / 10;
}

export function getTravelMinutes(districtA: string, districtB: string): number {
  const km = getMapDistance(districtA, districtB);
  // Rough: 2 min/km in dense urban, 1.5 min/km on ring roads
  const speed = km > 8 ? 1.5 : 2;
  const minutes = Math.round(km * speed);
  // Add traffic noise (+0–10min depending on distance)
  const jitter = Math.floor(Math.random() * Math.min(10, km * 1.2));
  return Math.max(5, minutes + jitter);
}
