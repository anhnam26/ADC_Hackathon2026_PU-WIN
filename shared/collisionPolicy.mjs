// Retain support for reading/discarding events from older browser clients and stores.
export function isNpcCollision(event){
  return event?.kind==='colleague'||event?.kind==='npc'||event?.kind==='person'||
    (typeof event?.objectId==='string'&&event.objectId.startsWith('colleague-'));
}
