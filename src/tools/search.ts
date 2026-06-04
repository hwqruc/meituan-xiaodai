import type { Activity, Restaurant, PlanConstraint } from '../types';
import { activities } from '../data/activities';
import { restaurants } from '../data/restaurants';
import { getMapDistance } from '../data/distances';

function fakeDelay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 150));
}

// Add slight GPS-like jitter to distance each time search runs
function varyDistance(baseKm: number): number {
  const jitter = (Math.random() - 0.3) * 1.6; // +0.5 to -0.5 km
  return Math.round(Math.max(0.3, baseKm + jitter) * 10) / 10;
}

export async function searchActivities(
  category: string,
  constraint: PlanConstraint,
): Promise<Activity[]> {
  await fakeDelay();

  let results = activities.filter((a) => a.category === category);

  // Apply hard constraints
  if (constraint.kidAge && constraint.kidAge <= 5) {
    results = results.filter((a) => a.kidFriendly);
  }

  // Vary distances to feel like real map data
  results = results.map((a) => ({
    ...a,
    distanceKm: varyDistance(a.distanceKm),
  }));

  // Sort: closest first
  results.sort((a, b) => a.distanceKm - b.distanceKm);

  return results;
}

export async function searchRestaurants(
  category: string,
  constraint: PlanConstraint,
): Promise<Restaurant[]> {
  await fakeDelay();

  let results = restaurants.filter((r) => r.category === category);

  // Diet constraints
  if (constraint.dietConstraints.includes('减肥/轻食')) {
    results = results.filter((r) => r.hasHealthyOption);
  }

  // Kid constraints
  if (constraint.kidAge && constraint.kidAge <= 7) {
    results = results.filter((r) => r.hasKidMenu);
  }

  // Vary distances
  results = results.map((r) => ({
    ...r,
    distanceKm: varyDistance(r.distanceKm),
  }));

  results.sort((a, b) => a.distanceKm - b.distanceKm);

  return results;
}

export async function checkAvailability(
  poiIds: string[],
  _type: 'activity' | 'restaurant',
  people: number,
): Promise<Record<string, boolean>> {
  await fakeDelay(200);

  const result: Record<string, boolean> = {};
  const pool: (Activity | Restaurant)[] =
    _type === 'activity' ? activities : restaurants;

  for (const id of poiIds) {
    const poi = pool.find((p) => p.id === id);
    if (!poi) {
      result[id] = false;
      continue;
    }
    if ('availableTickets' in poi) {
      result[id] = (poi as Activity).availableTickets >= people;
    } else {
      result[id] = (poi as Restaurant).availableTables;
    }
  }

  return result;
}
