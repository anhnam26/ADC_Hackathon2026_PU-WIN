import {objects} from '../../data/space';
import catalog from '../../data/mission-points.json';
import {useLocale} from '../../lib/i18n';
import Dialog from '../../components/Dialog';
import type {useMissions} from './useMissions';
import '../../styles/missions.css';

export default function MissionHUD({quest,auto,focus}:{quest:ReturnType<typeof useMissions>;auto:boolean;focus:()=>void}){
  const {t}=useLocale(),{mission,attempt}=quest;
  const target=mission&&attempt?objects.find(o=>o.id===mission.stops[attempt.next]):null;
  const close=()=>{quest.setInbox(false);requestAnimationFrame(focus);};
  return <><section className="quest-hud" aria-label="Mission tracker" data-mission-phase={attempt?.phase??'idle'} data-mission-next={attempt?.next??0}>
    <span className="quest-overline">{attempt?.phase==='review'?'MISSION REVIEW':quest.active?'ACTIVE MISSION':'MISSION INBOX'}</span>
    {quest.active&&mission&&attempt?<><strong>{mission.name}</strong><progress aria-label="Mission progress" value={attempt.next} max={mission.stops.length}/>
      {quest.complete?<><p className="quest-success">Congratulations! You completed every checkpoint.</p><p>Returning to the starting point shortly for an automatic mission review.</p></>:<><p>{attempt.next+1}/{mission.stops.length} · {attempt.next===mission.stops.length-1?'Final destination':'Next checkpoint'}<br/><b>{target?t(target.name):''}</b> · Floor {target?.floor??1}</p><small>{quest.manual?'Drive yourself along the yellow route. W/S drive · A/D turn · F interact.':'Review retraces the mission destinations automatically. WASD or P takes control.'}</small>{attempt.phase==='review'&&<p>{auto?'Automatic review in progress.':'Review paused. Select Resume review to continue.'}</p>}<button disabled={quest.busy} onClick={()=>{quest.guide();focus();}}>{quest.manual?'Show mission route':'Resume review'}</button>{attempt.phase==='review'&&auto&&<button onClick={quest.pause}>Pause review</button>}</>}
      <button disabled={quest.busy} onClick={()=>void quest.abandon()}>Abandon mission</button>
    </>:attempt?.phase==='completed'?<><strong>Mission review complete!</strong><p>You have explored every destination twice. Your progress is saved for your manager.</p><button onClick={quest.dismiss}>Continue exploring</button></>:<><strong>{quest.feed.missions.filter(m=>!quest.feed.attempts.some(a=>a.missionId===m.id&&a.phase==='completed')).length} missions to explore</strong><p>Your manager’s missions appear here. Open the inbox to start.</p><button onClick={()=>quest.setInbox(true)}>Open missions</button></>}
    {quest.error&&<div role="alert" className="quest-error"><p>{quest.error}</p><button disabled={quest.busy} onClick={()=>void quest.retry()}>Retry sync</button>{quest.complete&&<button onClick={()=>void quest.beginReview()}>Retry review</button>}</div>}
  </section>
  {quest.inbox&&<Dialog title="Your exploration missions" subtitle="Start at the assigned spawn, visit every checkpoint yourself, then watch an automatic review." onClose={close}><div className="mission-inbox-list">{quest.feed.missions.length===0&&<p>No missions yet. New assignments arrive automatically.</p>}{quest.feed.missions.map(m=><article key={m.id}><h3>{m.name}</h3><p>Assigned by {m.managerName}</p><p>Start: {catalog.starts.find(s=>s.id===m.startId)?.name}</p><ol>{m.stops.map((id,i)=><li key={i}>{t(objects.find(o=>o.id===id)!.name)} · Floor {objects.find(o=>o.id===id)?.floor??1}{i===m.stops.length-1?' · Finish':''}</li>)}</ol><button className="button primary" disabled={quest.busy||quest.active} onClick={()=>void quest.start(m).then(()=>requestAnimationFrame(focus))}>{quest.feed.attempts.some(a=>a.missionId===m.id&&a.phase==='completed')?'Play again':'Start mission'}</button></article>)}</div>{quest.error&&<p role="alert">{quest.error}</p>}</Dialog>}
  </>;
}
