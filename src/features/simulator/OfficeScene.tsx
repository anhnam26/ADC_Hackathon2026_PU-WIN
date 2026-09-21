import {
  Component,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type ComponentRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { MapPin } from "lucide-react";
import { locations, routeFor } from "../../data/office";
import type { Floor, Point } from "../../types/domain";

type BoxProps = {
  position: Point;
  size: Point;
  color: string;
  rotation?: Point;
};
function Box({ position, size, color, rotation }: BoxProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Plant({
  x,
  z,
  large = false,
}: {
  x: number;
  z: number;
  large?: boolean;
}) {
  const scale = large ? 1.25 : 0.85;
  return (
    <group position={[x, 0.12, z]} scale={scale}>
      <mesh position={[0, 0.26, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.23, 0.5, 12]} />
        <meshStandardMaterial color="#e4cbb5" />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.5, 7, 6]} />
        <meshStandardMaterial color="#6e9472" />
      </mesh>
      <mesh position={[0.15, 1.12, 0]} castShadow>
        <sphereGeometry args={[0.35, 7, 6]} />
        <meshStandardMaterial color="#8ca57b" />
      </mesh>
    </group>
  );
}
function Chair({
  x,
  z,
  rotate = false,
  color = "#819b98",
}: {
  x: number;
  z: number;
  rotate?: boolean;
  color?: string;
}) {
  return (
    <group position={[x, 0.1, z]} rotation={[0, rotate ? Math.PI : 0, 0]}>
      <Box position={[0, 0.5, 0]} size={[0.65, 0.14, 0.65]} color={color} />
      <Box position={[0, 0.87, 0.28]} size={[0.65, 0.65, 0.1]} color={color} />
      <Box position={[0, 0.23, 0]} size={[0.1, 0.45, 0.1]} color="#62716d" />
      <Box position={[0, 0.04, 0]} size={[0.65, 0.05, 0.55]} color="#62716d" />
    </group>
  );
}
function Desk({
  x,
  z,
  highlighted = false,
}: {
  x: number;
  z: number;
  highlighted?: boolean;
}) {
  return (
    <group position={[x, 0.1, z]}>
      <Box
        position={[0, 0.82, 0]}
        size={[2.1, 0.13, 1.1]}
        color={highlighted ? "#c5dcbc" : "#e7d8bd"}
      />
      {[-0.87, 0.87].map((a) => (
        <Box
          key={a}
          position={[a, 0.4, 0]}
          size={[0.08, 0.8, 0.85]}
          color="#edeeea"
        />
      ))}
      <Box
        position={[0, 1.28, -0.28]}
        size={[0.83, 0.52, 0.06]}
        color="#3c5551"
      />
      <Box
        position={[0, 1.27, -0.24]}
        size={[0.72, 0.4, 0.02]}
        color="#b8d9d0"
      />
      <Box
        position={[0, 0.99, -0.28]}
        size={[0.07, 0.3, 0.08]}
        color="#5e726d"
      />
      <Box
        position={[0, 0.91, 0.14]}
        size={[0.64, 0.035, 0.2]}
        color="#bec8c1"
      />
      <Chair x={0} z={1.03} />
      <mesh position={[0.73, 0.99, 0.1]}>
        <cylinderGeometry args={[0.09, 0.08, 0.19, 12]} />
        <meshStandardMaterial color="#cfac79" />
      </mesh>
    </group>
  );
}
function WorkingFloor() {
  return (
    <group>
      <Box position={[0, -0.22, 0]} size={[21, 0.6, 15]} color="#d0d8cf" />
      <Box position={[0, 0.11, 0]} size={[20.8, 0.1, 14.8]} color="#f0eee4" />
      <Box
        position={[-4.8, 0.18, -3.3]}
        size={[10.2, 0.025, 6.5]}
        color="#e0e4d5"
      />
      <Box
        position={[5.15, 0.18, -3.3]}
        size={[8.9, 0.025, 6.5]}
        color="#e6dac6"
      />
      <Box
        position={[-4.7, 0.18, 4.7]}
        size={[6.5, 0.025, 4.6]}
        color="#e4d3bb"
      />
      <Box
        position={[1.3, 0.18, 4.7]}
        size={[4.2, 0.025, 4.6]}
        color="#cfded3"
      />
      <Box
        position={[7.25, 0.18, 4.7]}
        size={[4.4, 0.025, 4.6]}
        color="#d9e0df"
      />
      <Box position={[0, 1.1, -7.1]} size={[21, 2, 0.2]} color="#e5e8df" />
      <Box position={[-10.35, 1.1, 0]} size={[0.2, 2, 14.3]} color="#e5e8df" />
      <Box position={[10.35, 0.7, 0]} size={[0.2, 1.2, 14.3]} color="#e5e8df" />
      {[-7, -3, 1, 5, 8.5].map((x) => (
        <group key={x}>
          <Box
            position={[x, 1.28, -6.96]}
            size={[2.9, 1.25, 0.07]}
            color="#bbd4cd"
          />
          <Box
            position={[x, 1.28, -6.88]}
            size={[0.06, 1.28, 0.05]}
            color="#f8faf1"
          />
        </group>
      ))}
      <Box
        position={[0.25, 0.9, -3.8]}
        size={[0.16, 1.5, 6.3]}
        color="#dce2d9"
      />
      <Box position={[2.2, 0.67, -0.2]} size={[4, 1.0, 0.14]} color="#dce2d9" />
      <Box
        position={[8.2, 0.67, -0.2]}
        size={[4.1, 1.0, 0.14]}
        color="#dce2d9"
      />
      <Box
        position={[-1.3, 0.7, 4.8]}
        size={[0.15, 1.1, 4.5]}
        color="#e5e8df"
      />
      <Box position={[3.8, 0.7, 4.8]} size={[0.15, 1.1, 4.5]} color="#e5e8df" />
      <Box position={[5, 0.7, 4.8]} size={[0.15, 1.1, 4.5]} color="#e5e8df" />
      {[-7, -4, -1.4].map((x) =>
        [-5.4, -2.9].map((z) => (
          <Desk
            key={`${x}-${z}`}
            x={x}
            z={z}
            highlighted={x === -4 && z === -2.9}
          />
        )),
      )}
      <Box position={[5, 0.88, -3.8]} size={[4.5, 0.16, 2]} color="#c29d73" />
      <Box
        position={[5, 0.43, -3.8]}
        size={[2.7, 0.85, 0.25]}
        color="#f1ebe0"
      />
      {[3.5, 5, 6.5].map((x) => (
        <group key={x}>
          <Chair x={x} z={-2.35} />
          <Chair x={x} z={-5.25} rotate />
        </group>
      ))}
      <Box
        position={[9.95, 1.3, -3.5]}
        size={[0.1, 1.4, 2.8]}
        color="#39524c"
      />
      <Box
        position={[9.87, 1.3, -3.5]}
        size={[0.02, 1.17, 2.5]}
        color="#adcbbd"
      />
      <Box
        position={[-4.5, 0.65, 6.35]}
        size={[5.3, 1, 0.95]}
        color="#bca789"
      />
      <Box
        position={[-4.5, 1.2, 6.35]}
        size={[5.5, 0.12, 1.05]}
        color="#faf6ec"
      />
      <Box
        position={[-6, 1.52, 6.35]}
        size={[0.65, 0.6, 0.6]}
        color="#53635c"
      />
      <Box
        position={[-2.65, 1.65, 6.35]}
        size={[0.8, 1, 0.7]}
        color="#d7e0dc"
      />
      <mesh position={[-4.1, 1, 3.8]} castShadow>
        <cylinderGeometry args={[0.95, 0.95, 0.14, 32]} />
        <meshStandardMaterial color="#eae1ce" />
      </mesh>
      <Box
        position={[-4.1, 0.55, 3.8]}
        size={[0.2, 0.8, 0.2]}
        color="#8d9285"
      />
      <Chair x={-4.1} z={2.55} rotate color="#bc906a" />
      <Chair x={-4.1} z={5} color="#bc906a" />
      <Box
        position={[1.3, 0.52, 5.9]}
        size={[2.9, 0.7, 1.05]}
        color="#6e9381"
      />
      <Box position={[1.3, 1.0, 6.4]} size={[2.9, 0.7, 0.22]} color="#6e9381" />
      <Box
        position={[1.2, 0.48, 4.5]}
        size={[1.1, 0.1, 0.75]}
        color="#eedac1"
      />
      <Plant x={2.9} z={3.1} />
      <Box
        position={[7.4, 0.58, 6.3]}
        size={[3.2, 0.8, 0.85]}
        color="#b4c6c2"
      />
      {[6.5, 8.3].map((x) => (
        <mesh key={x} position={[x, 1.03, 6.3]}>
          <cylinderGeometry args={[0.32, 0.2, 0.12, 20]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      <Box position={[-8.6, 1.1, 6.85]} size={[2.1, 2, 0.16]} color="#778e87" />
      <Box
        position={[-8.6, 1.1, 6.72]}
        size={[0.04, 1.95, 0.02]}
        color="#d6e2d9"
      />
      <Plant x={-9.25} z={-5.9} large />
      <Plant x={8.9} z={-6.1} large />
      <Plant x={-9.3} z={0.2} />
      <Plant x={3} z={-6.15} />
    </group>
  );
}
function GroundFloor() {
  return (
    <group>
      <Box position={[0, -0.22, 0]} size={[21, 0.6, 15]} color="#c7d2c5" />
      <Box position={[0, 0.11, -2.5]} size={[20.8, 0.1, 9.7]} color="#eeeade" />
      <Box position={[0, 0.11, 4.8]} size={[20.8, 0.1, 4.9]} color="#d6dccf" />
      <Box position={[0, 1.15, -7.1]} size={[21, 2.1, 0.2]} color="#e5e8df" />
      <Box
        position={[-10.3, 1.15, -2.4]}
        size={[0.2, 2.1, 9.6]}
        color="#e5e8df"
      />
      <Box
        position={[10.3, 0.8, -2.4]}
        size={[0.2, 1.4, 9.6]}
        color="#e5e8df"
      />
      <Box
        position={[-7.6, 0.9, 2.2]}
        size={[5.5, 1.5, 0.15]}
        color="#b7cdc3"
      />
      <Box position={[1, 0.9, 2.2]} size={[7.6, 1.5, 0.15]} color="#b7cdc3" />
      <Box position={[9.5, 0.9, 2.2]} size={[1.6, 1.5, 0.15]} color="#b7cdc3" />
      <Box
        position={[-4, 0.24, 3.15]}
        size={[2.2, 0.15, 0.45]}
        color="#aeb9a9"
      />
      <Box position={[-4, 0.35, 2.7]} size={[2.2, 0.3, 0.45]} color="#bdc6b7" />
      <Box
        position={[-4.5, 0.75, -3.5]}
        size={[4.2, 1.2, 1.4]}
        color="#bfab8e"
      />
      <Box
        position={[-4.5, 1.4, -3.5]}
        size={[4.35, 0.15, 1.55]}
        color="#f6efdf"
      />
      <Box
        position={[-4.5, 1.72, -3.6]}
        size={[0.8, 0.55, 0.08]}
        color="#4b6359"
      />
      <Chair x={-4.5} z={-4.8} rotate />
      <Box
        position={[-4.5, 1.4, -6.9]}
        size={[4.5, 1.25, 0.05]}
        color="#2f6655"
      />
      <Html
        position={[-4.5, 1.5, -6.8]}
        center
        transform
        rotation={[0, 0, 0]}
        distanceFactor={5}
      >
        <div className="wall-logo">
          DAY ZERO<span>MAKE YOURSELF AT HOME</span>
        </div>
      </Html>
      {[0, 2].map((x) => (
        <Box
          key={x}
          position={[x, 0.62, -2.5]}
          size={[0.6, 1.0, 1.9]}
          color="#879a91"
        />
      ))}
      <Box position={[1, 0.98, -2.2]} size={[1.3, 0.4, 0.08]} color="#b9dcd0" />
      <Box position={[7, 1.35, -6.9]} size={[2.8, 2.5, 0.17]} color="#799086" />
      <Box
        position={[7, 1.35, -6.78]}
        size={[0.035, 2.5, 0.03]}
        color="#e4e8df"
      />
      <Box position={[7, 2.9, -6.84]} size={[0.8, 0.25, 0.1]} color="#31594c" />
      <Box position={[-8.5, 0.55, -0.8]} size={[1.3, 0.7, 3]} color="#7a9581" />
      <Box position={[-9, 0.97, -0.8]} size={[0.25, 0.7, 3]} color="#7a9581" />
      <Plant x={-9} z={-5.8} large />
      <Plant x={9} z={-5.8} large />
      <Plant x={4.2} z={-5.9} />
      {[-1, 2, 5].map((x) => (
        <group key={x}>
          <Box
            position={[x, 0.36, 6.3]}
            size={[1.7, 0.4, 0.65]}
            color="#9fae91"
          />
          <Plant x={x} z={6.3} />
        </group>
      ))}
      <Box position={[-7, 0.24, 5.1]} size={[3, 0.07, 1.5]} color="#b9cab5" />
    </group>
  );
}
function Avatar({
  route,
  reducedMotion,
  onArrival,
}: {
  route: Point[];
  reducedMotion: boolean;
  onArrival: () => void;
}) {
  const ref = useRef<Group>(null);
  const segment = useRef(1);
  const arrived = useRef(false);
  const target = useMemo(() => route.map((p) => new Vector3(...p)), [route]);
  const direction = useMemo(() => new Vector3(), []);
  useEffect(() => {
    segment.current = 1;
    arrived.current = false;
    ref.current?.position.copy(target[reducedMotion ? target.length - 1 : 0]);
    if (reducedMotion) {
      arrived.current = true;
      onArrival();
    }
  }, [target, reducedMotion, onArrival]);
  useFrame((_, delta) => {
    if (!ref.current || arrived.current) return;
    const next = target[segment.current];
    if (!next) {
      arrived.current = true;
      onArrival();
      return;
    }
    direction.subVectors(next, ref.current.position);
    const distance = direction.length();
    const travel = Math.min(delta, 0.05) * 5;
    if (distance <= travel) {
      ref.current.position.copy(next);
      segment.current++;
    } else ref.current.position.addScaledVector(direction.normalize(), travel);
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.57, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.45, 5, 10]} />
        <meshStandardMaterial color="#23664f" />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color="#d9b591" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[0.35, 0.45, 32]} />
        <meshBasicMaterial color="#378360" />
      </mesh>
      <Html position={[0, 1.55, 0]} center zIndexRange={[15, 0]}>
        <span className="avatar-label">Bạn đang ở đây</span>
      </Html>
    </group>
  );
}
function Camera({ reset, onLost }: { reset: number; onLost: () => void }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size, gl } = useThree();
  useEffect(() => {
    camera.position.set(22, 24, 26);
    camera.zoom = Math.max(12, Math.min(size.width / 36, size.height / 27));
    camera.updateProjectionMatrix();
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [camera, size.width, size.height, reset]);
  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", handleLost);
    return () => canvas.removeEventListener("webglcontextlost", handleLost);
  }, [gl, onLost]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minZoom={10}
      maxZoom={60}
      minPolarAngle={0.35}
      maxPolarAngle={1.2}
      enableDamping
      dampingFactor={0.12}
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
  floor: Floor;
  selected: string;
  onSelect: (id: string) => void;
  issueLocations: string[];
  destination: string | null;
  trip: number;
  stepFree: boolean;
  reducedMotion: boolean;
  cameraReset: number;
  onArrival: () => void;
  onUnavailable: () => void;
}
export default function OfficeScene(props: SceneProps) {
  const route = useMemo(
    () => routeFor(props.destination ?? props.selected, props.stepFree),
    [props.destination, props.selected, props.stepFree],
  );
  return (
    <SceneBoundary onError={props.onUnavailable}>
      <Canvas
        orthographic
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [22, 24, 26], zoom: 20, near: 0.1, far: 150 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        fallback={<p>Đang chuyển sang bản đồ 2D…</p>}
        onCreated={({ gl }) => {
          gl.setClearColor("#edf0e8", 0);
        }}
      >
        <ambientLight intensity={1.4} />
        <hemisphereLight args={["#fff8e9", "#96afa0", 1.6]} />
        <directionalLight
          position={[4, 18, 10]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-normalBias={0.05}
        />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.58, 0]}
          receiveShadow
        >
          <planeGeometry args={[200, 200]} />
          <shadowMaterial opacity={0.12} />
        </mesh>
        {props.floor === "office" ? <WorkingFloor /> : <GroundFloor />}
        <Line
          points={route}
          color="#60956d"
          lineWidth={2.5}
          dashed
          dashSize={0.18}
          gapSize={0.14}
        />
        {props.destination && (
          <Avatar
            key={`${props.floor}-${props.trip}`}
            route={route}
            reducedMotion={props.reducedMotion}
            onArrival={props.onArrival}
          />
        )}
        {locations
          .filter((l) => l.floor === props.floor)
          .map((l) => (
            <group position={l.position} key={l.id}>
              <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.32, 0.42, 32]} />
                <meshBasicMaterial
                  color={
                    props.issueLocations.includes(l.id)
                      ? "#c98739"
                      : props.selected === l.id
                        ? "#2c7959"
                        : "#a0b49d"
                  }
                />
              </mesh>
              <Html position={[0, 1.8, 0]} center zIndexRange={[20, 0]}>
                <button
                  className={`hotspot ${props.selected === l.id ? "active" : ""} ${props.issueLocations.includes(l.id) ? "has-issue" : ""}`}
                  onClick={() => props.onSelect(l.id)}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <MapPin size={12} />
                  {l.shortName}
                  {props.issueLocations.includes(l.id) && (
                    <span className="hotspot-dot" />
                  )}
                </button>
              </Html>
            </group>
          ))}
        <Camera reset={props.cameraReset} onLost={props.onUnavailable} />
      </Canvas>
    </SceneBoundary>
  );
}
