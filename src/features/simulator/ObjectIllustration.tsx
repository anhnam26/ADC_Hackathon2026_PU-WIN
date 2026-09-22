import { objectParts } from "../../lib/objectGeometry";
import { useLocale } from '../../lib/i18n';
import type { MobilityProfile, WorldObject } from "../../types/simulator";
import type { Point } from "../../types/domain";

export default function ObjectIllustration({
  object,
  open = false,
}: {
  object: WorldObject;
  open?: boolean;
}) {
  const {t,language}=useLocale();
  const parts = objectParts(object, open);
  const scale = Math.min(
    145 / Math.max(object.size[0], object.size[2]),
    152 / Math.max(object.size[1], 1),
  );
  const project = ([x, y, z]: Point) => [
    200 + (x - z) * scale * 0.82,
    200 + (x + z) * scale * 0.34 - y * scale,
  ];
  const polygons = parts
    .map((p, index) => {
      const [w, h, d] = p.size;
      const vertices = [
        [-w / 2, -h / 2, -d / 2],
        [w / 2, -h / 2, -d / 2],
        [w / 2, -h / 2, d / 2],
        [-w / 2, -h / 2, d / 2],
        [-w / 2, h / 2, -d / 2],
        [w / 2, h / 2, -d / 2],
        [w / 2, h / 2, d / 2],
        [-w / 2, h / 2, d / 2],
      ].map(([x, y, z]) =>
        project([
          Math.cos(p.yaw ?? 0) * x + Math.sin(p.yaw ?? 0) * z + p.position[0],
          y + p.position[1],
          -Math.sin(p.yaw ?? 0) * x + Math.cos(p.yaw ?? 0) * z + p.position[2],
        ]),
      );
      return {
        depth: p.position[0] + p.position[2],
        index,
        faces: [
          [0, 1, 5, 4],
          [1, 2, 6, 5],
          [2, 3, 7, 6],
          [4, 5, 6, 7],
        ].map((face, f) => ({
          points: face.map((i) => vertices[i].join(",")).join(" "),
          color: p.color,
          shade: f === 3 ? 0.03 : f === 1 ? 0.12 : 0.06,
        })),
      };
    })
    .sort((a, b) => a.depth - b.depth);
  return (
    <svg
      className="object-illustration"
      viewBox="0 0 400 260"
      role="img"
      aria-label={language==='en' ? `Illustration of ${t(object.name)}: width ${Math.round(object.size[0]*100)} cm, height ${Math.round(object.size[1]*100)} cm, depth ${Math.round(object.size[2]*100)} cm` : `Minh họa ${object.name}: rộng ${Math.round(object.size[0] * 100)} cm, cao ${Math.round(object.size[1] * 100)} cm, sâu ${Math.round(object.size[2] * 100)} cm`}
    >
      <defs>
        <pattern
          id={`grid-${object.id}`}
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="#dfe7d9"
            strokeWidth=".6"
          />
        </pattern>
      </defs>
      <rect width="400" height="260" rx="12" fill="#f2f5ed" />
      <rect width="400" height="260" rx="12" fill={`url(#grid-${object.id})`} />
      <ellipse cx="200" cy="204" rx="104" ry="17" fill="#b7c7b0" opacity=".2" />
      {polygons.map((p) => (
        <g key={p.index}>
          {p.faces.map((f, i) => (
            <g key={i}>
              <polygon
                points={f.points}
                fill={f.color}
                stroke="#425b4d"
                strokeWidth=".5"
                strokeOpacity=".2"
              />
              <polygon points={f.points} fill="#193c28" opacity={f.shade} />
            </g>
          ))}
        </g>
      ))}
      <path
        d="M52 38V202M47 38H57M47 202H57M112 232H293M112 227V237M293 227V237"
        fill="none"
        stroke="#759369"
        strokeWidth="1"
      />
      <text
        x="42"
        y="124"
        transform="rotate(-90 42 124)"
        textAnchor="middle"
        fontSize="11"
        fill="#42603b"
      >
        {t('Cao')} {Math.round(object.size[1] * 100)} cm
      </text>
      <text x="201" y="251" textAnchor="middle" fontSize="11" fill="#42603b">
        {t('Rộng')} {Math.round(object.size[0] * 100)} cm · {t('Sâu')}{" "}
        {Math.round(object.size[2] * 100)} cm
      </text>
      <text x="382" y="23" textAnchor="end" fontSize="9" fill="#5e7252">
        {language==='vi'?'GÓC NHÌN CHI TIẾT':'DETAIL VIEW'}
      </text>
    </svg>
  );
}
export function WheelchairDiagram({ profile }: { profile: MobilityProfile }) {
  const {language}=useLocale();
  const width = (Number.isFinite(profile.widthCm) ? profile.widthCm : 70) * 1.1,
    length = (Number.isFinite(profile.lengthCm) ? profile.lengthCm : 110) * 0.8;
  return (
    <svg
      viewBox="0 0 280 190"
      className="chair-diagram"
      role="img"
      aria-label={language==='en' ? `Wheelchair footprint: width ${profile.widthCm} cm, length ${profile.lengthCm} cm` : `Dấu chiếm chỗ xe lăn: rộng ${profile.widthCm} cm, dài ${profile.lengthCm} cm`}
    >
      <rect width="280" height="190" rx="12" fill="#eef3e7" />
      <rect
        x={140 - width / 2}
        y={90 - length / 2}
        width={width}
        height={length}
        rx="5"
        fill="#bfd5aa"
        fillOpacity=".3"
        stroke="#88a66a"
        strokeDasharray="4 4"
      />
      <rect
        x={140 - width / 2 + 10}
        y={90 - length / 2 + 22}
        width={Math.max(20, width - 20)}
        height={length * 0.47}
        rx="7"
        fill="#467957"
      />
      <rect
        x={140 - width / 2 + 10}
        y={90 + length * 0.08}
        width={Math.max(20, width - 20)}
        height="9"
        rx="3"
        fill="#315842"
      />
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect
            x={140 + s * (width / 2 - 4) - 4}
            y={90 - length / 2 + 24}
            width="8"
            height={length * 0.5}
            rx="4"
            fill="#35483c"
          />
          <circle
            cx={140 + s * width * 0.34}
            cy={90 - length / 2 + 7}
            r="5"
            fill="#35483c"
          />
        </g>
      ))}
      <path d={`M${140 - width / 2} 162H${140 + width / 2}`} stroke="#6f8a56" />
      <text x="140" y="179" textAnchor="middle" fontSize="12" fill="#42613a">
        {language==='vi'?`Rộng ${profile.widthCm} cm (cả bánh xe)`:`Width ${profile.widthCm} cm (with wheels)`}
      </text>
      <text
        x="250"
        y="100"
        transform="rotate(-90 250 100)"
        textAnchor="middle"
        fontSize="11"
        fill="#42613a"
      >
        {language==='vi'?`Dài ${profile.lengthCm} cm (cả gác chân)`:`Length ${profile.lengthCm} cm (with footrests)`}
      </text>
      <text x="140" y="18" textAnchor="middle" fontSize="10" fill="#607c4c">
        {language==='vi'?'ĐẦU XE ↑ · NHÌN TỪ TRÊN':'FRONT ↑ · TOP VIEW'}
      </text>
    </svg>
  );
}
