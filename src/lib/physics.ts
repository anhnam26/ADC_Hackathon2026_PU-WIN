import type { MobilityProfile, Obstacle, Pose, WorldObject } from '../types/simulator';
import { WORLD } from '../data/space';
import { objectObstacles } from './objectGeometry';

export const footprint = (p: MobilityProfile) => p.mode === 'walking' ? { width: .46, depth: .4 } : { width: p.widthCm / 100, depth: p.lengthCm / 100 };
export function overlaps(a: Obstacle, b: Obstacle, margin = .005): boolean {
  const axes = [a.yaw, a.yaw + Math.PI / 2, b.yaw, b.yaw + Math.PI / 2];
  return axes.every(angle => {
    const nx = Math.cos(angle), nz = -Math.sin(angle);
    const project = (o: Obstacle) => Math.abs(nx * Math.cos(o.yaw) - nz * Math.sin(o.yaw)) * o.width / 2 + Math.abs(nx * Math.sin(o.yaw) + nz * Math.cos(o.yaw)) * o.depth / 2;
    return Math.abs((a.x - b.x) * nx + (a.z - b.z) * nz) < project(a) + project(b) + margin;
  });
}
export function bodyAt(pose: Pose, profile: MobilityProfile): Obstacle {
  return { id: 'player', name: 'Bạn', ...pose, ...footprint(profile) };
}
export function blockingAt(pose: Pose, profile: MobilityProfile, obstacles: Obstacle[]): Obstacle | undefined {
  const body = bodyAt(pose, profile), halfX = Math.abs(Math.cos(pose.yaw)) * body.width / 2 + Math.abs(Math.sin(pose.yaw)) * body.depth / 2, halfZ = Math.abs(Math.sin(pose.yaw)) * body.width / 2 + Math.abs(Math.cos(pose.yaw)) * body.depth / 2;
  if (pose.x - halfX < WORLD.minX || pose.x + halfX > WORLD.maxX || pose.z - halfZ < WORLD.minZ || pose.z + halfZ > WORLD.maxZ) return { ...body, id: 'boundary', name: 'Ranh giới văn phòng' };
  return obstacles.find(o => overlaps(body, o));
}
export interface CollisionContact {obstacle:Obstacle;pose:Pose;action:'rotation'|'translation'}
export function moveWithCollisions(pose: Pose, dx: number, dz: number, yawChange: number, profile: MobilityProfile, obstacles: Obstacle[]): { pose: Pose; blocked?: Obstacle;contacts:CollisionContact[] } {
  let next = { ...pose }; let blocked: Obstacle | undefined;
  const contacts=new Map<string,CollisionContact>();
  // Substeps prevent tunnelling through 14 cm walls, even after a long frame.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .025), Math.ceil(Math.abs(yawChange) / .035));
  for (let i = 0; i < steps; i++) {
    const turned = { ...next, yaw: next.yaw + yawChange / steps };
    const turnHit = blockingAt(turned, profile, obstacles);
    if (turnHit) {blocked = turnHit;if(yawChange&&!contacts.has(turnHit.id))contacts.set(turnHit.id,{obstacle:turnHit,pose:turned,action:'rotation'});} else next = turned;
    const moved = { ...next, x: next.x + dx / steps, z: next.z + dz / steps };
    const hit = blockingAt(moved, profile, obstacles);
    if (hit) { blocked = hit;if((dx||dz)&&!contacts.has(hit.id))contacts.set(hit.id,{obstacle:hit,pose:moved,action:'translation'});break; } else next = moved;
  }
  next.yaw = Math.atan2(Math.sin(next.yaw), Math.cos(next.yaw));
  return { pose: next, blocked,contacts:[...contacts.values()] };
}
export function distanceToObstacle(pose: Pose, box: Obstacle): number {
  const dx = pose.x - box.x, dz = pose.z - box.z;
  const lx = Math.cos(box.yaw) * dx - Math.sin(box.yaw) * dz;
  const lz = Math.sin(box.yaw) * dx + Math.cos(box.yaw) * dz;
  return Math.hypot(Math.max(0, Math.abs(lx) - box.width / 2), Math.max(0, Math.abs(lz) - box.depth / 2));
}
export function objectDistance(pose: Pose, object: WorldObject, openDoors: string[]): number {
  if ((pose.floor ?? 1) !== (object.floor ?? 1)) return Infinity;
  return Math.min(...objectObstacles(object, openDoors.includes(object.id)).map(b => distanceToObstacle(pose, b)));
}
function pointInside(x: number, z: number, b: Obstacle) {
  return distanceToObstacle({ x, z, yaw: 0 }, b) < .008;
}
export function canInteract(pose: Pose, object: WorldObject, obstacles: Obstacle[], openDoors: string[]): boolean {
  if (objectDistance(pose, object, openDoors) > WORLD.interactionRange) return false;
  // Do not allow F through a separating wall or another piece of furniture.
  const target = { x: object.position[0], z: object.position[2] };
  const count = Math.ceil(Math.hypot(target.x - pose.x, target.z - pose.z) / .04);
  for (let i = 1; i < count; i++) {
    const t = i / count;
    if (obstacles.some(b => b.id !== object.id && pointInside(pose.x + (target.x - pose.x) * t, pose.z + (target.z - pose.z) * t, b))) return false;
  }
  return true;
}
export function doorCanToggle(o: WorldObject, openDoors: string[], pose: Pose, profile: MobilityProfile): boolean {
  const isOpen = openDoors.includes(o.id), body = bodyAt(pose, profile);
  // Sweep the leaf through the entire quarter turn, not just its destination.
  for (let i = 0; i <= 30; i++) {
    const a = (isOpen ? 1 - i / 30 : i / 30) * Math.PI / 2;
    if (objectObstacles(o, false, a).some(part => overlaps(body, part, .001))) return false;
  }
  return true;
}
