import { useEffect, type MutableRefObject } from "react";
import { objects, walls } from "../../data/space";
import { objectObstacles } from "../../lib/objectGeometry";
import { footprint } from "../../lib/physics";
import type { MobilityProfile, Pose } from "../../types/simulator";

export default function Map2D({
  pose,
  profile,
  openDoors,
  nearest,
  onSelect,
  cameraYaw,
}: {
  pose: Pose;
  profile: MobilityProfile;
  openDoors: string[];
  nearest: string | null;
  onSelect: (id: string) => void;
  cameraYaw: MutableRefObject<number>;
}) {
  useEffect(() => {
    cameraYaw.current = 0;
  }, [cameraYaw]);
  const body = footprint(profile);
  return (
    <svg
      className="simulation-map2d"
      viewBox="-9.8 -7.8 19.6 18"
      role="img"
      aria-label="Văn phòng nhìn từ trên, dùng WASD hoặc các nút điều khiển để di chuyển"
    >
      <rect x="-9" y="-7" width="18" height="16.5" fill="#e7edde" />
      <rect x="-9" y="-7" width="18" height="14" fill="#f1eee1" />
      <rect x="-9" y="-7" width="6" height="7" fill="#d7e4cd" />
      <rect x="3.5" y="-7" width="5.5" height="7" fill="#eadcc4" />
      <rect x="3.5" y="3.4" width="5.5" height="3.6" fill="#d4e4d9" />
      {walls.map((w) => (
        <rect
          key={w.id}
          x={w.position[0] - w.size[0] / 2}
          y={w.position[2] - w.size[2] / 2}
          width={w.size[0]}
          height={w.size[2]}
          fill="#8da189"
        />
      ))}
      {objects.map((o) => (
        <g key={o.id} onClick={() => onSelect(o.id)} cursor="pointer">
          {objectObstacles(o, openDoors.includes(o.id)).map((b, i) => (
            <rect
              key={i}
              x={b.x - b.width / 2}
              y={b.z - b.depth / 2}
              width={b.width}
              height={b.depth}
              transform={`rotate(${(-b.yaw * 180) / Math.PI} ${b.x} ${b.z})`}
              fill={o.color}
              stroke={nearest === o.id ? "#246b4a" : "#899b7e"}
              strokeWidth={nearest === o.id ? 0.07 : 0.025}
            />
          ))}
          <title>{o.name}</title>
        </g>
      ))}
      {[
        [-6, -6.4, "BÀN LÀM VIỆC"],
        [6.1, -6.4, "PHÒNG LOTUS"],
        [-5.5, 1.8, "PANTRY"],
        [6.2, 6.8, "WC"],
        [0, 5.5, "LỄ TÂN"],
      ].map(([x, z, name]) => (
        <text
          key={name}
          x={Number(x)}
          y={Number(z)}
          fontSize=".28"
          textAnchor="middle"
          fill="#506447"
        >
          {name}
        </text>
      ))}
      <g
        transform={`translate(${pose.x} ${pose.z}) rotate(${(-pose.yaw * 180) / Math.PI})`}
      >
        <rect
          x={-body.width / 2}
          y={-body.depth / 2}
          width={body.width}
          height={body.depth}
          rx=".05"
          fill="#71935b"
          fillOpacity=".3"
          stroke="#386044"
          strokeWidth=".045"
        />
        <rect
          x={-body.width / 2 + 0.08}
          y={-body.depth / 2 + 0.14}
          width={body.width - 0.16}
          height={body.depth * 0.55}
          rx=".07"
          fill="#2d694d"
        />
        {profile.mode === "wheelchair" &&
          [-1, 1].map((s) => (
            <rect
              key={s}
              x={s * (body.width / 2 - 0.03) - 0.03}
              y={-body.depth * 0.15}
              width=".06"
              height={body.depth * 0.48}
              rx=".03"
              fill="#273e32"
            />
          ))}
        <path
          d="M0 -.2L-.1 -.05H.1Z"
          transform={`translate(0 ${-body.depth / 2 - 0.07})`}
          fill="#234b32"
        />
      </g>
      <text
        x={pose.x}
        y={pose.z + body.depth / 2 + 0.38}
        fontSize=".3"
        textAnchor="middle"
        fill="#234b32"
      >
        BẠN
      </text>
    </svg>
  );
}
