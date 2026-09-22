import { objectObstacles } from './objectGeometry';
import { bodyAt, overlaps, moveWithCollisions } from './physics';
import { defaultMobility, type MobilityProfile, type Obstacle, type Pose, type WorldObject } from '../types/simulator';

export function advanceColleagues(scene: WorldObject[], waypoint: Map<string, number>, dt: number, player: Pose, profile: MobilityProfile, staticObstacles: Obstacle[], paused: boolean, yielding = new Set<string>()) {
  for (const person of scene.filter(o => o.patrol)) {
    if(yielding.has(person.id))continue;
    person.walking = false;
    if (paused || Math.hypot(person.position[0] - player.x, person.position[2] - player.z) < 1.9) continue;
    const index = waypoint.get(person.id) ?? 1;
    const target = person.patrol![index];
    const dx = target[0] - person.position[0], dz = target[1] - person.position[2], distance = Math.hypot(dx, dz);
    if (distance < .08) { waypoint.set(person.id, (index + 1) % person.patrol!.length); continue; }
    const yaw = Math.atan2(-dx, -dz), step = Math.min(distance, .58 * dt);
    const others = scene.filter(o => o.colleague && o.id !== person.id).flatMap(o => objectObstacles(o));
    const npcProfile = { ...defaultMobility, widthCm: 58, lengthCm: 58 };
    const start = { x: person.position[0], z: person.position[2], yaw };
    const playerBody = bodyAt(player, profile);
    // A little space around the player makes pedestrians yield before touching the chair.
    playerBody.width += .3; playerBody.depth += .3;
    const result = moveWithCollisions(start, dx / distance * step, dz / distance * step, 0, npcProfile, [...staticObstacles, ...others, playerBody]);
    if (!result.blocked && !overlaps(bodyAt(result.pose, npcProfile), playerBody)) {
      person.position = [result.pose.x, 0, result.pose.z]; person.yaw = yaw; person.walking = true;
    }
  }
}
