import { describe, expect, it } from 'vitest';
import { objects, objectById, SPAWN, WORLD } from '../../src/data/space';
import { planRoute } from '../../src/lib/navigation';
import { worldObstacles } from '../../src/lib/objectGeometry';
import { moveWithCollisions, canInteract, blockingAt } from '../../src/lib/physics';
import { defaultMobility } from '../../src/types/simulator';
import { advanceColleagues } from '../../src/lib/npcMotion';

describe('navigation and living office', () => {
  it('routes to every room without intersecting static geometry and arrives within F range', () => {
    const doors = objects.filter(o => o.kind === 'door').map(o => o.id);
    const obstacles = worldObstacles(doors, objects.filter(o => !o.patrol));
    for (const id of ['reception-counter', 'desk-a12', 'meeting-table', 'water-dispenser', 'sink', 'quiet-sofa']) {
      const target = objectById(id)!;
      const path = planRoute(SPAWN, target, defaultMobility)!;
      expect(path, id).not.toBeNull();
      for (let i = 1; i < path.length; i++) {
        const previous = path[i - 1], next = path[i];
        expect(moveWithCollisions(previous, next.x - previous.x, next.z - previous.z, next.yaw - previous.yaw, defaultMobility, obstacles).blocked, `${id} segment ${i}`).toBeUndefined();
      }
      expect(canInteract(path.at(-1)!, target, obstacles, doors)).toBe(true);
    }
  });
  it('does not invent a route through doors that are narrower than the chair', () => {
    expect(planRoute(SPAWN, objectById('sink')!, { ...defaultMobility, widthCm: 110 })).toBeNull();
  });
  it('expanded office keeps metre dimensions and all pedestrians remain inside clear paths', () => {
    expect(WORLD.maxX - WORLD.minX).toBe(24);
    const scene = objects.map(o => ({ ...o, position: [...o.position] as typeof o.position }));
    const staticObstacles = worldObstacles([], objects.filter(o => !o.colleague));
    const waypoints = new Map<string, number>();
    for (let frame = 0; frame < 800; frame++) advanceColleagues(scene, waypoints, .04, SPAWN, defaultMobility, staticObstacles, false);
    for (const person of scene.filter(o => o.patrol)) {
      expect(person.position).not.toEqual(objectById(person.id)!.position);
      expect(blockingAt({x:person.position[0],z:person.position[2],yaw:person.yaw}, {...defaultMobility,widthCm:58,lengthCm:58}, staticObstacles)).toBeUndefined();
    }
    const person = scene.find(o => o.patrol)!;
    const before = [...person.position];
    advanceColleagues(scene, waypoints, .04, {x:person.position[0] + 1,z:person.position[2],yaw:0}, defaultMobility, staticObstacles, false);
    expect(person.position).toEqual(before);
    advanceColleagues(scene, waypoints, .04, SPAWN, defaultMobility, staticObstacles, true);
    expect(person.position).toEqual(before);
  });
});
