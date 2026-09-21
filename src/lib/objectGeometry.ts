import type { Part, WorldObject, Obstacle } from '../types/simulator';
import { walls, objects } from '../data/space';

// The same parts drive 3D, object illustrations, and collision footprints.
export function objectParts(o: WorldObject, open = false): Part[] {
  const [w, h, d] = o.size;
  const b = (x: number, y: number, z: number, width: number, height: number, depth: number, color = o.color, solid = true, yaw = 0): Part => ({ position: [x, y, z], size: [width, height, depth], color, solid, yaw });
  if (o.kind === 'door') {
    const cw = o.clearWidth!, a = open ? -Math.PI / 2 : 0;
    const leafX = -cw / 2 + Math.cos(a) * cw / 2, leafZ = -Math.sin(a) * cw / 2;
    return [b(-cw / 2 - .03, h / 2, 0, .06, h, d, '#a9b6a8'), b(cw / 2 + .03, h / 2, 0, .06, h, d, '#a9b6a8'), b(0, h - .035, 0, w, .07, d, '#a9b6a8', false),
      b(leafX, (h - .1) / 2, leafZ, cw, h - .1, .045, o.color, true, a),
      b(-cw / 2 + Math.cos(a) * (cw - .15) + Math.sin(a) * .07, o.controlHeight!, -Math.sin(a) * (cw - .15) + Math.cos(a) * .07, .16, .03, .035, '#cdb67b', false, a)];
  }
  if (o.kind === 'desk') return [b(0, h - .03, 0, w, .06, d), ...[-1, 1].flatMap(s => [b(s * (w / 2 - .04), (h - .06) / 2, 0, .08, h - .06, d * .85, '#dde2d8')]),
    ...(o.id.startsWith('desk') ? [b(0, h + .19, -d * .23, .46, .28, .04, '#33574f', false), b(0, h + .04, -d * .23, .04, .08, .06, '#33574f', false), b(0, h + .007, .12, .36, .014, .13, '#98aca2', false)] : [])];
  if (o.kind === 'chair') return [b(0, .43, 0, w, .06, d), b(0, .69, -d / 2 + .04, w, .42, .08), b(0, .215, 0, .08, .43, .08, '#7f8e83'), b(0, .03, 0, w * .9, .06, d * .9, '#7f8e83')];
  if (o.kind === 'counter') return [b(0, (h - .04) / 2, 0, w - .04, h - .04, d - .04), b(0, h - .02, 0, w, .04, d, '#efe4cf')];
  if (o.kind === 'water') return [b(0, h / 2, 0, w, h, d), b(0, .88, d / 2 + .007, w * .78, .24, .016, '#416158', false), b(-.07, .95, d / 2 + .035, .05, .03, .06, '#557cab', false), b(.07, .95, d / 2 + .035, .05, .03, .06, '#b97860', false), b(0, .82, d / 2 + .04, w * .82, .02, .11, '#6e8f82', false), b(0, h + .14, 0, .22, .28, .22, '#a7cccf', false)];
  if (o.kind === 'printer') return [b(0, h * .38, 0, w, h * .76, d), b(0, h * .88, 0, w, h * .24, d, '#6d8b80'), b(0, .82, d / 2 + .01, w * .75, .045, .06, '#254b41', false), b(.18, .98, d / 2 + .015, .18, .1, .02, '#a3d2c8', false)];
  if (o.kind === 'sofa') return [b(0, .26, 0, w, .36, d), b(0, .62, -d / 2 + .09, w, .4, .18), b(-w / 2 + .09, .51, 0, .18, .25, d), b(w / 2 - .09, .51, 0, .18, .25, d)];
  if (o.kind === 'toilet') return [b(0, .23, .08, w, .46, d * .7, '#e9eee7'), b(0, .52, -d * .34, w, .56, .2, '#d3dfd7'), b(.37, .72, .03, .035, .035, .65, '#6b8d80'), b(.37, .39, -.27, .035, .65, .035, '#6b8d80')];
  if (o.kind === 'sink') return [b(0, .73, 0, w, .14, d, '#e0e9df'), b(0, .86, -d / 2 + .05, .035, .12, .12, '#6b8d80', false), b(-w / 2 + .035, .33, -.05, .07, .66, .08, '#b5c8bd'), b(w / 2 - .035, .33, -.05, .07, .66, .08, '#b5c8bd')];
  if (o.kind === 'screen') return [b(0, .025, 0, w * .5, .05, .4, '#749187'), b(0, .5, 0, .07, 1, .07, '#749187'), b(0, 1.21, 0, w, .88, d, '#34574b'), b(0, 1.21, d / 2 + .01, w - .07, .81, .02, '#aacdbf', false)];
  return [b(0, .23, 0, w, .46, d, '#c4ad8d'), { ...b(0, .87, 0, w * .9, .86, d * .9, o.color, false), shape: 'sphere' }];
}
export function objectObstacles(o: WorldObject, open = false): Obstacle[] {
  // Table and sink top projections are intentionally conservative; knee-under-desk positioning is not simulated.
  return objectParts(o, open).filter(p => p.solid).map((p, i) => ({ id: o.id, name: o.name, x: o.position[0] + Math.cos(o.yaw) * p.position[0] + Math.sin(o.yaw) * p.position[2], z: o.position[2] - Math.sin(o.yaw) * p.position[0] + Math.cos(o.yaw) * p.position[2], width: p.size[0], depth: p.size[2], yaw: o.yaw + (p.yaw ?? 0) }));
}
export function worldObstacles(openDoors: string[]): Obstacle[] {
  return [...walls.map(w => ({ id: w.id, name: 'Tường / khung phòng', x: w.position[0], z: w.position[2], width: w.size[0], depth: w.size[2], yaw: 0 })), ...objects.flatMap(o => objectObstacles(o, openDoors.includes(o.id)))];
}
