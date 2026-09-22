export interface Account {id:string;name:string;email:string;role:'employee'|'manager'}
export type NoteStatus='new'|'reviewing'|'approved'|'declined'|'resolved';
export interface SpatialNote {id:string;authorId:string;authorName:string;authorEmail:string;position:{floor:1|2;x:number;z:number;y:number};concern:string;request:string;status:NoteStatus;review:string;reviewerName:string;version:number;createdAt:string;updatedAt:string}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const response=await fetch(`/api${path}`,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  let data;try{data=await response.json();}catch{throw new Error('The server is not ready. Run npm run dev or npm run preview.');}
  if(!response.ok){if(response.status===401&&!path.includes('/auth/login'))window.dispatchEvent(new Event('dayzero-auth-expired'));throw new Error(data.error||'Unable to connect to the server.');}return data;
}
