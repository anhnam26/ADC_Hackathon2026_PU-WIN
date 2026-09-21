import {
  Component,
  useEffect,
  useRef,
  type ComponentRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Group, Vector3, Mesh } from "three";
import { objects, walls } from "../../data/space";
import { objectParts } from "../../lib/objectGeometry";
import type {
  MobilityProfile,
  Part,
  Pose,
  WorldObject,
} from "../../types/simulator";
import type { Point } from "../../types/domain";

function PartMesh({ part }: { part: Part }) {
  return (
    <mesh
      position={part.position}
      rotation={[0, part.yaw ?? 0, part.roll ?? 0]}
      castShadow
      receiveShadow
    >
      {part.shape === "sphere" ? (
        <sphereGeometry args={[0.5, 10, 8]} />
      ) : (
        <boxGeometry args={part.size} />
      )}
      {part.shape === "sphere" && (
        <primitive object={new Vector3(...part.size)} attach="scale" />
      )}
      <meshStandardMaterial color={part.color} roughness={0.8} />
    </mesh>
  );
}
export function ObjectModel({
  object,
  open,
}: {
  object: WorldObject;
  open?: boolean;
}) {
  return (
    <group>
      {objectParts(object, open).map((p, i) => (
        <PartMesh part={p} key={i} />
      ))}
    </group>
  );
}
function Wheelchair({
  profile,
  pose,
}: {
  profile: MobilityProfile;
  pose: MutableRefObject<Pose>;
}) {
  const group = useRef<Group>(null),
    wheels = useRef<(Mesh | null)[]>([]),
    last = useRef({ ...pose.current });
  const w = profile.widthCm / 100,
    l = profile.lengthCm / 100,
    h = profile.heightCm / 100,
    seat = profile.seatHeightCm / 100,
    arms = profile.armrestHeightCm / 100;
  const radius = Math.min(0.31, l * 0.28, h * 0.34),
    rearZ = l / 2 - radius - 0.02;
  useFrame(() => {
    if (!group.current) return;
    group.current.position.set(pose.current.x, 0, pose.current.z);
    group.current.rotation.y = pose.current.yaw;
    const distance = Math.hypot(
      pose.current.x - last.current.x,
      pose.current.z - last.current.z,
    );
    wheels.current.forEach((wheel) => {
      if (wheel) wheel.rotation.x -= distance / radius;
    });
    last.current = { ...pose.current };
  });
  const box = (position: Point, size: Point, color: string, key: string) => (
    <PartMesh key={key} part={{ position, size, color }} />
  );
  return (
    <group ref={group}>
      {profile.mode === "wheelchair" ? (
        <>
          {[-1, 1].map((s, i) => (
            <group key={s}>
              {
                <mesh
                  ref={(el) => {
                    wheels.current[i] = el;
                  }}
                  position={[s * (w / 2 - 0.025), radius, rearZ]}
                  rotation={[0, Math.PI / 2, 0]}
                  castShadow
                >
                  <torusGeometry args={[radius - 0.027, 0.027, 8, 28]} />
                  <meshStandardMaterial color="#293d36" />
                </mesh>
              }
              <mesh
                position={[s * (w / 2 - 0.025), radius, rearZ]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry
                  args={[radius * 0.75, radius * 0.75, 0.012, 20]}
                />
                <meshStandardMaterial
                  color="#7c9b8a"
                  transparent
                  opacity={0.4}
                />
              </mesh>
              <mesh
                position={[s * w * 0.35, 0.065, -l / 2 + 0.08]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.065, 0.065, 0.04, 16]} />
                <meshStandardMaterial color="#35483f" />
              </mesh>
              {box(
                [s * (w / 2 - 0.06), arms - 0.025, 0],
                [0.055, 0.05, l * 0.5],
                "#325b4b",
                `arm${s}`,
              )}
              {box(
                [s * (w / 2 - 0.07), seat / 2, rearZ],
                [0.025, seat, 0.025],
                "#7b9388",
                `frame${s}`,
              )}
            </group>
          ))}
          {box(
            [0, seat - 0.035, 0.04],
            [Math.max(0.3, w - 0.13), 0.07, l * 0.48],
            "#537e60",
            "seat",
          )}
          {box(
            [0, (h + seat) / 2, l * 0.24],
            [Math.max(0.3, w - 0.13), h - seat, 0.045],
            "#2f654f",
            "back",
          )}
          {box(
            [0, 0.11, -l / 2 + 0.06],
            [w * 0.62, 0.025, 0.12],
            "#627f71",
            "footrest",
          )}
          {box(
            [0, seat + 0.21, l * 0.06],
            [0.28, 0.42, 0.19],
            "#d5b784",
            "body",
          )}
          {box(
            [-0.1, seat - 0.14, -l * 0.22],
            [0.11, 0.25, 0.12],
            "#36524a",
            "leg1",
          )}
          {box(
            [0.1, seat - 0.14, -l * 0.22],
            [0.11, 0.25, 0.12],
            "#36524a",
            "leg2",
          )}
          <mesh position={[0, seat + 0.53, l * 0.05]} castShadow>
            <sphereGeometry args={[0.12, 16, 12]} />
            <meshStandardMaterial color="#c69e78" />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.98, 0]} castShadow>
            <capsuleGeometry args={[0.16, 0.52, 5, 12]} />
            <meshStandardMaterial color="#547f62" />
          </mesh>
          <mesh position={[0, 1.48, 0]} castShadow>
            <sphereGeometry args={[0.13, 16, 12]} />
            <meshStandardMaterial color="#c69e78" />
          </mesh>
          {box([-0.1, 0.32, 0], [0.13, 0.64, 0.15], "#345549", "walk1")}
          {box([0.1, 0.32, 0], [0.13, 0.64, 0.15], "#345549", "walk2")}
        </>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <planeGeometry
          args={[
            profile.mode === "wheelchair" ? w : 0.46,
            profile.mode === "wheelchair" ? l : 0.4,
          ]}
        />
        <meshBasicMaterial
          color="#a7c889"
          transparent
          opacity={0.24}
          depthWrite={false}
        />
      </mesh>
      <Html
        position={[
          0,
          profile.mode === "wheelchair" ? Math.max(h, seat + 0.65) + 0.2 : 1.8,
          0,
        ]}
        center
        zIndexRange={[12, 0]}
      >
        <span className="player-tag">
          BẠN<span>▼</span>
        </span>
      </Html>
    </group>
  );
}
function CameraRig({
  pose,
  cameraYaw,
  follow,
  reset,
  reducedMotion,
  onLost,
}: {
  pose: MutableRefObject<Pose>;
  cameraYaw: MutableRefObject<number>;
  follow: boolean;
  reset: number;
  reducedMotion: boolean;
  onLost: () => void;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size, gl } = useThree();
  useEffect(() => {
    const center = follow
      ? new Vector3(pose.current.x, 0, pose.current.z)
      : new Vector3(0, 0, 1);
    camera.position.copy(center).add(new Vector3(17, 23, 17));
    camera.zoom = Math.max(
      12,
      Math.min(
        size.width / (follow ? 11 : 27),
        size.height / (follow ? 9 : 22),
      ),
    );
    camera.updateProjectionMatrix();
    controls.current?.target.copy(center);
    controls.current?.update();
  }, [camera, size, follow, reset, pose]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  useFrame((_, delta) => {
    if (!controls.current) return;
    if (follow) {
      const target = controls.current.target;
      const alpha = reducedMotion ? 1 : 1 - Math.exp(-delta * 7);
      const dx = (pose.current.x - target.x) * alpha,
        dz = (pose.current.z - target.z) * alpha;
      target.x += dx;
      target.z += dz;
      camera.position.x += dx;
      camera.position.z += dz;
    }
    cameraYaw.current = Math.atan2(
      camera.position.x - controls.current.target.x,
      camera.position.z - controls.current.target.z,
    );
    controls.current.update();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping={!reducedMotion}
      minZoom={12}
      maxZoom={100}
      minPolarAngle={0.35}
      maxPolarAngle={1.1}
    />
  );
}
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export interface SceneProps {
  profile: MobilityProfile;
  pose: MutableRefObject<Pose>;
  cameraYaw: MutableRefObject<number>;
  openDoors: string[];
  nearest: string | null;
  destinationIds: string[];
  inspected: string[];
  follow: boolean;
  reset: number;
  reducedMotion: boolean;
  onUnavailable: () => void;
  onSelect: (id: string) => void;
}
export default function OfficeScene(p: SceneProps) {
  return (
    <SceneBoundary onError={p.onUnavailable}>
      <Canvas
        orthographic
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [17, 23, 17], zoom: 25, near: 0.1, far: 120 }}
        gl={{ antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => gl.setClearColor("#edf1e7")}
      >
        <ambientLight intensity={1.25} />
        <hemisphereLight args={["#fff8e8", "#a6baa1", 1.2]} />
        <directionalLight
          position={[-6, 15, 10]}
          intensity={2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-13}
          shadow-camera-right={13}
          shadow-camera-top={13}
          shadow-camera-bottom={-13}
          shadow-normalBias={0.04}
        />
        <PartMesh
          part={{
            position: [0, -0.18, 1.25],
            size: [18.25, 0.35, 16.7],
            color: "#d4ddcc",
          }}
        />
        <PartMesh
          part={{
            position: [0, -0.005, 0],
            size: [18, 0.02, 14],
            color: "#f1ede0",
          }}
        />
        <PartMesh
          part={{
            position: [0, 0.008, 8.25],
            size: [18, 0.025, 2.5],
            color: "#dce5d3",
          }}
        />
        {[
          { x: -6, z: -3.5, w: 5.85, d: 6.85, c: "#dfe6d5" },
          { x: 6.25, z: -3.5, w: 5.35, d: 6.85, c: "#e4d6bf" },
          { x: -6, z: 3.5, w: 5.85, d: 6.85, c: "#ebe0cd" },
          { x: 6.25, z: 5.2, w: 5.35, d: 3.45, c: "#dce8e1" },
        ].map((r) => (
          <PartMesh
            key={r.x + ":" + r.z}
            part={{
              position: [r.x, 0.014, r.z],
              size: [r.w, 0.012, r.d],
              color: r.c,
            }}
          />
        ))}
        <gridHelper
          args={[18, 18, "#b6c3ad", "#d2dbca"]}
          position={[0, 0.025, 1.25]}
          material-transparent
          material-opacity={0.2}
        />
        {walls.map((w) => (
          <group key={w.id}>
            <PartMesh
              part={{
                position: [w.position[0], 0.48, w.position[2]],
                size: [w.size[0], 0.96, w.size[2]],
                color: "#c6d3c3",
              }}
            />
            <mesh position={[w.position[0], 1.78, w.position[2]]}>
              <boxGeometry args={[w.size[0], 1.64, w.size[2]]} />
              <meshStandardMaterial
                color="#b0c4af"
                transparent
                opacity={0.085}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
        {objects.map((o) => (
          <group
            key={o.id}
            position={o.position}
            rotation={[0, o.yaw, 0]}
            onClick={(e) => {
              e.stopPropagation();
              p.onSelect(o.id);
            }}
          >
            <ObjectModel object={o} open={p.openDoors.includes(o.id)} />
            {(p.nearest === o.id || p.destinationIds.includes(o.id)) && (
              <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry
                  args={[
                    Math.max(o.size[0], o.size[2]) / 2 + 0.1,
                    Math.max(o.size[0], o.size[2]) / 2 + 0.14,
                    40,
                  ]}
                />
                <meshBasicMaterial
                  color={p.nearest === o.id ? "#2d7658" : "#b39451"}
                  transparent
                  opacity={0.8}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        ))}
        {[
          [-6, -6.45, "KHU LÀM VIỆC"],
          [6.1, -6.45, "PHÒNG LOTUS"],
          [-5.6, 1.25, "PANTRY"],
          [6.2, 6.65, "NHÀ VỆ SINH"],
          [0, 5.8, "LỄ TÂN"],
        ].map(([x, z, name]) => (
          <Html
            key={name}
            position={[x as number, 0.15, z as number]}
            center
            zIndexRange={[5, 0]}
          >
            <span className="room-label">{name}</span>
          </Html>
        ))}
        <Wheelchair profile={p.profile} pose={p.pose} />
        <CameraRig
          pose={p.pose}
          cameraYaw={p.cameraYaw}
          follow={p.follow}
          reset={p.reset}
          reducedMotion={p.reducedMotion}
          onLost={p.onUnavailable}
        />
      </Canvas>
    </SceneBoundary>
  );
}
