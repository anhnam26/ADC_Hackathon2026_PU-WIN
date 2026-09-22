import type {MobilityProfile, Pose} from './simulator';

export interface CollisionEvent {
  id: string;
  occurredAt: string;
  objectId: string;
  objectName: string;
  kind: 'object' | 'wall' | 'boundary' | 'colleague';
  movement: 'manual' | 'auto';
  action: 'translation' | 'rotation';
  position: {floor:1|2;x:number;y:number;z:number};
  playerPose: Pose;
  profile: MobilityProfile;
}
export interface SavedCollision extends CollisionEvent {runId:string;authorId:string;receivedAt:string}
export interface CollisionRun {
  id:string;authorId:string;authorName:string;authorEmail:string;
  startedAt:string;lastSeenAt:string;endedAt:string|null;
  profile:MobilityProfile;mapVersion:string;
}
export interface CollisionHistory {runs:CollisionRun[];collisions:SavedCollision[]}
