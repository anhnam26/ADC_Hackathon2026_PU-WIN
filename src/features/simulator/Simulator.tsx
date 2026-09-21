import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flag,
  Footprints,
  Layers3,
  MapPin,
  Maximize,
  MousePointer2,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  VolumeX,
} from "lucide-react";
import { journey } from "../../data/journey";
import { locationById, locations } from "../../data/office";
import { useDemoStore } from "../../store/useDemoStore";
import type { IssueContext } from "../issues/IssueForm";
import Map2D from "./Map2D";

const OfficeScene = lazy(() => import("./OfficeScene"));
function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    const context = c.getContext("webgl2");
    const supported = !!context;
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return supported;
  } catch {
    return false;
  }
}
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
  const { session, selectStep, setStepStatus, setAnswer } = useDemoStore();
  const step = journey[session.currentStep];
  const [selected, setSelected] = useState(target ?? step.locationId);
  const [mode, setMode] = useState<"3d" | "2d">(() =>
    supportsWebGL() ? "3d" : "2d",
  );
  const [unavailable, setUnavailable] = useState(() => mode === "2d");
  const [destination, setDestination] = useState<string | null>(null);
  const [trip, setTrip] = useState(0);
  const [moving, setMoving] = useState(false);
  const [cameraReset, setCameraReset] = useState(0);
  const [stepFree, setStepFree] = useState(
    session.selectedNeeds.includes("entrance"),
  );
  const [fullMap, setFullMap] = useState(false);
  const location = locationById(selected);
  const completed = session.stepStatuses.filter(
    (s) => s === "completed",
  ).length;
  const issueLocations = session.issues.map((i) => i.locationId);
  const lastStep = useRef(step.id);
  useEffect(() => {
    if (lastStep.current !== step.id) {
      setSelected(step.locationId);
      setDestination(null);
      setMoving(false);
      lastStep.current = step.id;
    }
  }, [step.id, step.locationId]);
  useEffect(() => {
    setDestination(null);
    setMoving(false);
  }, [stepFree]);
  useEffect(() => {
    if (!fullMap) return;
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullMap(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [fullMap]);
  const onArrival = useCallback(() => setMoving(false), []);
  const onUnavailable = useCallback(() => {
    setUnavailable(true);
    setMode("2d");
    setMoving(false);
  }, []);
  const choose = (id: string) => {
    setSelected(id);
    setDestination(null);
    setMoving(false);
  };
  const visit = () => {
    setTrip((t) => t + 1);
    setDestination(selected);
    setMoving(mode === "3d" && !session.reducedMotion);
    if (mode === "2d") notify(`Đã đến ${location.name}.`);
  };
  const changeStep = (id: number) => {
    selectStep(id);
    setSelected(journey[id].locationId);
    setDestination(null);
    setMoving(false);
  };
  const record = (
    checklist?: (typeof step.checklist)[number],
    kind: "verification" | "barrier" = "verification",
  ) => {
    const mapped =
      checklist?.category === "restroom"
        ? "restroom"
        : checklist?.id === "gate-width"
          ? "gate"
          : checklist?.id === "arrival-route"
            ? "side-entry"
            : selected;
    const previous =
      checklist &&
      session.issues.find(
        (i) => i.checklistId === checklist.id && i.state === "draft",
      );
    onIssue({
      locationId: previous?.locationId ?? mapped,
      stepId: step.id,
      category: checklist?.category ?? location.category,
      checklistId: checklist?.id,
      suggestion: checklist?.suggestion,
      kind,
      issue: previous,
    });
  };
  return (
    <div className="simulator-page">
      <div className="sim-intro">
        <div>
          <span className="eyebrow">
            <span className="live-dot" /> HÀNH TRÌNH CỦA AN
          </span>
          <h1>
            Làm quen hôm nay.
            <br className="mobile-break" /> Tự tin ngày đầu.
          </h1>
          <p>Một vòng văn phòng, từng bước theo nhịp của bạn.</p>
        </div>
        <button
          className="button secondary preferences-button"
          onClick={onPreferences}
        >
          <SlidersHorizontal size={17} />
          Điều kiện của bạn
          {session.selectedNeeds.length > 0 && (
            <span className="mini-count">{session.selectedNeeds.length}</span>
          )}
        </button>
      </div>
      <div className="simulation-layout">
        <section className="journey-panel" aria-label="Lịch trình ngày đầu">
          <div className="journey-heading">
            <span className="eyebrow">NGÀY ĐẦU TIÊN</span>
            <h2>Hành trình của bạn</h2>
            <p>
              <Clock3 size={13} /> 08:30 — 17:00 <span>·</span> 7 chặng
            </p>
          </div>
          <ol className="timeline">
            {journey.map((s, i) => (
              <li
                key={s.id}
                className={`${session.currentStep === i ? "current" : ""} ${session.stepStatuses[i] === "completed" ? "completed" : ""}`}
              >
                <button
                  onClick={() => changeStep(i)}
                  aria-current={session.currentStep === i ? "step" : undefined}
                >
                  <span className="step-marker">
                    {session.stepStatuses[i] === "completed" ? (
                      <Check size={14} />
                    ) : session.stepStatuses[i] === "skipped" ? (
                      "–"
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <span className="timeline-copy">
                    <time>{s.time}</time>
                    <strong>{s.title}</strong>
                    {session.currentStep === i && (
                      <small>
                        Đang khám phá <span>→</span>
                      </small>
                    )}
                    {session.stepStatuses[i] === "skipped" && (
                      <small>Đã bỏ qua</small>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="journey-progress">
            <div>
              <span>Đã trải nghiệm</span>
              <strong>{completed}/7</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${(completed / 7) * 100}%` }} />
            </div>
            <p>Đi một chút, hiểu thêm một chút.</p>
          </div>
          <div className="journey-note">
            <Sparkles size={20} />
            <p>
              Không cần vội.
              <br />
              <strong>Bạn có thể quay lại mọi lúc.</strong>
            </p>
          </div>
        </section>
        <section
          className={`map-card ${fullMap ? "expanded" : ""}`}
          aria-label="Khám phá văn phòng"
        >
          <div className="map-toolbar">
            <div className="floor-label">
              <span className="floor-icon">
                <Layers3 size={18} />
              </span>
              <div>
                <strong>
                  {location.floor === "office"
                    ? "Tầng 2 · Không gian làm việc"
                    : "Tầng trệt · Chào đón bạn"}
                </strong>
                <span>Day Zero Office</span>
              </div>
            </div>
            <div className="segmented">
              <button
                aria-pressed={mode === "3d"}
                disabled={unavailable}
                onClick={() => setMode("3d")}
              >
                3D
              </button>
              <button
                aria-pressed={mode === "2d"}
                onClick={() => {
                  setMode("2d");
                  setMoving(false);
                }}
              >
                2D
              </button>
            </div>
          </div>
          <div className="map-scene">
            <div className="scene-kicker">
              <span className="live-dot" /> KHÁM PHÁ TỰ DO
            </div>
            <div className="scene-controls">
              <button
                className="icon-button"
                aria-label="Đặt lại góc nhìn"
                onClick={() => setCameraReset((n) => n + 1)}
                disabled={mode === "2d"}
              >
                <RotateCcw size={16} />
              </button>
              <button
                className="icon-button"
                aria-label={fullMap ? "Thu gọn bản đồ" : "Mở rộng bản đồ"}
                onClick={() => setFullMap((v) => !v)}
              >
                <Maximize size={16} />
              </button>
            </div>
            {mode === "3d" ? (
              <Suspense
                fallback={
                  <div className="scene-loading">
                    <span className="loader" />
                    <p>Đang mở cánh cửa văn phòng…</p>
                  </div>
                }
              >
                <OfficeScene
                  floor={location.floor}
                  selected={selected}
                  onSelect={choose}
                  issueLocations={issueLocations}
                  destination={destination}
                  trip={trip}
                  stepFree={stepFree}
                  reducedMotion={session.reducedMotion}
                  cameraReset={cameraReset}
                  onArrival={onArrival}
                  onUnavailable={onUnavailable}
                />
              </Suspense>
            ) : (
              <Map2D
                floor={location.floor}
                selected={selected}
                onSelect={choose}
                stepFree={stepFree}
                destination={destination}
              />
            )}
            <div className="map-compass">
              <span>N</span>
              <span className="compass-arrow">↑</span>
            </div>
            <span className="map-scale">Mặt bằng mô phỏng</span>
          </div>
          {unavailable && (
            <p className="fallback-note" role="status">
              3D chưa khả dụng trên thiết bị này. Bạn vẫn có thể trải nghiệm đầy
              đủ bằng bản đồ 2D.
            </p>
          )}
          <div className="map-legend">
            <span>
              <i className="legend-dot selected" />
              Địa điểm đang xem
            </span>
            <span>
              <i className="legend-dot issue" />
              Có ghi nhận
            </span>
            <span className="drag-hint">
              <MousePointer2 size={13} />
              Kéo để xoay · Cuộn để phóng to
            </span>
          </div>
          <div className="location-picker">
            <label htmlFor="location-select">
              <MapPin size={15} />
              Khám phá địa điểm
            </label>
            <select
              id="location-select"
              value={selected}
              onChange={(e) => choose(e.target.value)}
            >
              {locations
                .filter((l) => l.floor === location.floor)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {issueLocations.includes(l.id) ? " · Có ghi nhận" : ""}
                  </option>
                ))}
            </select>
            <button className="button primary compact" onClick={visit}>
              <Play size={14} fill="currentColor" />
              {moving ? "Đi lại tuyến này" : "Đến địa điểm"}
            </button>
          </div>
          <label className="route-toggle">
            <input
              type="checkbox"
              checked={stepFree}
              onChange={(e) => setStepFree(e.target.checked)}
            />
            <Footprints size={15} />
            <span>
              Ưu tiên tuyến không có bậc thang{" "}
              <small>· Chưa xác minh thực tế</small>
            </span>
          </label>
        </section>
        <aside className="activity-panel">
          <div className="activity-heading">
            <span className="badge subtle">
              CHẶNG {String(step.id + 1).padStart(2, "0")} / 07
            </span>
            <span className="activity-time">
              <Clock3 size={13} />
              {step.time}
            </span>
          </div>
          <div className="activity-title">
            <h2>{step.title}</h2>
            <p>{step.subtitle}</p>
          </div>
          <div className="location-detail">
            <span className="detail-icon">
              <MapPin size={20} />
            </span>
            <div>
              <h3>{location.name}</h3>
              <p>{location.description}</p>
            </div>
          </div>
          <div className="instructions">
            <h3>Thử một chút nhé</h3>
            {step.instructions.map((text, i) => (
              <p key={text}>
                <span>{i + 1}</span>
                {text}
              </p>
            ))}
          </div>
          <div className="checklist">
            <div className="section-heading">
              <h3>Điều bạn muốn kiểm tra</h3>
              <CircleHelp size={15} />
            </div>
            <p className="muted small">
              Ghi lại điều bạn cần làm rõ trước ngày đầu.
            </p>
            {step.checklist.map((c) => {
              const value = session.answers[c.id];
              const suggested = session.selectedNeeds.includes(c.category);
              return (
                <div
                  key={c.id}
                  className={`check-item ${suggested ? "suggested" : ""}`}
                >
                  <div>
                    <span>{c.label}</span>
                    {suggested && (
                      <span className="suggested-label">Dành cho bạn</span>
                    )}
                  </div>
                  <select
                    aria-label={c.label}
                    value={value ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "looks_suitable")
                        setAnswer(c.id, "looks_suitable");
                      else if (e.target.value)
                        record(
                          c,
                          e.target.value === "barrier"
                            ? "barrier"
                            : "verification",
                        );
                    }}
                  >
                    <option value="">Chưa xem xét</option>
                    <option value="looks_suitable">Có vẻ phù hợp</option>
                    <option value="needs_verification">Cần xác minh</option>
                    <option value="barrier">Có thể có rào cản</option>
                  </select>
                </div>
              );
            })}
          </div>
          <div className="unknown-fact">
            <CircleHelp size={16} />
            <span>{location.fact}</span>
          </div>
          <button className="button report-button" onClick={() => record()}>
            <Flag size={16} />
            Ghi nhận một vấn đề
          </button>
          <div className="support-contact">
            <span className="contact-avatar">
              {location.contact.startsWith("Linh") ? "L" : "D"}
            </span>
            <div>
              <small>Người có thể hỗ trợ</small>
              <strong>{location.contact}</strong>
              <span>Liên hệ mẫu trong demo</span>
            </div>
          </div>
        </aside>
      </div>
      <div className="journey-footer">
        <div>
          <span className="footer-leaf">
            <CheckCircle2 size={20} />
          </span>
          <p>
            <strong>Mỗi điều được làm rõ, một nỗi lo được bớt đi.</strong>
            <span>
              Hoàn thành chặng nghĩa là bạn đã trải nghiệm, không xác nhận điều
              kiện thực tế.
            </span>
          </p>
        </div>
        <div className="footer-actions">
          <button
            className="icon-button"
            disabled={step.id === 0}
            aria-label="Chặng trước"
            onClick={() => changeStep(step.id - 1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            className="text-button skip-button"
            onClick={() => {
              setStepStatus("skipped");
              step.id < 6 ? changeStep(step.id + 1) : onSummary();
            }}
          >
            Bỏ qua
          </button>
          <button
            className="button primary"
            onClick={() => {
              setStepStatus("completed");
              if (step.id < 6) changeStep(step.id + 1);
              else onSummary();
            }}
          >
            {step.id === 6 ? "Hoàn thành & tổng kết" : "Hoàn thành chặng"}
            {step.id === 6 ? <Check size={16} /> : <ChevronRight size={17} />}
          </button>
        </div>
      </div>
      <div className="bottom-hint">
        <VolumeX size={13} />
        <span>Không tự phát âm thanh · Trải nghiệm theo nhịp của bạn</span>
        <span>VĂN PHÒNG MẪU · PHIÊN BẢN 01</span>
      </div>
    </div>
  );
}
