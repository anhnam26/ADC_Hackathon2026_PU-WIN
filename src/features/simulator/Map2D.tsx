import { useLocale } from '../../lib/i18n';
import { useEffect, type MutableRefObject } from "react";
import { wallsOnFloor } from "../../data/space";
import { roomZones } from '../../data/building';
import { objectObstacles } from "../../lib/objectGeometry";
import { footprint } from "../../lib/physics";
import type { MobilityProfile, Pose, WorldObject } from "../../types/simulator";

export default function Map2D({
  pose,
  profile,
  openDoors,
  nearest,
  onSelect,
  cameraYaw,
  sceneObjects,
  route,
}: {
  pose: Pose;
  profile: MobilityProfile;
  openDoors: string[];
  nearest: string | null;
  onSelect: (id: string) => void;
  cameraYaw: MutableRefObject<number>;
  sceneObjects: WorldObject[];
  route: Pose[];
}) {
  const { t, language } = useLocale();
  useEffect(() => {
    cameraYaw.current = 0;
  }, [cameraYaw]);
  const body = footprint(profile);
  const floor=pose.floor ?? 1;
  return (
    <svg
      className="simulation-map2d"
      viewBox={floor===1 ? '-12.8 -20.8 25.6 35.6' : '-12.8 -20.8 25.6 28.6'}
      role="img"
      aria-label={t("Văn phòng nhìn từ trên, dùng WASD hoặc các nút điều khiển để di chuyển")}
    >
      <rect x="-12" y="-20" width="24" height={floor===1?34:27} fill="#e7edde" />
      <rect x="-12" y="-20" width="24" height="27" fill="#f1eee1" />
      {floor===1 && <><rect x="-1.5" y="7" width="3" height="7" fill="#d5d2c2"/><rect x="-12" y="12.2" width="24" height="1.7" fill="#a1adb1"/><rect x="-12" y="-10" width="9" height="10" fill="#d7e4cd" />
      <rect x="3.5" y="-10" width="8.5" height="10" fill="#eadcc4" />
      <rect x="3.5" y="3.4" width="8.5" height="3.6" fill="#d4e4d9" /></>}
      {roomZones.filter(r=>r.floor===floor).map(r=><g key={r.label}><rect x={r.x-r.width/2} y={r.z-r.depth/2} width={r.width} height={r.depth} fill={r.color}/><text x={r.x} y={r.z+1} textAnchor="middle" fontSize=".3" fill="#324d42">{t(r.label)}</text></g>)}
      {wallsOnFloor(floor).map((w) => (
        <rect
          key={w.id}
          x={w.position[0] - w.size[0] / 2}
          y={w.position[2] - w.size[2] / 2}
          width={w.size[0]}
          height={w.size[2]}
          fill="#8da189"
        />
      ))}
      {route.length > 0 && <polyline data-testid="floor-route" points={[pose,...route].map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke="#c99a16" strokeWidth=".12" />}
      {sceneObjects.map((o) => (
        <g key={o.id} data-object-id={o.id} data-x={o.position[0].toFixed(3)} data-z={o.position[2].toFixed(3)} onClick={() => onSelect(o.id)} cursor="pointer">
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
          <title>{t(o.name)}</title>
          {o.roomLabel && <text x={o.position[0]} y={o.position[2] - .25} textAnchor="middle" fontSize=".23" fill="#234b32">{t(o.roomLabel)}</text>}
        </g>
      ))}
      {(floor===1 ? [
        [-6, -6.4, t("BÀN LÀM VIỆC")],
        [6.1, -6.4, t("PHÒNG LOTUS")],
        [-5.5, 1.8, "PANTRY"],
        [6.2, 6.8, "WC"],
        [0, 5.5, t("LỄ TÂN")],
      ] : []).map(([x, z, name]) => (
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
      >{t("BẠN")}</text>
    </svg>
  );
}
