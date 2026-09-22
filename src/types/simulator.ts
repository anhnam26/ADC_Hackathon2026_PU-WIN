import { z } from "zod";
import type { Category, Point } from "./domain";

export const mobilitySchema = z
  .object({
    mode: z.enum(["wheelchair", "walking"]).default("wheelchair"),
    widthCm: z.number().min(45).max(130).default(70),
    lengthCm: z.number().min(70).max(180).default(110),
    heightCm: z.number().min(55).max(150).default(95),
    seatHeightCm: z.number().min(30).max(80).default(48),
    armrestHeightCm: z.number().min(45).max(120).default(70),
  })
  .refine(
    (p) =>
      p.seatHeightCm < p.armrestHeightCm && p.armrestHeightCm <= p.heightCm,
    {
      message:
        "Seat height must be below armrest height; armrests must not exceed the overall wheelchair height.",
    },
  );
export type MobilityProfile = z.infer<typeof mobilitySchema>;
export const defaultMobility: MobilityProfile = {
  mode: "wheelchair",
  widthCm: 70,
  lengthCm: 110,
  heightCm: 95,
  seatHeightCm: 48,
  armrestHeightCm: 70,
};
export type ObjectKind =
  | "elevator"
  | "stairs"
  | "colleague"
  | "door"
  | "desk"
  | "chair"
  | "counter"
  | "water"
  | "printer"
  | "sofa"
  | "toilet"
  | "sink"
  | "plant"
  | "screen";
export interface WorldObject {
  sourceId?: string;
  floor?: 1 | 2;
  connection?: { targetFloor: 1 | 2; arrival: Pose; cabinWidth?: number; cabinDepth?: number };
  id: string;
  name: string;
  kind: ObjectKind;
  locationId: string;
  category: Category;
  position: Point;
  yaw: number;
  size: Point;
  color: string;
  description: string;
  usage: string[];
  notes: string[];
  clearWidth?: number;
  underHeight?: number;
  underWidth?: number;
  controlHeight?: number;
  roomLabel?: string;
  patrol?: [number, number][];
  walking?: boolean;
  colleague?: {
    role: string;
    team: string;
    greeting: string;
    helpsWith: string[];
    available: string;
    skin: string;
    hair: string;
  };
}
export interface Part {
  position: Point;
  size: Point;
  color: string;
  yaw?: number;
  shape?: "box" | "cylinder" | "sphere";
  roll?: number;
  solid?: boolean;
}
export interface Obstacle {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  yaw: number;
}
export interface Pose {
  y?: number;
  floor?: 1 | 2;
  x: number;
  z: number;
  yaw: number;
}
export interface WorldWall {
  floor?: 1 | 2;
  id: string;
  position: Point;
  size: Point;
}
