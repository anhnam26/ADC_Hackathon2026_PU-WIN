import { WORLD, objects } from '../data/space';
import { worldObstacles } from './objectGeometry';
import { blockingAt, bodyAt, canInteract, moveWithCollisions, overlaps } from './physics';
import type { MobilityProfile, Obstacle, Pose, WorldObject } from '../types/simulator';

const STEP = .25;
const angleDifference = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function axisSegmentClear(a: Pose, b: Pose, profile: MobilityProfile, obstacles: Obstacle[]) {
  const body = bodyAt(a, profile);
  const swept = { ...body, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2,
    width: body.width + Math.abs(b.x - a.x), depth: body.depth + Math.abs(b.z - a.z), yaw: 0 };
  return !blockingAt(b, profile, []) && !obstacles.some(o => overlaps(swept, o));
}

// A measured rectangle follows axis-aligned segments. It keeps yaw=0 so the
// planner and runtime use the same footprint through every doorway (including strafing).
export function planRoute(start: Pose, target: WorldObject, profile: MobilityProfile, sceneObjects = objects): Pose[] | null {
  const allDoors = objects.filter(o => o.kind === 'door').map(o => o.id);
  const obstacles = worldObstacles(allDoors, sceneObjects.filter(o => !o.patrol));
  const turn = moveWithCollisions(start, 0, 0, angleDifference(0, start.yaw), profile, obstacles);
  if (turn.blocked || Math.abs(turn.pose.yaw) > .01) return null;
  const gridStart = { x: Math.round(start.x / STEP) * STEP, z: Math.round(start.z / STEP) * STEP, yaw: 0 };
  const join = moveWithCollisions(turn.pose, gridStart.x - start.x, gridStart.z - start.z, 0, profile, obstacles);
  if (join.blocked) return null;
  const key = (p: Pose) => `${Math.round(p.x / STEP)},${Math.round(p.z / STEP)}`;
  const heuristic = (p: Pose) => Math.max(0, Math.hypot(p.x - target.position[0], p.z - target.position[2]) - 1);
  const startKey = key(gridStart);
  const frontier = new Map<string, Pose>([[startKey, gridStart]]);
  const scores = new Map<string, number>([[startKey, 0]]);
  const parent = new Map<string, string>();
  const nodes = new Map<string, Pose>([[startKey, gridStart]]);
  const visited = new Set<string>();
  const occupancy = new Map<string, boolean>();
  for (let iteration = 0; frontier.size && iteration < 11000; iteration++) {
    let id = '', best = Infinity;
    for (const [candidate, p] of frontier) {
      const score = scores.get(candidate)! + heuristic(p);
      if (score < best) { best = score; id = candidate; }
    }
    const current = frontier.get(id)!;
    frontier.delete(id); visited.add(id);
    if (heuristic(current) < 1.5 && canInteract(current, target, obstacles, allDoors)) {
      const route: Pose[] = [current];
      let previous = id;
      while (parent.has(previous)) { previous = parent.get(previous)!; route.unshift(nodes.get(previous)!); }
      return [{ ...start }, turn.pose, ...route];
    }
    for (const [dx, dz] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) {
      const next = { x: current.x + dx, z: current.z + dz, yaw: 0 }, nextKey = key(next);
      if (visited.has(nextKey) || next.x < WORLD.minX || next.x > WORLD.maxX || next.z < WORLD.minZ || next.z > WORLD.maxZ) continue;
      if (!occupancy.has(nextKey)) occupancy.set(nextKey, !blockingAt(next, profile, obstacles));
      if (!occupancy.get(nextKey) || !axisSegmentClear(current, next, profile, obstacles)) continue;
      const cost = scores.get(id)! + STEP;
      if (cost >= (scores.get(nextKey) ?? Infinity)) continue;
      scores.set(nextKey, cost); parent.set(nextKey, id); nodes.set(nextKey, next); frontier.set(nextKey, next);
    }
  }
  return null;
}

export function routeLength(route: Pose[]) {
  return route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - route[i].x, p.z - route[i].z), 0);
}
