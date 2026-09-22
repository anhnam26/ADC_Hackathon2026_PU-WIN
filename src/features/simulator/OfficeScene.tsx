import {
  Component,
  useEffect,
  useRef,
  type ComponentRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useLocale } from '../../lib/i18n';
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Line } from "@react-three/drei";
import { Group, Vector3, Mesh, Raycaster } from "three";
import DoorSign from './DoorSign';
import { wallsOnFloor } from "../../data/space";
import { roomZones } from '../../data/building';
import { floorY, type LiftState } from '../../lib/elevator';
import { FloorSlab, CeilingLights, Roof, ElevatorModel } from './BuildingShell';
import UpperDecor from './UpperDecor';
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
      userData={{ cameraObstacle: part.solid !== false }}
      position={part.position}
      rotation={[0, part.yaw ?? 0, part.roll ?? 0]}
      scale={part.shape === 'sphere' ? part.size : undefined}
      castShadow
      receiveShadow
    >
      {part.shape === "sphere" ? (
        <sphereGeometry args={[0.5, 10, 8]} />
      ) : (
        <boxGeometry args={part.size} />
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
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!object.colleague || !group.current) return;
    [1, 2, 5, 6].forEach((index, i) => {
      const limb = group.current!.children[index];
      if (limb) limb.rotation.x = object.walking ? Math.sin(clock.elapsedTime * 7) * .22 * (i % 2 ? -1 : 1) : 0;
    });
  });
  return (
    <group ref={group}>
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
  const { t } = useLocale();
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
    group.current.position.set(pose.current.x, pose.current.y ?? floorY(pose.current.floor ?? 1), pose.current.z);
    group.current.rotation.y = pose.current.yaw;
    const distance = Math.hypot(
      pose.current.x - last.current.x,
      pose.current.z - last.current.z,
    );
    wheels.current.forEach((wheel) => {
      if (wheel) wheel.rotateZ(-distance / radius);
    });
    last.current = { ...pose.current };
  });
  const box = (position: Point, size: Point, color: string, key: string) => (
    <PartMesh key={key} part={{ position, size, color }} />
  );
  return (
    <group ref={group} userData={{ player: true }}>
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
          {t('BẠN')}<span>▼</span>
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
  const floor=pose.current.floor ?? 1;
  useEffect(() => {
    const center = follow
      ? new Vector3(pose.current.x, 0, pose.current.z)
      : new Vector3(0, floorY(floor), floor===1 ? -3 : -6.5);
    camera.position.copy(center).add(new Vector3(17, 23, 17));
    camera.zoom = Math.max(
      6,
      Math.min(
        size.width / (follow ? 11 : 44),
        size.height / (follow ? 9 : 40),
      ),
    );
    camera.updateProjectionMatrix();
    controls.current?.target.copy(center);
    controls.current?.update();
  }, [camera, size, follow, reset, pose, floor]);
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
function FirstPersonCamera({ pose, pitch, lookYaw, profile, reset, thirdPerson }: {
  pose: MutableRefObject<Pose>;
  pitch: MutableRefObject<number>;
  lookYaw:MutableRefObject<number>;
  profile: MobilityProfile;
  reset: number;
  thirdPerson: boolean;
}) {
  const { camera, scene } = useThree();
  const ray = useRef(new Raycaster());
  const target = useRef(new Vector3());
  const offset = useRef(new Vector3());
  useEffect(() => { pitch.current = 0;lookYaw.current=0; }, [reset, pitch,lookYaw]);
  useFrame(() => {
    // Eye height is an illustrative seated offset, not a personal reach measurement.
    const eyeHeight = profile.mode === 'wheelchair' ? profile.seatHeightCm / 100 + .65 : 1.6;
    target.current.set(pose.current.x, (pose.current.y ?? floorY(pose.current.floor ?? 1))+eyeHeight, pose.current.z);
    const yaw=pose.current.yaw+(profile.mode==='wheelchair'?lookYaw.current:0);
    if (!thirdPerson) {
      camera.position.copy(target.current);
      camera.rotation.set(pitch.current, yaw, 0, 'YXZ');
      return;
    }
    offset.current.set(Math.sin(yaw) * Math.cos(pitch.current) * 3,
      .8 - Math.sin(pitch.current) * 3, Math.cos(yaw) * Math.cos(pitch.current) * 3);
    const distance = offset.current.length();
    ray.current.set(target.current, offset.current.normalize());
    ray.current.far = distance;
    scene.updateMatrixWorld(true);
    const blockers: Mesh[] = [];
    scene.traverse(node => {
      if (!(node instanceof Mesh) || !node.userData.cameraObstacle) return;
      let parent = node.parent;
      while (parent) { if (parent.userData.player) return; parent = parent.parent; }
      blockers.push(node);
    });
    const hit = ray.current.intersectObjects(blockers, false)[0];
    const safeDistance = hit ? Math.max(.08, hit.distance - .18) : distance;
    camera.position.copy(target.current).addScaledVector(offset.current, safeDistance);
    camera.lookAt(target.current);
    scene.traverse(node => { if (node.userData.player) node.visible = safeDistance > .65; });
  });
  return null;
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
  elevator: MutableRefObject<LiftState>;
  sceneObjects: WorldObject[];
  route: Pose[];
  profile: MobilityProfile;
  pose: MutableRefObject<Pose>;
  cameraYaw: MutableRefObject<number>;
  openDoors: string[];
  nearest: string | null;
  destinationIds: string[];
  inspected: string[];
  firstPerson: boolean;
  thirdPerson: boolean;
  lookPitch: MutableRefObject<number>;
  lookYaw:MutableRefObject<number>;
  reset: number;
  reducedMotion: boolean;
  onUnavailable: () => void;
  onSelect: (id: string) => void;
}
export default function OfficeScene(p: SceneProps) {
  const {t}=useLocale();
  const activeFloor=p.pose.current.floor ?? 1;
  const immersive=p.firstPerson||p.thirdPerson;
  return (
    <SceneBoundary onError={p.onUnavailable}>
      <Canvas
        key={p.firstPerson || p.thirdPerson ? 'player-camera' : 'overview'}
        orthographic={!p.firstPerson && !p.thirdPerson}
        shadows
        dpr={[1, 1.25]}
        camera={p.firstPerson || p.thirdPerson
          ? { position: [p.pose.current.x, 1.13, p.pose.current.z], fov: 70, near: 0.04, far: 120 }
          : { position: [17, 23, 17], zoom: 25, near: 0.1, far: 120 }}
        gl={{ antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => gl.setClearColor("#edf1e7")}
      >
        <ambientLight intensity={.42} />
        <hemisphereLight args={["#fff8e8", "#a6baa1", .45]} />
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
        {([1,2] as const).map(floor=><group key={floor} name={`building-floor-${floor}`} position={[0,floorY(floor),0]} visible={immersive||activeFloor===floor}>
        <FloorSlab floor={floor}/>
        <CeilingLights floor={floor} active={activeFloor===floor} fixtures={immersive}/>
        {floor===2&&<UpperDecor fixtures={immersive}/>}
        {floor===1 && <PartMesh
          part={{
            position: [0, 0.008, 10.5],
            size: [24, 0.025, 7],
            color: "#dce5d3",
          }}
        />}
        {floor===1 && <group>
          <PartMesh part={{position:[0,.022,10.5],size:[3,.02,7],color:'#dedacb',solid:false}}/>
          <PartMesh part={{position:[0,.024,13],size:[24,.02,1.7],color:'#a1adb1',solid:false}}/>
          {(p.firstPerson || p.thirdPerson) && <group><PartMesh part={{position:[0,2.9,7],size:[24,.45,.2],color:'#315a57',solid:false}}/>
          <group position={[0,.72,7]}><DoorSign label="DAY ZERO · OFFICE" width={5}/></group>
          {[-10,-6,-2,2,6,10].map(x=><group key={x}><PartMesh part={{position:[x,4.55,7],size:[3.75,2.7,.12],color:'#99bec6',solid:false}}/><PartMesh part={{position:[x,4.55,7.08],size:[.07,2.7,.1],color:'#416565',solid:false}}/></group>)}
          <PartMesh part={{position:[0,5.95,7],size:[24,.2,.35],color:'#315a57',solid:false}}/></group>}
        </group>}
        {[...(floor===1 ? [
          { x: -7.5, z: -5, w: 8.85, d: 9.85, c: "#dfe6d5" },
          { x: 7.75, z: -5, w: 8.35, d: 9.85, c: "#e4d6bf" },
          { x: -7.5, z: 3.5, w: 8.85, d: 6.85, c: "#ebe0cd" },
          { x: 7.75, z: 5.2, w: 8.35, d: 3.45, c: "#dce8e1" },
        ] : []),...roomZones.filter(r=>r.floor===floor).map(r=>({x:r.x,z:r.z,w:r.width-.15,d:r.depth-.15,c:r.color}))].map((r) => (
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
          args={[34, 34, "#b6c3ad", "#d2dbca"]}
          position={[0, 0.025, -3]}
          material-transparent
          material-opacity={0.2}
        />
        {wallsOnFloor(floor).map((w) => (
          <group key={w.id}>
            <PartMesh
              part={{
                position: [w.position[0], 0.48, w.position[2]],
                size: [w.size[0], 0.96, w.size[2]],
                color: "#c6d3c3",
              }}
            />
            <mesh position={[w.position[0], 1.98, w.position[2]]} userData={{ cameraObstacle: true }}>
              <boxGeometry args={[w.size[0], 2.04, w.size[2]]} />
              <meshStandardMaterial
                color="#b0c4af"
                transparent={!p.firstPerson && !p.thirdPerson}
                opacity={p.firstPerson || p.thirdPerson ? 1 : 0.085}
                depthWrite={p.firstPerson || p.thirdPerson}
              />
            </mesh>
          </group>
        ))}
        {floor===activeFloor && p.route.length > 0 && <Line points={[p.pose.current,...p.route].map(point => [point.x, .065, point.z])} color="#e4b840" lineWidth={5} />}
        {floor===activeFloor && p.route.filter((_, i) => i % 4 === 0).map((point, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[point.x, .07, point.z]}><ringGeometry args={[.06, .1, 12]} /><meshBasicMaterial color="#fff7b1" /></mesh>)}
        {p.sceneObjects.filter(o=>(o.floor ?? 1)===floor && o.kind!=='elevator' && !(o.kind==='stairs' && floor===2)).map((o) => (
          <group
            key={o.id}
            position={o.position}
            rotation={[0, o.yaw, 0]}
            onClick={(e) => {
              e.stopPropagation();
              if (!p.firstPerson && !p.thirdPerson) p.onSelect(o.id);
            }}
          >
            <ObjectModel object={o} open={p.openDoors.includes(o.id)} />
            {o.roomLabel && <group position={[0,0,o.connection ? o.size[2]/2 : 0]}><DoorSign label={t(o.roomLabel)} width={o.size[0]} /></group>}
            {floor===activeFloor && o.colleague && Math.hypot(p.pose.current.x - o.position[0], p.pose.current.z - o.position[2]) < 4.5 && <Html position={[0, o.size[1] + .2, 0]} center occlude zIndexRange={[10, 0]}><span className="colleague-tag">{o.name}<small>{t(o.colleague.role)}</small></span></Html>}
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
        {floor===activeFloor && !p.firstPerson && !p.thirdPerson && [...(floor===1 ? [
          [-6, -6.45, "KHU LÀM VIỆC"],
          [6.1, -6.45, "PHÒNG LOTUS"],
          [-5.6, 1.25, "PANTRY"],
          [6.2, 6.65, "NHÀ VỆ SINH"],
          [0, 5.8, "LỄ TÂN"],
        ] : []),...roomZones.filter(r=>r.floor===floor).map(r=>[r.x,r.z,r.label])].map(([x, z, name]) => (
          <Html
            key={name}
            position={[x as number, 0.15, z as number]}
            center
            zIndexRange={[5, 0]}
          >
              <span className="room-label">{t(String(name))}</span>
          </Html>
        ))}
        </group>)}
        <ElevatorModel state={p.elevator} overview={!immersive}/>
        <group visible={immersive}><Roof/></group>
        {!p.firstPerson && <Wheelchair profile={p.profile} pose={p.pose} />}
        {p.firstPerson || p.thirdPerson ? <FirstPersonCamera pose={p.pose} pitch={p.lookPitch} lookYaw={p.lookYaw} profile={p.profile} reset={p.reset} thirdPerson={p.thirdPerson} /> : <CameraRig
          pose={p.pose}
          cameraYaw={p.cameraYaw}
          follow={false}
          reset={p.reset}
          reducedMotion={p.reducedMotion}
          onLost={p.onUnavailable}
        />}
      </Canvas>
    </SceneBoundary>
  );
}
