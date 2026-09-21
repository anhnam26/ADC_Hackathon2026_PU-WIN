import type { Part, WorldObject, Obstacle } from "../types/simulator";
import { walls, objects } from "../data/space";

// The same parts drive 3D, object illustrations, and collision footprints.
export function objectParts(o: WorldObject, open = false, doorAngle?: number): Part[] {
  const [w, h, d] = o.size;
  const b = (
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    color = o.color,
    solid = true,
    yaw = 0,
  ): Part => ({
    position: [x, y, z],
    size: [width, height, depth],
    color,
    solid,
    yaw,
  });
  if (o.kind === 'colleague') {
    const skin = o.colleague!.skin, hair = o.colleague!.hair;
    return [
      b(0, h * .59, 0, .34, h * .31, .26),
      b(-.22, h * .57, 0, .1, h * .31, .2), b(.22, h * .57, 0, .1, h * .31, .2),
      b(-.22, h * .39, 0, .09, .12, .15, skin), b(.22, h * .39, 0, .09, .12, .15, skin),
      b(-.1, h * .23, 0, .14, h * .46, .23, '#334653'), b(.1, h * .23, 0, .14, h * .46, .23, '#334653'),
      b(-.1, .05, -.04, .16, .1, .3, '#263438'), b(.1, .05, -.04, .16, .1, .3, '#263438'),
      { ...b(0, h - .18, 0, .29, .34, .29, skin, false), shape: 'sphere' },
      b(0, h - .045, .025, .28, .09, .25, hair, false),
      b(-.06, h - .15, -.139, .022, .022, .01, '#28302c', false), b(.06, h - .15, -.139, .022, .022, .01, '#28302c', false),
      b(.08, h * .63, -.138, .09, .12, .013, '#eceddf', false),
    ];
  }
  if (o.kind === "door") {
    const cw = o.clearWidth!, leafWidth = cw + .045, hinge = -leafWidth / 2,
      a = doorAngle ?? (open ? Math.PI / 2 : 0);
    const leafX = hinge + Math.cos(a) * leafWidth / 2,
      leafZ = -Math.sin(a) * leafWidth / 2;
    return [
      b(-cw / 2 - 0.03, h / 2, 0, 0.06, h, d, "#a9b6a8"),
      b(cw / 2 + 0.03, h / 2, 0, 0.06, h, d, "#a9b6a8"),
      b(0, h - 0.035, 0, w, 0.07, d, "#a9b6a8", false),
      b(leafX, (h - 0.1) / 2, leafZ, leafWidth, h - 0.1, 0.045, o.color, true, a),
      b(
        hinge + Math.cos(a) * (leafWidth - 0.15) + Math.sin(a) * 0.07,
        o.controlHeight!,
        -Math.sin(a) * (leafWidth - 0.15) + Math.cos(a) * 0.07,
        0.16,
        0.03,
        0.035,
        "#cdb67b",
        false,
        a,
      ),
    ];
  }
  if (o.kind === "desk")
    return [
      b(0, h - 0.03, 0, w, 0.06, d),
      ...[-1, 1].flatMap((s) => [
        b(
          s * (w / 2 - 0.04),
          (h - 0.06) / 2,
          0,
          0.08,
          h - 0.06,
          d * 0.85,
          "#dde2d8",
        ),
      ]),
    ];
  if (o.kind === "chair")
    return [
      b(0, 0.43, 0, w, 0.06, d),
      b(0, 0.69, -d / 2 + 0.04, w, 0.42, 0.08),
      b(0, 0.215, 0, 0.08, 0.43, 0.08, "#7f8e83"),
      b(0, 0.03, 0, w * 0.9, 0.06, d * 0.9, "#7f8e83"),
    ];
  if (o.kind === "counter")
    return [
      b(0, (h - 0.04) / 2, 0, w - 0.04, h - 0.04, d - 0.04),
      b(0, h - 0.02, 0, w, 0.04, d, "#efe4cf"),
    ];
  if (o.kind === "water")
    return [
      b(0, (h - .28) / 2, -.06, w, h - .28, d - .12),
      b(0, .88, d / 2 - .112, w * .78, .24, .016, '#416158', false),
      b(-.07, .95, d / 2 - .08, .05, .03, .06, '#557cab', false),
      b(.07, .95, d / 2 - .08, .05, .03, .06, '#b97860', false),
      b(0, .82, d / 2 - .055, w * .82, .02, .11, '#6e8f82'),
      b(0, h - .14, -.06, .22, .28, .22, '#a7cccf', false),
    ];
  if (o.kind === "printer")
    return [
      b(0, h * .38, -.04, w, h * .76, d - .08),
      b(0, h * .88, -.04, w, h * .24, d - .08, '#6d8b80'),
      b(0, .82, d / 2 - .03, w * .75, .045, .06, '#254b41'),
      b(.18, .98, d / 2 - .015, .18, .06, .02, '#a3d2c8', false),
    ];
  if (o.kind === "sofa")
    return [
      b(0, 0.26, 0, w, 0.36, d),
      b(0, 0.62, -d / 2 + 0.09, w, 0.4, 0.18),
      b(-w / 2 + 0.09, 0.51, 0, 0.18, 0.25, d),
      b(w / 2 - 0.09, 0.51, 0, 0.18, 0.25, d),
    ];
  if (o.kind === "toilet")
    return [
      b(-.13, 0.23, 0.08, .42, 0.46, d * 0.7, "#e9eee7"),
      b(-.13, 0.52, -d * 0.34, .42, 0.56, 0.2, "#d3dfd7"),
      b(0.37, 0.72, 0.03, 0.035, 0.035, 0.65, "#6b8d80"),
      b(0.37, 0.39, -0.27, 0.035, 0.65, 0.035, "#6b8d80"),
    ];
  if (o.kind === "sink")
    return [
      b(0, 0.73, 0, w, 0.14, d, "#e0e9df"),
      b(0, 0.86, -d / 2 + 0.06, 0.035, 0.12, 0.12, "#6b8d80", false),
      b(-w / 2 + 0.035, 0.33, -0.05, 0.07, 0.66, 0.08, "#b5c8bd"),
      b(w / 2 - 0.035, 0.33, -0.05, 0.07, 0.66, 0.08, "#b5c8bd"),
    ];
  if (o.kind === "screen")
    return [
      b(0, .0175, 0, w * .5, .035, d, '#749187'),
      b(0, h * .24, 0, .04, h * .48, .04, '#749187'),
      b(0, h * .71, 0, w, h * .58, .04, '#34574b'),
      b(0, h * .71, .025, w - .035, h * .58 - .035, .01, '#aacdbf', false),
    ];
  return [
    b(0, 0.23, 0, w, 0.46, d, "#c4ad8d"),
    {
      ...b(0, 0.87, 0, w * 0.9, 0.86, d * 0.9, o.color, false),
      shape: "sphere",
    },
  ];
}
export function objectObstacles(o: WorldObject, open = false, doorAngle?: number): Obstacle[] {
  // Table and sink top projections are intentionally conservative; knee-under-desk positioning is not simulated.
  return objectParts(o, open, doorAngle)
    .filter((p) => p.solid)
    .map((p, i) => ({
      id: o.id,
      name: o.name,
      x:
        o.position[0] +
        Math.cos(o.yaw) * p.position[0] +
        Math.sin(o.yaw) * p.position[2],
      z:
        o.position[2] -
        Math.sin(o.yaw) * p.position[0] +
        Math.cos(o.yaw) * p.position[2],
      width: p.size[0],
      depth: p.size[2],
      yaw: o.yaw + (p.yaw ?? 0),
    }));
}
export function worldObstacles(openDoors: string[]): Obstacle[] {
  return [
    ...walls.map((w) => ({
      id: w.id,
      name: "Tường / khung phòng",
      x: w.position[0],
      z: w.position[2],
      width: w.size[0],
      depth: w.size[2],
      yaw: 0,
    })),
    ...objects.flatMap((o) => objectObstacles(o, openDoors.includes(o.id))),
  ];
}
