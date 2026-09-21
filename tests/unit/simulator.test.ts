import { describe, expect, it } from 'vitest';
import { objectById, objects, SPAWN } from '../../src/data/space';
import { objectParts, worldObstacles } from '../../src/lib/objectGeometry';
import { blockingAt, canInteract, doorCanToggle, moveWithCollisions, overlaps } from '../../src/lib/physics';
import { defaultMobility, mobilitySchema } from '../../src/types/simulator';
import { parseSession, seedSession } from '../../src/lib/persistence';

describe('metre scale and physical access', () => {
  it('every visible object part matches its declared bounding dimensions', () => {
    for (const object of objects) for (const part of objectParts(object)) {
      for (let axis = 0; axis < 3; axis++) {
        const min = part.position[axis] - part.size[axis] / 2;
        const max = part.position[axis] + part.size[axis] / 2;
        expect(min, `${object.id}, axis ${axis} minimum`).toBeGreaterThanOrEqual((axis === 1 ? 0 : -object.size[axis] / 2) - .001);
        expect(max, `${object.id}, axis ${axis} maximum`).toBeLessThanOrEqual((axis === 1 ? object.size[axis] : object.size[axis] / 2) + .001);
      }
    }
  });
  it('blocks closed doors, fits a 70 cm chair through the 96 cm opening, rejects a 105 cm chair', () => {
    const start = { x: 5.65, z: 2, yaw: 0 };
    const closed = moveWithCollisions(start, 0, 2.4, 0, defaultMobility, worldObstacles([]));
    expect(closed.blocked).toBeDefined(); expect(closed.pose.z).toBeLessThan(3.1);
    const narrow = moveWithCollisions(start, 0, 2.4, 0, defaultMobility, worldObstacles(['restroom-door']));
    expect(narrow.blocked).toBeUndefined(); expect(narrow.pose.z).toBeCloseTo(4.4);
    const wide = moveWithCollisions(start, 0, 2.4, 0, { ...defaultMobility, widthCm: 105 }, worldObstacles(['restroom-door']));
    expect(wide.blocked).toBeDefined(); expect(wide.pose.z).toBeLessThan(3.1);
  });
  it('uses length and orientation, cannot tunnel through a wall in a large timestep', () => {
    const wall = { id: 'wall', name: 'Wall', x: 0, z: 0, width: 10, depth: .14, yaw: 0 };
    const result = moveWithCollisions({ x: 0, z: 2, yaw: 0 }, 0, -4, 0, defaultMobility, [wall]);
    expect(result.pose.z).toBeGreaterThan(.6);
    const long = { ...defaultMobility, lengthCm: 170 };
    expect(blockingAt({ x: -6, z: 0, yaw: Math.PI / 2 }, long, worldObstacles(['desk-door']))).toBeDefined();
    expect(overlaps({ ...wall, width: .7, depth: 1.7, yaw: Math.PI / 2 }, { ...wall, x: .8, width: .1, depth: 5 })).toBe(true);
  });
  it('requires proximity and line of sight, and protects the door swing', () => {
    const door = objectById('entry-door')!;
    expect(canInteract(SPAWN, door, worldObstacles([]), [])).toBe(true);
    expect(canInteract({ ...SPAWN, x: 4 }, door, worldObstacles([]), [])).toBe(false);
    const separator = { id: 'divider', name: 'Wall', x: 0, z: 7.7, width: 4, depth: .14, yaw: 0 };
    expect(canInteract(SPAWN, door, [separator], [])).toBe(false);
    expect(doorCanToggle(door, [], SPAWN, defaultMobility)).toBe(true);
    expect(doorCanToggle(door, [], { x: 0, z: 6.5, yaw: 0 }, defaultMobility)).toBe(false);
  });
  it('keeps valid dimensions and migrates old saved sessions without losing their data', () => {
    expect(mobilitySchema.safeParse({ ...defaultMobility, widthCm: 0 }).success).toBe(false);
    expect(mobilitySchema.safeParse({ ...defaultMobility, lengthCm: NaN }).success).toBe(false);
    expect(mobilitySchema.safeParse({ ...defaultMobility, seatHeightCm: 75, armrestHeightCm: 60 }).success).toBe(false);
    const session = seedSession();
    const { mobility, inspectedIds, playerPose, openDoors, ...legacy } = session;
    const upgraded = parseSession(JSON.stringify(legacy));
    expect(upgraded.id).toBe(session.id); expect(upgraded.mobility).toEqual(defaultMobility); expect(upgraded.playerPose).toEqual(SPAWN);
  });
});
