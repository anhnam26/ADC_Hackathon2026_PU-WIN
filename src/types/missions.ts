export interface Mission {
  id:string; name:string; startId:string; stops:string[]; assigneeId:string;
  createdAt:string; managerName:string;
}
export interface MissionAttempt {
  id:string; missionId:string; userId:string; userName:string;
  phase:'manual'|'review'|'completed'|'cancelled'; next:number;
  startedAt:string; completedAt?:string; manualCompletedAt?:string; version:number;
}
export interface MissionFeed {missions:Mission[];attempts:MissionAttempt[]}
