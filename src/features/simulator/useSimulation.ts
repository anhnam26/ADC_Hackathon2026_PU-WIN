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
) {
  const pose = useRef<Pose>({ ...initial });
  const cameraYaw = useRef(Math.PI / 4);
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
  }, []);
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
      }
      const controls = new Set(
        [...pressed.current]
          .map((k) => bindings[k])
          .concat([...virtual.current]),
      );
      let blocked = "",
        moving = false;
      if (!paused && controls.size) {
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
        if (length && !turn) {
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
  }, [profile, obstacles, openDoors]);
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
    view,
    obstacles,
    setControl,
    chooseNearby,
    triggerInteraction,
    returnToEntry,
  };
}
