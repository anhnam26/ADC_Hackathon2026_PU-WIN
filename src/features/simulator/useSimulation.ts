import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { objects, SPAWN } from "../../data/space";
import { objectObstacles, worldObstacles } from "../../lib/objectGeometry";
import { planRoute } from '../../lib/navigation';
import { advanceColleagues } from '../../lib/npcMotion';
import {
  blockingAt,
  canInteract,
  moveWithCollisions,
  objectDistance,
  doorCanToggle,
} from "../../lib/physics";
import type { MobilityProfile, Pose } from "../../types/simulator";

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
) {
  const pose = useRef<Pose>({ ...initial });
  const cameraYaw = useRef(Math.PI / 4);
  const lookPitch = useRef(0);
  const pendingTurn = useRef(0);
  const pressed = useRef(new Set<string>());
  const virtual = useRef(new Set<Control>());
  const sceneObjects = useRef(objects.map(o => ({ ...o, position: [...o.position] as typeof o.position })));
  const npcWaypoints = useRef(new Map<string, number>());
  const navigation = useRef({ route: [] as Pose[], index: 0, auto: false, targetId: '', status: 'Chọn một điểm đến để bắt đầu dẫn đường.' });
  const doorCallback = useRef(onOpenDoor); doorCallback.current = onOpenDoor;
  const [view, setView] = useState({
    pose: { ...initial },
    nearby: [] as string[],
    blocked: "",
    moving: false,
    objects: sceneObjects.current.map(o => ({ ...o })),
    route: [] as Pose[], auto: false, navigationStatus: navigation.current.status,
  });
  const staticObstacles = useMemo(() => worldObstacles(openDoors, objects.filter(o => !o.colleague)), [openDoors]);
  const obstacleRef = useRef(worldObstacles(openDoors, sceneObjects.current));
  const interact = useRef(onInteract);
  interact.current = onInteract;
  const nearby = useRef<string[]>([]);
  const preferred = useRef<string | null>(null);
  const savedProfile = useRef(JSON.stringify(profile));
  const returnToEntry = useCallback(() => {
    pose.current = { ...SPAWN };
    pressed.current.clear();
    virtual.current.clear();
    pendingTurn.current = 0;
    lookPitch.current = 0;
    navigation.current = { route: [], index: 0, auto: false, targetId: '', status: 'Đã trở về lối vào.' };
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
      if (blockingAt(pose.current, profile, obstacleRef.current))
        pose.current = { ...SPAWN };
      savedProfile.current = JSON.stringify(profile);
    }
  }, [profile]);
  useEffect(() => {
    let frame = 0,
      previous = performance.now(),
      lastPublish = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.045);
      previous = now;
      const paused =
        pausedByMenu || !!document.querySelector("dialog[open]") || document.hidden || !document.hasFocus();
      advanceColleagues(sceneObjects.current, npcWaypoints.current, dt, pose.current, profile, staticObstacles, paused);
      const obstacles = [...staticObstacles, ...sceneObjects.current.filter(o => o.colleague).flatMap(o => objectObstacles(o))];
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
      let blocked = "",
        moving = false;
      if (firstPerson) cameraYaw.current = pose.current.yaw;
      if (!paused && (controls.size || pendingTurn.current)) {
        if (controls.size && navigation.current.auto) { navigation.current.auto = false; navigation.current.status = 'Đã dừng tự đi. Bạn đang điều khiển xe.'; }
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
            ? 1.5
            : 1.15;
        let turn =
          (Number(controls.has("turnLeft")) -
            Number(controls.has("turnRight"))) *
          dt *
          1.5;
        if (firstPerson) turn += pendingTurn.current;
        pendingTurn.current = 0;
        if (!firstPerson && length && !turn) {
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
        const result = moveWithCollisions(
          pose.current,
          worldX * speed * dt,
          worldZ * speed * dt,
          turn,
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
      }
      const nav = navigation.current;
      if (!paused && nav.auto && nav.route.length) {
        const target = sceneObjects.current.find(o => o.id === nav.targetId)!;
        if (canInteract(pose.current, target, obstacles, openDoors)) {
          nav.auto = false; nav.route = []; nav.status = `Đã đến ${target.name}. Nhấn F để tìm hiểu.`;
        } else {
          const next = nav.route[nav.index];
          if (!next) { nav.auto = false; nav.status = 'Điểm đến đã di chuyển. Chọn dẫn đường lại.'; }
          else {
            const remaining = nav.route.slice(nav.index);
            const door = sceneObjects.current.find(o => o.kind === 'door' && !openDoors.includes(o.id) &&
              canInteract(pose.current, o, obstacles, openDoors) && remaining.some(p => Math.hypot(p.x - o.position[0], p.z - o.position[2]) < .65));
            if (door && doorCanToggle(door, openDoors, pose.current, profile) && sceneObjects.current.filter(o => o.colleague).every(o => doorCanToggle(door, openDoors, {x:o.position[0],z:o.position[2],yaw:o.yaw}, {...profile,widthCm:58,lengthCm:58}))) doorCallback.current?.(door.id);
            const dx = next.x - pose.current.x, dz = next.z - pose.current.z, distance = Math.hypot(dx, dz);
            const difference = Math.atan2(Math.sin(next.yaw - pose.current.yaw), Math.cos(next.yaw - pose.current.yaw));
            const turn = Math.max(-dt * 1.5, Math.min(dt * 1.5, difference));
            const step = Math.abs(difference) < .025 ? Math.min(distance, dt * 1.15) : 0;
            const result = moveWithCollisions(pose.current, distance ? dx / distance * step : 0, distance ? dz / distance * step : 0, turn, profile, obstacles);
            pose.current = result.pose;
            if (result.blocked) { nav.status = `Đang chờ: ${result.blocked.name}. Nhấn WASD để tự điều khiển.`; blocked = result.blocked.name; }
            else { nav.status = `Đang tự đi đến ${target.name}. WASD hoặc P để dừng.`; moving = step > 0; }
            if (distance < .025 && Math.abs(difference) < .025) nav.index++;
          }
        }
      } else if (!paused && nav.route.length && !nav.auto) {
        // Hide completed sections when the user follows the floor route manually.
        while (nav.index < nav.route.length - 1 && Math.hypot(nav.route[nav.index].x - pose.current.x, nav.route[nav.index].z - pose.current.z) < .4) nav.index++;
      }
      if (now - lastPublish > 90) {
        lastPublish = now;
        const candidates = sceneObjects.current
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
        if (navigation.current.auto) { navigation.current.auto = false; navigation.current.status = 'Đã dừng tự đi. Bạn đang điều khiển xe.'; }
        pressed.current.add(e.code);
      }
      if (e.code === "KeyF" && !e.repeat) {
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
    if (active) { if (navigation.current.auto) { navigation.current.auto = false; navigation.current.status = 'Đã dừng tự đi. Bạn đang điều khiển xe.'; } virtual.current.add(control); }
    else virtual.current.delete(control);
  };
  const chooseNearby = (id: string) => {
    if (nearby.current.includes(id)) preferred.current = id;
  };
  const triggerInteraction = (id?: string) => {
    navigation.current.auto = false;
    const candidate = id ?? preferred.current;
    if (candidate && nearby.current.includes(candidate))
      interact.current(candidate);
  };
  const navigate = (id: string, automatic: boolean) => {
    const target = sceneObjects.current.find(o => o.id === id);
    if (!target) return;
    const route = planRoute(pose.current, target, profile, sceneObjects.current);
    navigation.current = { route: route ?? [], index: 1, auto: automatic && !!route, targetId: id,
      status: route ? `${automatic ? 'Đang tự đi đến' : 'Đi theo vạch chỉ đường đến'} ${target.name}.` : 'Chưa tìm được đường phù hợp với xe. Hãy lùi ra chỗ rộng hoặc chọn điểm khác.' };
    return !!route;
  };
  const stopNavigation = () => { navigation.current.auto = false; navigation.current.status = 'Đã dừng tự đi. Bạn có thể tiếp tục theo vạch trên sàn.'; };
  return {
    pose,
    cameraYaw,
    lookPitch,
    view,
    obstacles: obstacleRef.current,
    navigate, stopNavigation,
    setControl,
    chooseNearby,
    triggerInteraction,
    returnToEntry,
  };
}
