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
}: {
  onIssue: (context: IssueContext) => void;
  onSummary: () => void;
  onPreferences: () => void;
  notify: (s: string) => void;
  target: string | null;
}) {
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
  const [firstPerson, setFirstPerson] = useState(true),
    [reset, setReset] = useState(0),
    [full, setFull] = useState(false);
  const [catalog, setCatalog] = useState(false);
  const handleInteract = useCallback(
    (id: string) => {
      inspectObject(id);
      setInspected(id);
    },
    [inspectObject],
  );
  const sim = useSimulation(
    session.mobility,
    session.openDoors,
    stage,
    handleInteract,
    session.playerPose,
    mode === '3d' && firstPerson,
  );
  const nearestId = sim.view.nearby.includes(chosen ?? "")
    ? chosen
    : (sim.view.nearby[0] ?? null);
  const nearest = nearestId ? objectById(nearestId) : null;
  const activeObject = inspected ? objectById(inspected) : undefined;
  const objective = objectives[session.currentStep];
  const objectiveIds = target
    ? objects.filter((o) => o.locationId === target).map((o) => o.id)
    : objective.ids;
  const seen = objective.ids.filter((id) =>
    session.inspectedIds.includes(id),
  ).length;
  useEffect(() => {
    if (nearestId) sim.chooseNearby(nearestId);
  }, [nearestId, sim]);
  useEffect(() => {
    let last = { ...sim.pose.current };
    const timer = setInterval(() => {
      const current = sim.pose.current;
      if (
        Math.hypot(current.x - last.x, current.z - last.z) > 0.02 ||
        Math.abs(current.yaw - last.yaw) > 0.02
      ) {
        savePose(current);
        last = { ...current };
      }
    }, 900);
    const persist = () => savePose(sim.pose.current);
    window.addEventListener("pagehide", persist);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [savePose, sim.pose]);
  useEffect(() => {
    if (full) {
      const escape = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !document.querySelector("dialog[open]"))
          setFull(false);
      };
      window.addEventListener("keydown", escape);
      return () => window.removeEventListener("keydown", escape);
    }
  }, [full]);
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
      suggestion: `Cần xác minh điều kiện sử dụng ${o.name.toLocaleLowerCase("vi")} với xe của tôi.`,
    });
  };
  const choose = (id: string) => {
    if (sim.view.nearby.includes(id)) {
      setChosen(id);
      sim.chooseNearby(id);
      sim.triggerInteraction(id);
    } else
      notify(
        `Hãy tự di chuyển đến gần ${objectById(id)?.name ?? "đồ vật"} rồi nhấn F.`,
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
      return "Bạn cần ở gần cửa để thao tác.";
    if (
      !doorCanToggle(
        activeObject,
        session.openDoors,
        sim.pose.current,
        session.mobility,
      )
    )
      return "Xe đang nằm trong vùng quét của cánh cửa. Đóng bảng thông tin, lùi ra rồi thử lại.";
    setOpenDoors(
      session.openDoors.includes(activeObject.id)
        ? session.openDoors.filter((id) => id !== activeObject.id)
        : [...session.openDoors, activeObject.id],
    );
    return null;
  };
  const controls: { key: Control; label: string; icon: React.ReactNode }[] = [
    { key: "forward", label: mode === '3d' && firstPerson ? "Tiến về phía trước" : "Tiến lên màn hình", icon: <ArrowUp size={19} /> },
    {
      key: "left",
      label: "Di chuyển sang trái",
      icon: <ArrowLeft size={19} />,
    },
    {
      key: "backward",
      label: mode === '3d' && firstPerson ? "Lùi lại" : "Lùi xuống màn hình",
      icon: <ArrowDown size={19} />,
    },
    {
      key: "right",
      label: "Di chuyển sang phải",
      icon: <ArrowRight size={19} />,
    },
    {
      key: "turnLeft",
      label: "Xoay trái tại chỗ",
      icon: <RotateCcw size={16} />,
    },
    {
      key: "turnRight",
      label: "Xoay phải tại chỗ",
      icon: <RotateCw size={16} />,
    },
  ];
  return (
    <div className="play-page">
      <div className="play-heading">
        <div>
          <span className="eyebrow">
            <span className="live-dot" /> DAY ZERO · WORKPLACE SIMULATOR
          </span>
          <h1>
            Không gian mới. <span>Nhịp đi của bạn.</span>
          </h1>
          <p>
            Tự mình khám phá, chạm tới những điều quen thuộc trước ngày đầu.
          </p>
        </div>
        <button className="button secondary" onClick={onPreferences}>
          <Accessibility size={17} />
          {session.mobility.mode === "wheelchair"
            ? `Xe của bạn · ${session.mobility.widthCm} × ${session.mobility.lengthCm} cm`
            : "Nhân vật đi bộ"}
          <Settings2 size={15} />
        </button>
      </div>
      <div className="play-layout">
        <section className={`world-card ${full ? "world-expanded" : ""}`}>
          <header className="world-topbar">
            <div>
              <span className="world-status" />
              <strong>Day Zero Office</strong>
              <span className="world-divider">/</span>
              <span>Khám phá tự do</span>
            </div>
            <div className="world-tools">
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
                aria-label={firstPerson ? "Xem toàn văn phòng" : "Góc nhìn thứ nhất"}
                title={firstPerson ? "Xem toàn văn phòng" : "Góc nhìn thứ nhất"}
                disabled={mode !== '3d'}
                onClick={() => setFirstPerson((v) => !v)}
                aria-pressed={firstPerson}
              >
                <Crosshair size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Đặt lại góc nhìn"
                onClick={() => setReset((v) => v + 1)}
              >
                <RotateCcw size={16} />
              </button>
              <button
                className="icon-button"
                aria-label={full ? "Thu gọn bản đồ" : "Mở rộng bản đồ"}
                onClick={() => setFull((v) => !v)}
              >
                {full ? <X size={18} /> : <Maximize size={17} />}
              </button>
            </div>
          </header>
          <div
            className="world-stage"
            ref={stage}
            tabIndex={0}
            role="region"
            aria-label="Điều khiển nhân vật bằng WASD. F tương tác. Q E xoay tại chỗ."
            data-testid="game-stage"
            data-x={sim.view.pose.x.toFixed(3)}
            data-z={sim.view.pose.z.toFixed(3)}
            data-yaw={sim.view.pose.yaw.toFixed(3)}
            data-camera={mode === '2d' ? 'map' : firstPerson ? 'first-person' : 'overview'}
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
                    <p>Đang mở văn phòng của bạn…</p>
                  </div>
                }
              >
                <OfficeScene
                  profile={session.mobility}
                  pose={sim.pose}
                  cameraYaw={sim.cameraYaw}
                  openDoors={session.openDoors}
                  nearest={nearestId}
                  destinationIds={objectiveIds}
                  inspected={session.inspectedIds}
                  firstPerson={firstPerson}
                  lookPitch={sim.lookPitch}
                  reset={reset}
                  reducedMotion={session.reducedMotion}
                  onUnavailable={unavailable}
                  onSelect={choose}
                />
              </Suspense>
            ) : (
              <Map2D
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
              <span>
                TỶ LỆ THỐNG NHẤT<strong>1 ô lưới = 1 m</strong>
              </span>
            </div>
            <div className="world-discovered">
              <BookOpen size={15} />
              {session.inspectedIds.length}/{objects.length}
              <span> đồ vật đã tìm hiểu</span>
            </div>
            {mode === '3d' && firstPerson && <div className="first-person-hint">Góc nhìn thứ nhất · Kéo chuột / vuốt để nhìn · Q/E xoay xe</div>}
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
              <span>WASD / Mũi tên</span>
            </div>
            <div className="interaction-hud" aria-live="polite">
              {nearest ? (
                <>
                  <span className="proximity-label">
                    TRONG TẦM TƯƠNG TÁC ·{" "}
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
                      <strong>{nearest.name}</strong>
                      <small>Xem cách dùng, lưu ý & kích thước</small>
                    </span>
                    <ChevronRight size={20} />
                  </button>
                  {sim.view.nearby.length > 1 && (
                    <select
                      aria-label="Chọn đồ vật ở gần"
                      value={nearestId ?? ""}
                      onChange={(e) => {
                        setChosen(e.target.value);
                        sim.chooseNearby(e.target.value);
                        focusGame();
                      }}
                    >
                      {sim.view.nearby.map((id) => (
                        <option key={id} value={id}>
                          {objectById(id)!.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              ) : (
                <div className="no-nearby">
                  <Gamepad2 size={19} />
                  <span>
                    Di chuyển đến gần đồ vật để tương tác
                    <small>Bấm vào không gian, rồi dùng WASD.</small>
                  </span>
                </div>
              )}
            </div>
            {sim.view.blocked && (
              <div className="collision-hint" role="status">
                <span>!</span>Đang chạm: {sim.view.blocked}. Lùi hoặc đổi hướng
                để tiếp tục.
              </div>
            )}
          </div>
          {failed && (
            <p className="fallback-note">
              Thiết bị chưa hiển thị được 3D. Chế độ 2D giữ nguyên kích thước,
              va chạm và điều khiển WASD.
            </p>
          )}
          <footer className="world-bottom">
            <span>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> {mode === '3d' && firstPerson ? 'Di chuyển theo hướng nhìn' : 'Di chuyển theo màn hình'}
            </span>
            <span>
              <kbd>F</kbd> Tương tác
            </span>
            <span>
              <kbd>Q</kbd>
              <kbd>E</kbd> Xoay xe
            </span>
            <span>
              <kbd>Shift</kbd> Đi chậm
            </span>
            <button
              onClick={() => {
                sim.returnToEntry();
                focusGame();
                notify("Đã trở về điểm bắt đầu.");
              }}
            >
              <RotateCcw size={13} />
              Về lối vào
            </button>
          </footer>
        </section>
        <aside className="explore-sidebar">
          <section className="current-mission">
            <span className="eyebrow">
              LÀM QUEN NGÀY ĐẦU · {journey[session.currentStep].time}
            </span>
            <h2>{objective.label}</h2>
            <p>{objective.hint}</p>
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
                  {objectById(id)?.name}
                </span>
              ))}
            </div>
            <button
              className="button primary"
              disabled={
                seen !== objective.ids.length ||
                (session.currentStep === 6 && sim.view.pose.z < 7.6)
              }
              onClick={() => {
                setStepStatus("completed");
                if (session.currentStep < 6)
                  selectStep(session.currentStep + 1);
                else onSummary();
              }}
            >
              Hoàn thành chặng
              <ArrowRight size={15} />
            </button>
            <small>
              Chọn chặng chỉ đổi mục tiêu. Bạn tự điều khiển đến đó.
            </small>
          </section>
          <section className="play-journey">
            <div className="section-heading">
              <h3>Lịch trình của bạn</h3>
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
                  <strong>{step.title}</strong>
                </span>
                {session.currentStep === i && <ChevronRight size={14} />}
              </button>
            ))}
          </section>
          <button
            className="catalog-toggle"
            onClick={() => setCatalog((v) => !v)}
          >
            <BookOpen size={16} />
            Danh mục đồ vật<span>{objects.length}</span>
          </button>
          {catalog && (
            <div className="object-catalog">
              {objects.map((o) => (
                <button key={o.id} onClick={() => choose(o.id)}>
                  <span>{o.name}</span>
                  <small>
                    {session.inspectedIds.includes(o.id)
                      ? "Đã tìm hiểu"
                      : `${objectDistance(sim.view.pose, o, session.openDoors).toFixed(1)} m`}
                  </small>
                </button>
              ))}
            </div>
          )}
          <button className="button secondary" onClick={onSummary}>
            <Flag size={15} />
            Ghi nhận & nhiệm vụ ({session.issues.length})
          </button>
          <p className="world-note">
            Va chạm theo dấu chiếm chỗ của xe. Đến gần trong khoảng{" "}
            {WORLD.interactionRange.toFixed(2)} m để nhấn F. Mô hình chưa mô
            phỏng lực, tầm với hoặc chuyển người.
          </p>
        </aside>
      </div>
      {activeObject && (
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
