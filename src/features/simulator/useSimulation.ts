import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { objects, objectsOnFloor, SPAWN } from "../../data/space";
import { objectObstacles, worldObstacles } from "../../lib/objectGeometry";
import { planRoute, routePassesDoor, routeTargetReached } from '../../lib/navigation';
import { advanceColleagues } from '../../lib/npcMotion';
import { createLift, advanceLift, floorY, insideCabin, liftBusy, liftDoorObstacles, requestLift } from '../../lib/elevator';
import {
  blockingAt,
  canInteract,
  moveWithCollisions,
  objectDistance,
  doorCanToggle,
} from "../../lib/physics";
import type { MobilityProfile, Pose } from "../../types/simulator";
import {CollisionEpisodes} from '../../lib/collisionEpisodes';
import type {CollisionContact} from '../../lib/physics';
import type {CollisionEvent} from '../../types/collisions';
import {wheelchairDrive,WHEELCHAIR_SPEED} from '../../lib/wheelchairDrive';

export type Control =
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "turnLeft"
  | "turnRight"
  | "slow";
const bindings: Record<string, Control> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyQ: "turnLeft",
  KeyE: "turnRight",
  ShiftLeft: "slow",
  ShiftRight: "slow",
};
export function useSimulation(
  profile: MobilityProfile,
  openDoors: string[],
  stage: RefObject<HTMLDivElement | null>,
  onInteract: (id: string) => void,
  initial: Pose,
  firstPerson = false,
  pausedByMenu = false,
  onOpenDoor?: (id: string) => void,
  onCollision?: (event:CollisionEvent)=>void,
) {
  const collisionEpisodes=useRef(new CollisionEpisodes());
  const collisionCallback=useRef(onCollision);collisionCallback.current=onCollision;
  const [floor,setFloor]=useState<1|2>(initial.floor ?? 1);
  const pendingDestination=useRef<{id:string;automatic:boolean}|null>(null);
  const pose = useRef<Pose>({ ...initial,y:floorY(initial.floor ?? 1) });
  const elevator=useRef(createLift(initial.floor ?? 1));
  const liftInitialized=useRef(false);
  if(!liftInitialized.current){liftInitialized.current=true;if(insideCabin(pose.current,profile)){elevator.current.door=1;elevator.current.phase='open';}}
  const cameraYaw = useRef(Math.PI / 4);
  const lookPitch = useRef(0);
  const lookYaw = useRef(0);
  const pendingTurn = useRef(0);
  const pressed = useRef(new Set<string>());
  const virtual = useRef(new Set<Control>());
  const sceneObjects = useRef(objects.map(o => ({ ...o, position: [...o.position] as typeof o.position })));
  const npcWaypoints = useRef(new Map<string, number>());
  const navigation = useRef({ route: [] as Pose[], index: 0, auto: false, targetId: '', status: 'Chọn một điểm đến để bắt đầu dẫn đường.' });
  const doorCallback = useRef(onOpenDoor); doorCallback.current = onOpenDoor;
  const [view, setView] = useState({
    pose: { ...pose.current },
    nearby: [] as string[],
    blocked: "",
    moving: false,
    objects: sceneObjects.current.map(o => ({ ...o })),
    route: [] as Pose[], auto: false, navigationStatus: navigation.current.status,
    elevator:{...elevator.current},
  });
  const staticObstacles = useMemo(() => worldObstacles(openDoors, objects.filter(o => !o.colleague && o.kind!=='elevator'),floor), [openDoors,floor]);
  const obstacleRef = useRef(worldObstacles(openDoors, sceneObjects.current,floor));
  const interact = useRef(onInteract);
  interact.current = onInteract;
  const nearby = useRef<string[]>([]);
  const preferred = useRef<string | null>(null);
  const savedProfile = useRef(JSON.stringify(profile));
  const returnToEntry = useCallback(() => {
    collisionEpisodes.current.reset();
    pose.current = { ...SPAWN };
    setFloor(1);pendingDestination.current=null;
    elevator.current=createLift(1);
    nearby.current=[];preferred.current=null;
    pressed.current.clear();
    virtual.current.clear();
    pendingTurn.current = 0;
    lookPitch.current = 0;
    lookYaw.current = 0;
    navigation.current = { route: [], index: 0, auto: false, targetId: '', status: 'Đã trở về lối vào.' };
    setView({pose:{...SPAWN},nearby:[],blocked:'',moving:false,objects:sceneObjects.current,route:[],auto:false,navigationStatus:navigation.current.status,elevator:{...elevator.current}});
  }, []);
  useEffect(() => {
    pendingTurn.current = 0;
    pressed.current.clear();
    virtual.current.clear();
    if (firstPerson) cameraYaw.current = pose.current.yaw;
  }, [firstPerson]);
  useEffect(() => {
    // A wider chair must never spawn intersecting furniture after changing its dimensions.
    if (savedProfile.current !== JSON.stringify(profile)) {
      navigation.current.auto = false; navigation.current.route = [];
      if (blockingAt(pose.current, profile, obstacleRef.current)) returnToEntry();
      savedProfile.current = JSON.stringify(profile);
    }
  }, [profile]);
  useEffect(() => {
    let frame = 0,
      previous = performance.now(),
      lastPublish = 0;
    const tick = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, .15);
      const dt = elapsed; // moveWithCollisions subdivides translation and rotation to prevent tunnelling.
      previous = now;
      const paused =
        pausedByMenu || !!document.querySelector("dialog[open]") || document.hidden || !document.hasFocus();
      const currentObjects=sceneObjects.current.filter(o=>(o.floor ?? 1)===floor);
      if(!paused && advanceLift(elevator.current,elapsed,pose.current,profile)){
        setFloor(elevator.current.floor);navigation.current.status=`Đã đến tầng ${elevator.current.floor}. Chờ cửa mở rồi điều khiển xe ra ngoài.`;
      }
      advanceColleagues(currentObjects, npcWaypoints.current, dt, pose.current, profile, staticObstacles, paused);
      const liftObject=currentObjects.find(o=>o.kind==='elevator')!;
      const obstacles = [...staticObstacles,...objectObstacles(liftObject,true),...liftDoorObstacles(elevator.current,floor), ...currentObjects.filter(o => o.colleague).flatMap(o => objectObstacles(o))];
      obstacleRef.current = obstacles;
      if (paused) {
        pressed.current.clear();
        virtual.current.clear();
        pendingTurn.current = 0;
      }
      const controls = new Set(
        [...pressed.current]
          .map((k) => bindings[k])
          .concat([...virtual.current]),
      );
      const riding=elevator.current.rider && liftBusy(elevator.current);
      if(riding){controls.clear();pressed.current.clear();virtual.current.clear();navigation.current.auto=false;}
      // Resume a cross-floor route only after the user has driven out through the open door.
      const pending=pendingDestination.current;
      if(pending && !paused && !controls.size && !liftBusy(elevator.current) && pose.current.x>-8.1){
        const target=sceneObjects.current.find(o=>o.id===pending.id);
        if(target && (target.floor ?? 1)===floor){const route=planRoute(pose.current,target,profile,sceneObjects.current);navigation.current={route:route ?? [],index:1,auto:!!route&&pending.automatic,targetId:target.id,status:`Đang tự đi đến ${target.name}.`};pendingDestination.current=null;}
      }
      let blocked = "",
        moving = false;
      const contacts:CollisionContact[]=[];
      let movement:'manual'|'auto'='manual';
      if (firstPerson) cameraYaw.current = pose.current.yaw;
      if(firstPerson&&profile.mode==='wheelchair'){
        lookYaw.current=Math.atan2(Math.sin(lookYaw.current+pendingTurn.current),Math.cos(lookYaw.current+pendingTurn.current));
        pendingTurn.current=0;
      }
      if (!paused && (controls.size || pendingTurn.current)) {
        if (controls.size && navigation.current.auto) { navigation.current.auto = false; if(pendingDestination.current)pendingDestination.current.automatic=false; navigation.current.status = 'Đã dừng tự đi. Bạn đang điều khiển xe.'; }
        let x = Number(controls.has("right")) - Number(controls.has("left"));
        let z =
          Number(controls.has("backward")) - Number(controls.has("forward"));
        const length = Math.hypot(x, z);
        if (length) {
          x /= length;
          z /= length;
        }
        const worldX =
          Math.cos(cameraYaw.current) * x + Math.sin(cameraYaw.current) * z;
        const worldZ =
          -Math.sin(cameraYaw.current) * x + Math.cos(cameraYaw.current) * z;
        const speed = controls.has("slow")
          ? 0.45
          : profile.mode === "walking"
            ? 2.2
            : 1.8;
        let turn =
          (Number(controls.has("turnLeft")) -
            Number(controls.has("turnRight"))) *
          dt *
          1.5;
        if (firstPerson&&profile.mode!=='wheelchair') turn += pendingTurn.current;
        pendingTurn.current = 0;
        if (!firstPerson && profile.mode!=='wheelchair' && length && !turn) {
          let wanted = Math.atan2(-worldX, -worldZ);
          let difference = Math.atan2(
            Math.sin(wanted - pose.current.yaw),
            Math.cos(wanted - pose.current.yaw),
          );
          // Backing up does not require turning the entire wheelchair inside a narrow doorway.
          if (Math.abs(difference) > Math.PI / 2) {
            wanted += Math.PI;
            difference = Math.atan2(
              Math.sin(wanted - pose.current.yaw),
              Math.cos(wanted - pose.current.yaw),
            );
          }
          turn = Math.max(-dt * 3, Math.min(dt * 3, difference));
        }
        const drive=profile.mode==='wheelchair'?wheelchairDrive(pose.current.yaw,-z,
          Number(controls.has('left')||controls.has('turnLeft'))-Number(controls.has('right')||controls.has('turnRight')),controls.has('slow'),dt):null;
        const result = moveWithCollisions(
          pose.current,
          drive?.dx ?? worldX * speed * dt,
          drive?.dz ?? worldZ * speed * dt,
          drive?.turn ?? turn,
          profile,
          obstacles,
        );
        moving =
          Math.hypot(
            result.pose.x - pose.current.x,
            result.pose.z - pose.current.z,
          ) > 0.0001;
        pose.current = result.pose;
        blocked = result.blocked?.name ?? "";
        contacts.push(...result.contacts);
      }
      const nav = navigation.current;
      if (!paused && nav.auto && nav.route.length) {
        const target = sceneObjects.current.find(o => o.id === nav.targetId)!;
        if (routeTargetReached(pose.current, target, obstacles, openDoors)) {
          nav.auto = false; nav.route = []; nav.status = `Đã đến ${target.name}. Nhấn F để tìm hiểu.`;
        } else {
          const next = nav.route[nav.index];
          if (!next) { nav.auto = false; nav.status = 'Điểm đến đã di chuyển. Chọn dẫn đường lại.'; }
          else {
            const remaining = nav.route.slice(nav.index);
            const door = currentObjects.find(o => o.kind === 'door' && !openDoors.includes(o.id) &&
              canInteract(pose.current, o, obstacles, openDoors) && routePassesDoor(pose.current, remaining, o));
            if (door && doorCanToggle(door, openDoors, pose.current, profile) && currentObjects.filter(o => o.colleague).every(o => doorCanToggle(door, openDoors, {x:o.position[0],z:o.position[2],yaw:o.yaw}, {...profile,widthCm:58,lengthCm:58}))) doorCallback.current?.(door.id);
            const dx = next.x - pose.current.x, dz = next.z - pose.current.z, distance = Math.hypot(dx, dz);
            const difference = Math.atan2(Math.sin(next.yaw - pose.current.yaw), Math.cos(next.yaw - pose.current.yaw));
            const turn = Math.max(-dt * 1.5, Math.min(dt * 1.5, difference));
            const step = Math.abs(difference) < .025 ? Math.min(distance, dt * (profile.mode==='walking'?2.2:WHEELCHAIR_SPEED)) : 0;
            const result = moveWithCollisions(pose.current, distance ? dx / distance * step : 0, distance ? dz / distance * step : 0, turn, profile, obstacles);
            pose.current = result.pose;
            contacts.push(...result.contacts);movement='auto';
            if (result.blocked) { nav.status = `Đang chờ: ${result.blocked.name}. Nhấn WASD để tự điều khiển.`; blocked = result.blocked.name; }
            else { nav.status = `Đang tự đi đến ${target.name}. WASD hoặc P để dừng.`; moving = step > 0; }
            if (Math.hypot(next.x - pose.current.x, next.z - pose.current.z) < .001 && Math.abs(difference) < .025) nav.index++;
          }
        }
      } else if (!paused && nav.route.length && !nav.auto) {
        // Hide completed sections when the user follows the floor route manually.
        while (nav.index < nav.route.length - 1 && Math.hypot(nav.route[nav.index].x - pose.current.x, nav.route[nav.index].z - pose.current.z) < .4) nav.index++;
      }
      if(!paused&&!riding){
        for(const event of collisionEpisodes.current.sample(contacts,pose.current,profile,now,movement))collisionCallback.current?.(event);
      }
      if (now - lastPublish > 90) {
        lastPublish = now;
        const candidates = currentObjects
          .filter(()=>!riding)
          .filter((o) => canInteract(pose.current, o, obstacles, openDoors))
          .sort(
            (a, b) =>
              objectDistance(pose.current, a, openDoors) -
              objectDistance(pose.current, b, openDoors),
          )
          .map((o) => o.id);
        nearby.current = candidates;
        if (!candidates.includes(preferred.current ?? ""))
          preferred.current = candidates[0] ?? null;
        setView({
                pose: { ...pose.current },
                nearby: candidates,
                blocked,
                moving,
                objects: sceneObjects.current.map(o => ({ ...o })),
                route: nav.route.slice(nav.index), auto: nav.auto, navigationStatus: nav.status,
                elevator:{...elevator.current},
              });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [profile, staticObstacles, openDoors, firstPerson, pausedByMenu]);
  useEffect(() => {
    if (!firstPerson) return;
    const element = stage.current;
    let drag: { id: number; x: number; y: number } | null = null;
    const release = () => {
      drag = null;
      pendingTurn.current = 0;
    };
    const down = (e: PointerEvent) => {
      if (document.pointerLockElement || !(e.target instanceof HTMLCanvasElement) || e.button !== 0 || document.querySelector('dialog[open]')) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      e.target.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      if (document.querySelector('dialog[open]') || document.hidden || !element?.contains(document.activeElement)) { release(); return; }
      pendingTurn.current = Math.max(-.3, Math.min(.3, pendingTurn.current - (e.clientX - drag.x) * .004));
      lookPitch.current = Math.max(-1.1, Math.min(1.1, lookPitch.current - (e.clientY - drag.y) * .004));
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const lockedMove = (e: MouseEvent) => {
      if (!document.pointerLockElement || pausedByMenu || document.hidden || document.querySelector('dialog[open]')) return;
      pendingTurn.current = Math.max(-.3, Math.min(.3, pendingTurn.current - e.movementX * .003));
      lookPitch.current = Math.max(-1.1, Math.min(1.1, lookPitch.current - e.movementY * .003));
    };
    element?.addEventListener('pointerdown', down);
    element?.addEventListener('pointermove', move);
    element?.addEventListener('pointerup', release);
    element?.addEventListener('pointercancel', release);
    element?.addEventListener('lostpointercapture', release);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    document.addEventListener('mousemove', lockedMove);
    document.addEventListener('pointerlockchange', release);
    return () => {
      release();
      element?.removeEventListener('pointerdown', down);
      element?.removeEventListener('pointermove', move);
      element?.removeEventListener('pointerup', release);
      element?.removeEventListener('pointercancel', release);
      element?.removeEventListener('lostpointercapture', release);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
      document.removeEventListener('mousemove', lockedMove);
      document.removeEventListener('pointerlockchange', release);
    };
  }, [firstPerson, stage, pausedByMenu]);
  useEffect(() => {
    const release = () => {
      pressed.current.clear();
      virtual.current.clear();
    };
    const keydown = (e: KeyboardEvent) => {
      if (
        document.querySelector("dialog[open]") ||
        !stage.current?.contains(document.activeElement)
      )
        return;
      if ((e.target as HTMLElement)?.closest("input,select,textarea")) return;
      if (bindings[e.code]) {
        e.preventDefault();
        if (navigation.current.auto) { navigation.current.auto = false; if(pendingDestination.current)pendingDestination.current.automatic=false; navigation.current.status = 'Đã dừng tự đi. Bạn đang điều khiển xe.'; }
        pressed.current.add(e.code);
      }
      if (e.code === "KeyF" && !e.repeat) {
        if(elevator.current.rider)return;
        navigation.current.auto = false;
        e.preventDefault();
        const id = preferred.current;
        if (id && nearby.current.includes(id)) interact.current(id);
      }
    };
    const keyup = (e: KeyboardEvent) => pressed.current.delete(e.code);
    const focusout = () => {
      if (!stage.current?.contains(document.activeElement)) release();
    };
    const unlock = () => { if (!document.pointerLockElement) release(); };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", release);
    window.addEventListener("focusin", focusout);
    document.addEventListener("visibilitychange", release);
    document.addEventListener('pointerlockchange', unlock);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", release);
      window.removeEventListener("focusin", focusout);
      document.removeEventListener("visibilitychange", release);
      document.removeEventListener('pointerlockchange', unlock);
      release();
    };
  }, [stage]);
  const setControl = (control: Control, active: boolean) => {
    if (active) { if (navigation.current.auto) { navigation.current.auto = false; if(pendingDestination.current)pendingDestination.current.automatic=false; navigation.current.status = 'Đã dừng tự đi. Bạn đang điều khiển xe.'; } virtual.current.add(control); }
    else virtual.current.delete(control);
  };
  const chooseNearby = (id: string) => {
    if (nearby.current.includes(id)) preferred.current = id;
  };
  const triggerInteraction = (id?: string) => {
    if(elevator.current.rider)return;
    navigation.current.auto = false;
    const candidate = id ?? preferred.current;
    if (candidate && nearby.current.includes(candidate))
      interact.current(candidate);
  };
  const navigate = (id: string, automatic: boolean) => {
    if(elevator.current.rider || insideCabin(pose.current,profile))return false;
    let target = sceneObjects.current.find(o => o.id === id);
    pendingDestination.current=null;
    const destination=objects.find(o=>o.id===id);
    if(destination && (destination.floor ?? 1)!==floor){pendingDestination.current={id,automatic};target=sceneObjects.current.find(o=>o.id===`lift-${floor}`);}
    if (!target) return;
    const route = planRoute(pose.current, target, profile, sceneObjects.current);
    navigation.current = { route: route ?? [], index: 1, auto: automatic && !!route, targetId: target.id,
      status: route ? `${automatic ? 'Đang tự đi đến' : 'Đi theo vạch chỉ đường đến'} ${target.name}.` : 'Chưa tìm được đường phù hợp với xe. Hãy lùi ra chỗ rộng hoặc chọn điểm khác.' };
    return !!route;
  };
  const changeFloor = (id:string):string|null => {
    const connector=sceneObjects.current.find(o=>o.id===id);
    if(!connector?.connection || !canInteract(pose.current,connector,obstacleRef.current,openDoors))return 'Đến gần lối nối tầng để sử dụng.';
    if(connector.kind==='elevator'){
      const error=requestLift(elevator.current,connector.connection.targetFloor,true,pose.current,profile);
      if(!error){navigation.current.auto=false;navigation.current.route=[];navigation.current.status='Cửa đang đóng. Cabin sẽ nâng bạn tới tầng đã chọn.';pressed.current.clear();virtual.current.clear();}
      return error;
    }
    if(connector.kind==='stairs' && profile.mode==='wheelchair')return 'Xe lăn sử dụng thang máy. Chọn dẫn đường đến thang máy.';
    const next={...connector.connection.arrival,y:floorY(connector.connection.targetFloor)};
    if(blockingAt(next,profile,worldObstacles(openDoors,objects,next.floor)))return 'Sảnh tầng đến đang bị chắn. Hãy thử lại.';
    pose.current=next;setFloor(next.floor!);pressed.current.clear();virtual.current.clear();pendingTurn.current=0;lookPitch.current=0;nearby.current=[];preferred.current=null;
    const pending=pendingDestination.current;
    const target=pending && objects.find(o=>o.id===pending.id);
    const route=target?planRoute(next,target,profile):null;
    navigation.current={route:route ?? [],index:1,auto:!!route && !!pending?.automatic,targetId:target?.id ?? '',status:`Đã đến tầng ${next.floor}.`};
    setView({pose:next,nearby:[],blocked:'',moving:false,objects:sceneObjects.current,route:route ?? [],auto:navigation.current.auto,navigationStatus:navigation.current.status,elevator:{...elevator.current}});
    pendingDestination.current=null;
    return null;
  };
  const stopNavigation = () => { navigation.current.auto = false; if(pendingDestination.current)pendingDestination.current.automatic=false; navigation.current.status = 'Đã dừng tự đi. Bạn có thể tiếp tục theo vạch trên sàn.'; };
  return {
    pose,
    cameraYaw,
    lookPitch,
    lookYaw,
    view,
    obstacles: obstacleRef.current,
    navigate, stopNavigation,
    setControl,
    chooseNearby,
    triggerInteraction,
    returnToEntry,
    floor, changeFloor, elevator,
    callElevator:()=>{const error=requestLift(elevator.current,floor,false,pose.current,profile);if(!error){navigation.current.auto=false;navigation.current.route=[];navigation.current.status='Đã gọi thang. Chờ cửa mở, dùng WASD vào cabin rồi nhấn F chọn tầng.';}return error;},
  };
}
