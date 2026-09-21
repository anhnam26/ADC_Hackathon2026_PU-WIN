import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { objects, SPAWN } from "../../data/space";
import { worldObstacles } from "../../lib/objectGeometry";
import {
  blockingAt,
  canInteract,
  moveWithCollisions,
  objectDistance,
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
) {
  const pose = useRef<Pose>({ ...initial });
  const cameraYaw = useRef(Math.PI / 4);
  const lookPitch = useRef(0);
  const pendingTurn = useRef(0);
  const pressed = useRef(new Set<string>());
  const virtual = useRef(new Set<Control>());
  const [view, setView] = useState({
    pose: { ...initial },
    nearby: [] as string[],
    blocked: "",
    moving: false,
  });
  const obstacles = useMemo(() => worldObstacles(openDoors), [openDoors]);
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
      if (blockingAt(pose.current, profile, obstacles))
        pose.current = { ...SPAWN };
      savedProfile.current = JSON.stringify(profile);
    }
  }, [profile, obstacles]);
  useEffect(() => {
    let frame = 0,
      previous = performance.now(),
      lastPublish = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.045);
      previous = now;
      const paused =
        !!document.querySelector("dialog[open]") || document.hidden;
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
      if (now - lastPublish > 90) {
        lastPublish = now;
        const candidates = objects
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
        setView((old) =>
          JSON.stringify([old.pose, old.nearby, old.blocked, old.moving]) ===
          JSON.stringify([pose.current, candidates, blocked, moving])
            ? old
            : {
                pose: { ...pose.current },
                nearby: candidates,
                blocked,
                moving,
              },
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [profile, obstacles, openDoors, firstPerson]);
  useEffect(() => {
    if (!firstPerson) return;
    const element = stage.current;
    let drag: { id: number; x: number; y: number } | null = null;
    const release = () => {
      drag = null;
      pendingTurn.current = 0;
    };
    const down = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLCanvasElement) || e.button !== 0 || document.querySelector('dialog[open]')) return;
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
    element?.addEventListener('pointerdown', down);
    element?.addEventListener('pointermove', move);
    element?.addEventListener('pointerup', release);
    element?.addEventListener('pointercancel', release);
    element?.addEventListener('lostpointercapture', release);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      release();
      element?.removeEventListener('pointerdown', down);
      element?.removeEventListener('pointermove', move);
      element?.removeEventListener('pointerup', release);
      element?.removeEventListener('pointercancel', release);
      element?.removeEventListener('lostpointercapture', release);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
    };
  }, [firstPerson, stage]);
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
        pressed.current.add(e.code);
      }
      if (e.code === "KeyF" && !e.repeat) {
        e.preventDefault();
        const id = preferred.current;
        if (id && nearby.current.includes(id)) interact.current(id);
      }
    };
    const keyup = (e: KeyboardEvent) => pressed.current.delete(e.code);
    const focusout = () => {
      if (!stage.current?.contains(document.activeElement)) release();
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", release);
    window.addEventListener("focusin", focusout);
    document.addEventListener("visibilitychange", release);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", release);
      window.removeEventListener("focusin", focusout);
      document.removeEventListener("visibilitychange", release);
      release();
    };
  }, [stage]);
  const setControl = (control: Control, active: boolean) => {
    if (active) virtual.current.add(control);
    else virtual.current.delete(control);
  };
  const chooseNearby = (id: string) => {
    if (nearby.current.includes(id)) preferred.current = id;
  };
  const triggerInteraction = (id?: string) => {
    const candidate = id ?? preferred.current;
    if (candidate && nearby.current.includes(candidate))
      interact.current(candidate);
  };
  return {
    pose,
    cameraYaw,
    lookPitch,
    view,
    obstacles,
    setControl,
    chooseNearby,
    triggerInteraction,
    returnToEntry,
  };
}
