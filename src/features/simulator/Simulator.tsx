import { useLocale } from '../../lib/i18n';
import LanguageSwitch from '../../components/LanguageSwitch';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Accessibility,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronRight,
  Crosshair,
  Flag,
  Gamepad2,
  Maximize,
  RotateCcw,
  RotateCw,
  Ruler,
  Settings2,
  X,
} from "lucide-react";
import { objects, objectById, objectives, WORLD } from "../../data/space";
import { journey } from "../../data/journey";
import { useDemoStore } from "../../store/useDemoStore";
import { doorCanToggle, canInteract, objectDistance } from "../../lib/physics";
import { useSimulation, type Control } from "./useSimulation";
import Map2D from "./Map2D";
import ObjectInspector, { measurementSummary } from "./ObjectInspector";
import FloorConnection from './FloorConnection';
import { floorLabel } from '../../data/building';
import { insideCabin, floorY } from '../../lib/elevator';
import ColleagueInspector from './ColleagueInspector';
import Dialog from '../../components/Dialog';
import { useGameDisplay } from './useGameDisplay';
import { useTextGuide } from './useTextGuide';
import NotesDialog from '../notes/NotesDialog';
import type {Pose} from '../../types/simulator';
import { routeLength } from '../../lib/navigation';
import type { IssueContext } from "../issues/IssueForm";

const OfficeScene = lazy(() => import("./OfficeScene"));
const webglAvailable = () => {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    const result = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return result;
  } catch {
    return false;
  }
};
export default function Simulator({
  onIssue,
  onSummary,
  onPreferences,
  notify,
  target,
  onMenu,
  onCollision,
  collisionStatus,
}: {
  onIssue: (context: IssueContext) => void;
  onSummary: () => void;
  onPreferences: () => void;
  notify: (s: string) => void;
  target: string | null;
  onMenu: () => void;
  onCollision:(event:import('../../types/collisions').CollisionEvent)=>void;
  collisionStatus:string;
}) {
  const { t, language } = useLocale();
  const {
    session,
    inspectObject,
    setOpenDoors,
    savePose,
    selectStep,
    setStepStatus,
  } = useDemoStore();
  const stage = useRef<HTMLDivElement>(null);
  const [inspected, setInspected] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [mode, setMode] = useState<"3d" | "2d">(() =>
    webglAvailable() ? "3d" : "2d",
  );
  const [failed, setFailed] = useState(mode === "2d");
  const [cameraMode, setCameraMode] = useState<'first-person' | 'third-person' | 'overview'>('first-person');
  const firstPerson = cameraMode === 'first-person';
  const [reset, setReset] = useState(0);
  const [journal, setJournal] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [destination, setDestination] = useState('reception-counter');
  const guide = useTextGuide();
  const [notePose,setNotePose]=useState<Pose|null>(null);
  const immersive = mode === '3d' && cameraMode !== 'overview';
  const display = useGameDisplay(stage, immersive, notify);
  const [catalog, setCatalog] = useState<'schedule' | 'objects' | 'colleagues'>('schedule');
  const handleInteract = useCallback(
    (id: string) => {
      inspectObject(id);
      setInspected(id);
    },
    [inspectObject],
  );
  const autoOpenDoor = useCallback((id: string) => {
    const store = useDemoStore.getState();
    if (!store.session.openDoors.includes(id)) store.setOpenDoors([...store.session.openDoors, id]);
  }, []);
  const sim = useSimulation(
    session.mobility,
    session.openDoors,
    stage,
    handleInteract,
    session.playerPose,
    immersive,
    false,
    autoOpenDoor,
    onCollision,
  );
  const nearestId = sim.view.nearby.includes(chosen ?? "")
    ? chosen
    : (sim.view.nearby[0] ?? null);
  const nearest = sim.view.objects.find(o => o.id === nearestId);
  const activeObject = sim.view.objects.find(o => o.id === inspected);
  const objective = objectives[session.currentStep];
  const objectiveIds = target
    ? objects.filter((o) => o.locationId === target).map((o) => o.id)
    : objective.ids;
  const seen = objective.ids.filter((id) =>
    session.inspectedIds.includes(id),
  ).length;
  useEffect(() => { guide.show(`${t(objective.label)}. ${t(objective.hint)} ${t('Nhấn N để chọn điểm đến và dẫn đường.')}`); }, [objective, guide.show, language]);
  useEffect(() => { if (sim.view.navigationStatus !== 'Chọn một điểm đến để bắt đầu dẫn đường.') guide.show(sim.view.navigationStatus); }, [sim.view.navigationStatus, guide.show]);
  const openNote=()=>{sim.stopNavigation();setNotePose({...sim.pose.current});};
  const navigateToSelected = (automatic: boolean) => {
    setChosen(destination);
    sim.navigate(destination, automatic);
    setNavigationOpen(false);
    requestAnimationFrame(() => stage.current?.focus({ preventScroll: true }));
  };
  useEffect(() => {
    if (nearestId) sim.chooseNearby(nearestId);
  }, [nearestId, sim]);
  useEffect(() => {
    let last = { ...sim.pose.current };
    const timer = setInterval(() => {
      const current = sim.pose.current;
      if (
        Math.hypot(current.x - last.x, current.z - last.z) > 0.02 ||
        Math.abs(current.yaw - last.yaw) > 0.02 || current.floor !== last.floor
      ) {
        savePose({...current,y:floorY(current.floor ?? 1)});
        last = { ...current };
      }
    }, 900);
    const persist = () => savePose({...sim.pose.current,y:floorY(sim.pose.current.floor ?? 1)});
    window.addEventListener("pagehide", persist);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [savePose, sim.pose]);
  useEffect(() => {
    const hotkey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || document.querySelector('dialog[open]') ||
        !stage.current?.contains(document.activeElement) || (e.target as HTMLElement).closest('input,textarea,select')) return;
      if (e.code === 'KeyV' && mode === '3d') {
        e.preventDefault();
        setCameraMode(current => current === 'first-person' ? 'third-person' : 'first-person');
      }
      if (e.code === 'KeyJ') { e.preventDefault(); setJournal(true); }
      if (e.code === 'KeyN') { e.preventDefault(); setNavigationOpen(true); }
      if (e.code === 'KeyP') { e.preventDefault(); if (sim.view.auto) sim.stopNavigation(); else { setChosen(destination); sim.navigate(destination, true); } }
      if (e.code === 'KeyB') {e.preventDefault();openNote();}
    };
    window.addEventListener('keydown', hotkey);
    return () => window.removeEventListener('keydown', hotkey);
  }, [mode, destination, sim]);
  const unavailable = useCallback(() => {
    setFailed(true);
    setMode("2d");
  }, []);
  useEffect(() => {
    const element = stage.current;
    const lost = (event: Event) => { event.preventDefault(); unavailable(); };
    element?.addEventListener('webglcontextlost', lost, true);
    return () => element?.removeEventListener('webglcontextlost', lost, true);
  }, [unavailable]);
  const focusGame = () => stage.current?.focus({ preventScroll: true });
  const closeInspector = () => {
    setInspected(null);
    requestAnimationFrame(focusGame);
  };
  const report = () => {
    const o = activeObject ?? nearest;
    if (!o) return;
    setInspected(null);
    onIssue({
      locationId: o.locationId,
      stepId: session.currentStep,
      objectId: o.id,
      objectName: o.name,
      category: o.category,
      measurementNote: measurementSummary(o, session.mobility),
      suggestion: language === 'en' ? `Please verify whether I can use ${t(o.name)} with my wheelchair.` : `Cần xác minh điều kiện sử dụng ${o.name.toLocaleLowerCase("vi")} với xe của tôi.`,
    });
  };
  const choose = (id: string) => {
    if (sim.view.nearby.includes(id)) {
      setJournal(false);
      setChosen(id);
      sim.chooseNearby(id);
      sim.triggerInteraction(id);
    } else
      notify(
        language === 'en' ? `Move closer to ${t(objectById(id)?.name ?? 'đồ vật')} and press F.` : `Hãy tự di chuyển đến gần ${objectById(id)?.name ?? t("đồ vật")} rồi nhấn F.`,
      );
    focusGame();
  };
  const toggleDoor = () => {
    if (
      !activeObject ||
      !canInteract(
        sim.pose.current,
        activeObject,
        sim.obstacles,
        session.openDoors,
      )
    )
      return t("Bạn cần ở gần cửa để thao tác.");
    if (
      !doorCanToggle(
        activeObject,
        session.openDoors,
        sim.pose.current,
        session.mobility,
      )
    )
      return t("Xe đang nằm trong vùng quét của cánh cửa. Đóng bảng thông tin, lùi ra rồi thử lại.");
    setOpenDoors(
      session.openDoors.includes(activeObject.id)
        ? session.openDoors.filter((id) => id !== activeObject.id)
        : [...session.openDoors, activeObject.id],
    );
    return null;
  };
  const controls: { key: Control; label: string; icon: React.ReactNode }[] = [
    { key: "forward", label: immersive ? t("Tiến về phía trước") : t("Tiến lên màn hình"), icon: <ArrowUp size={19} /> },
    {
      key: "left",
      label: t("Di chuyển sang trái"),
      icon: <ArrowLeft size={19} />,
    },
    {
      key: "backward",
      label: immersive ? t("Lùi lại") : t("Lùi xuống màn hình"),
      icon: <ArrowDown size={19} />,
    },
    {
      key: "right",
      label: t("Di chuyển sang phải"),
      icon: <ArrowRight size={19} />,
    },
    {
      key: "turnLeft",
      label: t("Xoay trái tại chỗ"),
      icon: <RotateCcw size={16} />,
    },
    {
      key: "turnRight",
      label: t("Xoay phải tại chỗ"),
      icon: <RotateCw size={16} />,
    },
  ];
  return (
    <div className="play-page">
      <div className="play-heading">
        <div>
          <span className="eyebrow">
            <span className="live-dot" />{t("DAY ZERO · WORKPLACE SIMULATOR")}</span>
          <h1>{t("Không gian mới.")}<span>{t("Nhịp đi của bạn.")}</span>
          </h1>
          <p>{t("Tự mình khám phá, chạm tới những điều quen thuộc trước ngày đầu.")}</p>
        </div>
        <button className="button secondary" onClick={onPreferences}>
          <Accessibility size={17} />
          {session.mobility.mode === "wheelchair"
            ? t(`Xe của bạn · ${session.mobility.widthCm} × ${session.mobility.lengthCm} cm`)
            : t("Nhân vật đi bộ")}
          <Settings2 size={15} />
        </button>
      </div>
      <div className="play-layout">
        <section className="world-card" data-fullscreen={display.fullscreen}>
          <header className="world-topbar">
            <div>
              <span className="world-status" />
              <strong>DAY ZERO<span className="game-brand-sub">OFFICE SIMULATOR</span></strong>
              <span className="world-divider">/</span>
              <span>{t("Khám phá tự do")}</span>
            </div>
            <div className="world-tools">
              <span className="floor-badge" data-testid="floor-label">{floorLabel(sim.floor,language)}{sim.floor===1 && sim.view.pose.z>7 ? (language==='vi'?' · Ngoài tòa nhà':' · Outside') : ''}</span>
              <LanguageSwitch />
              <button className="game-tool" onClick={() => setNavigationOpen(true)} aria-label={t("Chọn điểm đến")}><kbd>N</kbd><span>{t("Điểm đến")}</span></button>
              <button className="game-tool" onClick={() => setJournal(true)}><BookOpen size={16} /><span>{t("Nhật ký")}</span><kbd>J</kbd></button>
              <button className="game-tool" disabled={mode !== '3d'} onClick={() => { setCameraMode(current => current === 'first-person' ? 'third-person' : 'first-person'); focusGame(); }} aria-label={t("Đổi góc nhìn V")}><kbd>V</kbd><span>{firstPerson ? t("Góc nhìn 1") : cameraMode === 'third-person' ? t("Góc nhìn 3") : t("Toàn cảnh")}</span></button>
              <div className="segmented">
                <button
                  disabled={failed}
                  aria-pressed={mode === "3d"}
                  onClick={() => setMode("3d")}
                >
                  3D
                </button>
                <button
                  aria-pressed={mode === "2d"}
                  onClick={() => setMode("2d")}
                >
                  2D
                </button>
              </div>
              <button
                className="icon-button"
                aria-label={cameraMode !== 'overview' ? t("Xem toàn văn phòng") : t("Góc nhìn thứ nhất")}
                title={cameraMode !== 'overview' ? t("Xem toàn văn phòng") : t("Góc nhìn thứ nhất")}
                disabled={mode !== '3d'}
                onClick={() => setCameraMode(current => current === 'overview' ? 'first-person' : 'overview')}
                aria-pressed={cameraMode === 'overview'}
              >
                <Crosshair size={18} />
              </button>
              <button
                className="icon-button"
                aria-label={t("Đặt lại góc nhìn")}
                onClick={() => setReset((v) => v + 1)}
              >
                <RotateCcw size={16} />
              </button>
              <button
                className="icon-button"
                aria-label={display.fullscreen ? t("Thoát toàn màn hình") : t("Toàn màn hình")}
                title={display.fullscreen ? t("Thoát toàn màn hình") : t("Toàn màn hình")}
                onClick={display.toggleFullscreen}
              >
                {display.fullscreen ? <X size={18} /> : <Maximize size={17} />}
              </button>
              <button className="game-tool" onClick={onMenu}>Menu</button>
            </div>
          </header>
          <div
            className="world-stage"
            ref={stage}
            tabIndex={0}
            role="region"
            aria-label={t("Điều khiển nhân vật bằng WASD. F tương tác. Q E xoay tại chỗ.")}
            data-testid="game-stage"
            data-x={sim.view.pose.x.toFixed(3)}
            data-z={sim.view.pose.z.toFixed(3)}
            data-yaw={sim.view.pose.yaw.toFixed(3)}
            data-camera={mode === '2d' ? 'map' : cameraMode}
            data-floor={sim.floor}
            data-height={(sim.view.pose.y ?? floorY(sim.floor)).toFixed(3)}
            data-lift-phase={sim.view.elevator.phase}
            data-lift-height={sim.view.elevator.y.toFixed(3)}
            data-lift-door={sim.view.elevator.door.toFixed(3)}
            data-pointer-locked={display.locked}
            data-autowalk={sim.view.auto}
            onPointerDown={(e) => {
              if (!(e.target as HTMLElement).closest("button,select"))
                focusGame();
            }}
          >
            {mode === "3d" ? (
              <Suspense
                fallback={
                  <div className="scene-loading">
                    <span className="loader" />
                    <p>{t("Đang mở văn phòng của bạn…")}</p>
                  </div>
                }
              >
                <OfficeScene
                  sceneObjects={sim.view.objects}
                  elevator={sim.elevator}
                  route={sim.view.route}
                  profile={session.mobility}
                  pose={sim.pose}
                  cameraYaw={sim.cameraYaw}
                  openDoors={session.openDoors}
                  nearest={nearestId}
                  destinationIds={objectiveIds}
                  inspected={session.inspectedIds}
                  firstPerson={firstPerson}
                  thirdPerson={cameraMode === 'third-person'}
                  lookPitch={sim.lookPitch}
                  reset={reset}
                  reducedMotion={session.reducedMotion}
                  onUnavailable={unavailable}
                  onSelect={choose}
                />
              </Suspense>
            ) : (
              <Map2D
                sceneObjects={sim.view.objects.filter(o=>(o.floor ?? 1)===sim.floor)}
                elevator={sim.view.elevator}
                route={sim.view.route}
                pose={sim.view.pose}
                profile={session.mobility}
                openDoors={session.openDoors}
                nearest={nearestId}
                onSelect={choose}
                cameraYaw={sim.cameraYaw}
              />
            )}
            <div className="world-scale">
              <Ruler size={14} />
              <span>{t("TỶ LỆ THỐNG NHẤT")}<strong>{t("1 ô lưới = 1 m")}</strong>
              </span>
            </div>
            <div className="world-discovered">
              <BookOpen size={15} />
              {session.inspectedIds.length}/{objects.length}
              <span>{t("điểm đã khám phá")}</span>
            </div>
            {immersive && <div className="first-person-hint">{firstPerson ? t("Góc nhìn thứ nhất") : t("Góc nhìn thứ ba")} · {display.locked ? t("Di chuột để nhìn · Esc hiện chuột") : t("Enter ẩn chuột · Vuốt để nhìn")} {t("· V đổi góc nhìn")}</div>}
            {immersive && <div className="game-crosshair" aria-hidden="true">+</div>}
            {immersive && !display.locked && display.canLock && <button className="resume-pointer" onClick={display.lock}>{t("Enter · Tiếp tục chơi")}</button>}
            <div className="movement-hud">
              <div className="movement-pad">
                {controls.map((c) => (
                  <button
                    key={c.key}
                    className={`pad-${c.key}`}
                    aria-label={c.label}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      focusGame();
                      sim.setControl(c.key, true);
                    }}
                    onPointerUp={() => sim.setControl(c.key, false)}
                    onPointerCancel={() => sim.setControl(c.key, false)}
                    onLostPointerCapture={() => sim.setControl(c.key, false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        sim.setControl(c.key, true);
                      }
                    }}
                    onKeyUp={() => sim.setControl(c.key, false)}
                    onBlur={() => sim.setControl(c.key, false)}
                  >
                    {c.icon}
                  </button>
                ))}
              </div>
              <span>{t("WASD / Mũi tên")}</span>
            </div>
            <div className="interaction-hud" aria-live="polite">
              {nearest ? (
                <>
                  <span className="proximity-label">{t("TRONG TẦM TƯƠNG TÁC ·")}{" "}
                    {objectDistance(
                      sim.view.pose,
                      nearest,
                      session.openDoors,
                    ).toFixed(1)}{" "}
                    m
                  </span>
                  <button
                    className="interact-button"
                    onClick={() => sim.triggerInteraction(nearest.id)}
                  >
                    <kbd>F</kbd>
                    <span>
                      <strong>{t(nearest.name)}</strong>
                      <small>{nearest.kind === 'colleague' ? t("Làm quen · Xem hồ sơ đồng nghiệp") : t("Xem cách dùng, lưu ý & kích thước")}</small>
                    </span>
                    <ChevronRight size={20} />
                  </button>
                  {sim.view.nearby.length > 1 && (
                    <select
                      aria-label={t("Chọn đồ vật ở gần")}
                      value={nearestId ?? ""}
                      onChange={(e) => {
                        setChosen(e.target.value);
                        sim.chooseNearby(e.target.value);
                        focusGame();
                      }}
                    >
                      {sim.view.nearby.map((id) => (
                        <option key={id} value={id}>
                          {t(objectById(id)!.name)}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              ) : (
                <div className="no-nearby">
                  <Gamepad2 size={19} />
                  <span>{t("Di chuyển đến gần đồ vật để tương tác")}<small>{t("Bấm vào không gian, rồi dùng WASD.")}</small>
                  </span>
                </div>
              )}
            </div>
            <p className="collision-sync-status" role="status">{collisionStatus}</p>
            {sim.view.blocked && (
              <div className="collision-hint" role="status">
                <span>!</span>{t("Đang chạm:")} {t(sim.view.blocked)}{t(". Lùi hoặc đổi hướng để tiếp tục.")}</div>
            )}
          </div>
          {failed && (
            <p className="fallback-note">{t("Thiết bị chưa hiển thị được 3D. Chế độ 2D giữ nguyên kích thước, va chạm và điều khiển WASD.")}</p>
          )}
          <footer className="world-bottom">
            <span>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> {immersive ? t("Di chuyển") : t("Theo màn hình")}
            </span>
            <span>
              <kbd>F</kbd>{t("Tương tác")}</span>
            <span>
              <kbd>Q</kbd>
              <kbd>E</kbd> {t('Xoay xe')}
            </span>
            <span>
              <kbd>Shift</kbd>{t("Đi chậm")}</span>
            <span><kbd>V</kbd>{t("Góc nhìn")}</span>
            <span><kbd>Esc</kbd>{t("Hiện chuột")}</span>
            <button
              onClick={() => {
                sim.returnToEntry();
                focusGame();
                notify(t("Đã trở về điểm bắt đầu."));
              }}
            >
              <RotateCcw size={13} />{t("Về lối vào")}</button>
          </footer>
          <section className="navigation-hud" aria-label={t("Hướng dẫn khám phá")}>
            <p className="lift-hud" data-testid="lift-status">{t('THANG MÁY')} · {t(`lift-phase-${sim.view.elevator.phase}`)} · {sim.view.elevator.y.toFixed(1)} m</p>
            <div className="navigation-actions"><button onClick={() => setNavigationOpen(true)}>{t("N · Chọn điểm đến")}</button><button onClick={() => sim.view.auto ? sim.stopNavigation() : navigateToSelected(true)}>{sim.view.auto ? t("P · Dừng tự đi") : t("P · Tự đi")}</button><button className="note-tool" onClick={openNote}>{language==='vi'?'B · Ghi chú vị trí':'B · Add location note'}</button></div>
            {sim.view.route.length > 0 && <small>{t("Vạch vàng trên sàn · Còn khoảng")} {routeLength([sim.view.pose, ...sim.view.route]).toFixed(1)} m</small>}
          </section>
          <div className="subtitle-bar" role="status" aria-live="polite"><span>{language === 'vi' ? 'HƯỚNG DẪN' : 'GUIDE'}</span><p className="guide-caption">{guide.caption}</p></div>
        </section>
        <aside className="explore-sidebar">
          <section className="current-mission">
            <span className="eyebrow">{t("LÀM QUEN NGÀY ĐẦU ·")} {journey[session.currentStep].time}
            </span>
            <h2>{t(objective.label)}</h2>
            <p>{t(objective.hint)}</p>
            <div className="mission-progress">
              {objective.ids.map((id) => (
                <span
                  key={id}
                  className={session.inspectedIds.includes(id) ? "seen" : ""}
                >
                  {session.inspectedIds.includes(id) ? (
                    <Check size={14} />
                  ) : (
                    <span className="mission-dot" />
                  )}
                  {t(objectById(id)?.name ?? '')}
                </span>
              ))}
            </div>
            <button
              className="button primary"
              disabled={
                seen !== objective.ids.length ||
                (session.currentStep === 6 && (sim.floor !== 1 || sim.view.pose.z < 7.6))
              }
              onClick={() => {
                setStepStatus("completed");
                if (session.currentStep < 6)
                  selectStep(session.currentStep + 1);
                else onSummary();
              }}
            >{t("Hoàn thành chặng")}<ArrowRight size={15} />
            </button>
            <small>{t("Chọn chặng chỉ đổi mục tiêu. Bạn tự điều khiển đến đó.")}</small>
          </section>
          {journal && <Dialog title={t("Nhật ký ngày đầu")} subtitle={t("Lịch trình, đồ vật và những đồng nghiệp bạn sẽ gặp.")} onClose={() => { setJournal(false); focusGame(); }}>
          <nav className="journal-tabs" aria-label={t('Nhật ký')}>{(['schedule','objects','colleagues'] as const).map(section => <button key={section} aria-pressed={catalog === section} onClick={() => setCatalog(section)}>{t(section === 'schedule' ? 'Lịch trình' : section === 'objects' ? 'Đồ vật' : 'Đồng nghiệp')}<small>{section === 'schedule' ? 7 : objects.filter(o => section === 'colleagues' ? !!o.colleague : !o.colleague).length}</small></button>)}</nav>
          {catalog === 'schedule' && <section className="play-journey">
            <div className="section-heading">
              <h3>{t("Lịch trình của bạn")}</h3>
              <span>
                {session.stepStatuses.filter((v) => v === "completed").length}/7
              </span>
            </div>
            {journey.map((step, i) => (
              <button
                key={step.id}
                className={session.currentStep === i ? "selected" : ""}
                onClick={() => selectStep(i)}
              >
                <span className="play-step">
                  {session.stepStatuses[i] === "completed" ? (
                    <Check size={12} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span>
                  <time>{step.time}</time>
                  <strong>{t(step.title)}</strong>
                </span>
                {session.currentStep === i && <ChevronRight size={14} />}
              </button>
            ))}
          </section>}
          {catalog !== 'schedule' && (
            <div className="object-catalog" data-category={catalog}>
              {objects.map(o=>sim.view.objects.find(live=>live.id===o.id) ?? o).filter(o => catalog === 'colleagues' ? !!o.colleague : !o.colleague).map((o) => (
                <button key={o.id} onClick={() => choose(o.id)}>
                  <span>{t(o.name)}<small>{floorLabel(o.floor ?? 1,language)}{o.colleague && ` · ${t(o.colleague.role)}`}</small></span>
                  <small>
                    {session.inspectedIds.includes(o.id)
                      ? t("Đã tìm hiểu")
                      : (o.floor ?? 1)!==sim.floor ? floorLabel(o.floor ?? 1,language) : `${objectDistance(sim.view.pose, o, session.openDoors).toFixed(1)} m`}
                  </small>
                </button>
              ))}
            </div>
          )}
          <button className="button secondary" onClick={onSummary}>
            <Flag size={15} />{t("Ghi nhận & nhiệm vụ (")}{session.issues.length})
          </button>
          <p className="world-note">{t("Va chạm theo dấu chiếm chỗ của xe. Đến gần trong khoảng")}{" "}
            {WORLD.interactionRange.toFixed(2)} {t("m để nhấn F. Mô hình chưa mô phỏng lực, tầm với hoặc chuyển người.")}</p>
          </Dialog>}
        </aside>
      </div>
      {notePose&&<NotesDialog pose={notePose} onClose={()=>{setNotePose(null);requestAnimationFrame(focusGame);}}/>}
      {navigationOpen && <Dialog title={t("Bạn muốn đến đâu?")} subtitle={t("Đi theo vạch vàng hoặc để nhân vật tự đi. WASD/P dừng tự đi bất cứ lúc nào.")} onClose={() => setNavigationOpen(false)}>
        <label className="destination-field">{t("Điểm đến")}<select aria-label={t("Điểm đến")} value={destination} onChange={e => setDestination(e.target.value)}>{objects.map(o => <option key={o.id} value={o.id}>{floorLabel(o.floor ?? 1,language)} · {t(o.name)}</option>)}</select></label>
        <p>{language==='vi'?'Điểm đến khác tầng: tới thang máy, F gọi thang, tự lái vào cabin rồi F chọn tầng. Sau khi cửa mở ở tầng đến, lái ra sảnh để tiếp tục đường đi.':'For another floor: reach the lift, press F to call it, drive into the cabin and press F to choose the floor. Exit into the lobby after arrival to continue your route.'}</p>
        <div className="dialog-actions"><button className="button secondary" onClick={() => navigateToSelected(false)}>{t("Hiện đường đi")}</button><button className="button primary" onClick={() => navigateToSelected(true)}>{t("Tự đi đến đây")}</button></div>
        <p className="profile-disclaimer">{t("Đường tính theo kích thước xe, giữ xe thẳng khi qua cửa. Tự đi mở cửa khi đủ khoảng trống và chờ nếu gặp vật cản. Không phải chứng nhận lối đi thực tế.")}</p>
      </Dialog>}
      {activeObject?.connection ? <FloorConnection key={activeObject.id} object={activeObject} profile={session.mobility} lift={sim.view.elevator} inCabin={insideCabin(sim.view.pose,session.mobility)} onCall={sim.callElevator} onClose={closeInspector} onReport={report} onLift={()=>{setInspected(null);setDestination(`lift-${sim.floor}`);sim.navigate(`lift-${sim.floor}`,true);focusGame();}} onTravel={()=>{const error=sim.changeFloor(activeObject.id);if(!error){savePose({...sim.pose.current,y:floorY(sim.floor)});setInspected(null);setChosen(null);requestAnimationFrame(()=>{focusGame();display.lock();});}return error;}} /> : activeObject?.kind === 'colleague' ? <ColleagueInspector key={activeObject.id} person={activeObject} onClose={closeInspector} /> : activeObject && (
        <ObjectInspector
          key={activeObject.id}
          object={activeObject}
          profile={session.mobility}
          open={session.openDoors.includes(activeObject.id)}
          onClose={closeInspector}
          onToggle={toggleDoor}
          onReport={report}
        />
      )}
    </div>
  );
}
