import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  Compass,
  HelpCircle,
  Leaf,
  Map,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useDemoStore } from "../store/useDemoStore";
import { formatDate } from "../lib/taskRules";
import { locationById } from "../data/office";
import Simulator from "../features/simulator/Simulator";
import Welcome from "../features/onboarding/Welcome";
import IssueForm, { type IssueContext } from "../features/issues/IssueForm";
import Summary from "../features/issues/Summary";
import Tasks from "../features/tasks/Tasks";
import Dialog from "../components/Dialog";

type Page = "journey" | "summary" | "tasks";
export default function App() {
  const { session, notice, reset, setReducedMotion, selectStep } =
    useDemoStore();
  const [page, setPage] = useState<Page>("journey");
  const [role, setRole] = useState<"employee" | "hr">("employee");
  const [welcome, setWelcome] = useState(!session.started);
  const [issueContext, setIssueContext] = useState<IssueContext | null>(null);
  const [settings, setSettings] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [help, setHelp] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const notify = useCallback((text: string) => setToast(text), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(
      session.reducedMotion,
    );
  }, [session.reducedMotion]);
  const goTo = (next: Page) => {
    setPage(next);
    setTarget(null);
  };
  const pending = session.tasks.filter((t) => t.status !== "done").length;
  const exportReport = () => {
    const data = {
      office: "Day Zero Office — dữ liệu mô phỏng",
      exportedAt: new Date().toISOString(),
      ...session,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `day-zero-${session.startDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Đã xuất báo cáo JSON.");
  };
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Đến nội dung chính
      </a>
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            goTo("journey");
          }}
          aria-label="Day Zero — Trang hành trình"
        >
          <span className="brand-mark">
            d<span />
          </span>
          <span>
            day zero<span className="brand-period">.</span>
            <small>YOUR FIRST DAY, REIMAGINED</small>
          </span>
        </a>
        <div className="workspace-card">
          <span className="workspace-icon">
            <Building2 size={20} />
          </span>
          <div>
            <strong>Day Zero Office</strong>
            <span>Không gian trải nghiệm</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">KHÔNG GIAN CỦA BẠN</span>
        <nav aria-label="Điều hướng chính">
          <button
            className={page === "journey" ? "active" : ""}
            onClick={() => goTo("journey")}
          >
            <Compass size={19} />
            <span>Hành trình ngày đầu</span>
            <span className="nav-active-dot" />
          </button>
          <button
            className={page === "summary" ? "active" : ""}
            onClick={() => goTo("summary")}
          >
            <ClipboardCheck size={19} />
            <span>Tổng kết trải nghiệm</span>
            {session.issues.length > 0 && (
              <span className="nav-count">{session.issues.length}</span>
            )}
          </button>
          <button
            className={page === "tasks" ? "active" : ""}
            onClick={() => goTo("tasks")}
          >
            <Users size={19} />
            <span>Nhiệm vụ chuẩn bị</span>
            {pending > 0 && <span className="nav-count">{pending}</span>}
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-card">
            <span className="leaf-art">
              <Leaf size={26} />
              <Sparkles size={15} />
            </span>
            <h3>
              Một ngày đầu
              <br />
              ít bỡ ngỡ hơn.
            </h3>
            <p>Một nơi làm việc tốt bắt đầu từ sự thấu hiểu.</p>
            <button onClick={() => setHelp(true)}>
              Tìm hiểu trải nghiệm <ArrowRight size={14} />
            </button>
          </div>
          <button className="sidebar-utility" onClick={() => setHelp(true)}>
            <HelpCircle size={18} />
            Hướng dẫn trải nghiệm
          </button>
          <button className="sidebar-utility" onClick={() => setSettings(true)}>
            <Settings2 size={18} />
            Tùy chọn & dữ liệu
          </button>
          <div className="sidebar-foot">
            <span className="live-dot" />
            Được thiết kế để ai cũng tham gia
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Không gian của bạn<span>/</span>
            <strong>
              {page === "journey"
                ? "Hành trình ngày đầu"
                : page === "summary"
                  ? "Tổng kết trải nghiệm"
                  : "Nhiệm vụ chuẩn bị"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-label">
              <span />
              DEMO
            </span>
            <label className="role-switch">
              <span className="sr-only">Vai trải nghiệm</span>
              <select
                aria-label="Vai trải nghiệm"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as typeof role);
                  if (e.target.value === "hr") goTo("tasks");
                }}
              >
                <option value="employee">Nhân viên</option>
                <option value="hr">HR & Facilities</option>
              </select>
            </label>
            <span className="topbar-divider" />
            <span className="profile-avatar">{role === "hr" ? "HR" : "A"}</span>
          </div>
        </header>
        <main id="main-content">
          <div className="welcome-bar">
            <div>
              <span className="sun-icon">✳</span>
              <span>
                Chào {role === "hr" ? "đội ngũ chuẩn bị" : "An"},{" "}
                {role === "hr"
                  ? "cùng tạo một khởi đầu tốt đẹp."
                  : "ngày đầu của bạn bắt đầu từ đây."}
              </span>
            </div>
            <span>
              Ngày bắt đầu <strong>{formatDate(session.startDate)}</strong>
            </span>
          </div>
          {notice && (
            <div className="storage-notice" role="alert">
              {notice}
            </div>
          )}
          {page === "journey" && (
            <Simulator
              key={`${session.id}-${target ?? 'default'}`}
              target={target}
              onIssue={setIssueContext}
              onSummary={() => goTo("summary")}
              onPreferences={() => setWelcome(true)}
              notify={notify}
            />
          )}
          {page === "summary" && (
            <Summary
              onEdit={(issue) =>
                setIssueContext({
                  locationId: issue.locationId,
                  stepId: issue.stepId,
                  issue,
                })
              }
              onTasks={() => goTo("tasks")}
              notify={notify}
            />
          )}
          {page === "tasks" && (
            <Tasks
              key={role}
              role={role}
              notify={notify}
              onLocation={(id) => {
                selectStep(locationById(id).step);
                setTarget(id);
                setPage("journey");
              }}
            />
          )}
        </main>
        <footer className="app-footer">
          <span>
            DAY ZERO <span>·</span> Một khởi đầu cho tất cả.
          </span>
          <span>Dữ liệu mô phỏng · Lưu trên trình duyệt này</span>
        </footer>
      </div>
      {welcome && <Welcome onClose={() => setWelcome(false)} />}
      {issueContext && (
        <IssueForm
          context={issueContext}
          onClose={() => setIssueContext(null)}
          onSaved={() => {
            setIssueContext(null);
            notify("Đã lưu ghi nhận. Xem và tạo nhiệm vụ ở Tổng kết.");
          }}
        />
      )}
      {settings && (
        <Dialog
          title="Theo nhịp của bạn"
          subtitle="Tùy chỉnh trải nghiệm và quản lý dữ liệu demo."
          onClose={() => setSettings(false)}
        >
          <div className="settings-content">
            <label className="setting-row">
              <div>
                <strong>Giảm chuyển động</strong>
                <span>Tắt hiệu ứng giao diện và làm mượt camera; nhân vật vẫn do bạn điều khiển.</span>
              </div>
              <input
                type="checkbox"
                checked={session.reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
              />
            </label>
            <button className="setting-row" onClick={exportReport}>
              <div>
                <strong>Xuất báo cáo</strong>
                <span>Tải tiến độ, ghi nhận và nhiệm vụ ở dạng JSON.</span>
              </div>
              <ArrowDownToLine size={20} />
            </button>
            <button
              className="setting-row danger"
              onClick={() => {
                setSettings(false);
                setResetConfirm(true);
              }}
            >
              <div>
                <strong>Đặt lại demo</strong>
                <span>Xóa phiên hiện tại và bắt đầu một hành trình mới.</span>
              </div>
              <RotateCcw size={20} />
            </button>
            <p className="muted small">
              Đây là bản demo cục bộ. Đổi vai giúp mô phỏng quy trình trong cùng
              trình duyệt; dữ liệu không được gửi đến HR thật hoặc đồng bộ sang
              máy khác.
            </p>
          </div>
        </Dialog>
      )}
      {resetConfirm && (
        <Dialog
          title="Bắt đầu lại hành trình?"
          subtitle="Tiến độ, ghi nhận và nhiệm vụ của phiên hiện tại sẽ bị xóa khỏi trình duyệt này."
          onClose={() => setResetConfirm(false)}
        >
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setResetConfirm(false)}
            >
              Giữ phiên hiện tại
            </button>
            <button
              className="button primary"
              onClick={() => {
                reset();
                setResetConfirm(false);
                setRole("employee");
                goTo("journey");
                setWelcome(true);
                notify("Đã đặt lại dữ liệu demo.");
              }}
            >
              Đặt lại demo
            </button>
          </div>
        </Dialog>
      )}
      {help && (
        <Dialog
          title="Khám phá hôm nay, sẵn sàng ngày mai."
          subtitle="Bạn không cần hoàn thành mọi thứ trong một lần."
          onClose={() => setHelp(false)}
        >
          <div className="help-steps">
            <div>
              <Map size={23} />
              <section>
                <h3>01 · Làm quen không gian</h3>
                <p>
                  Nhập kích thước xe lăn trong hồ sơ nhân vật. Bấm vào không gian và dùng WASD hoặc phím mũi tên để tự di chuyển. Q/E xoay tại chỗ, giữ Shift để đi chậm.
                </p>
              </section>
            </div>
            <div>
              <Compass size={23} />
              <section>
                <h3>02 · Thử và ghi nhận</h3>
                <p>
                  Đến gần đồ vật rồi nhấn F để xem hình minh họa, kích thước, cách dùng và lưu ý. Cửa cần mở bằng nút trong bảng tương tác. Xe có va chạm với khung cửa, bàn ghế và tường.
                </p>
              </section>
            </div>
            <div>
              <ShieldCheck size={23} />
              <section>
                <h3>03 · Cùng chuẩn bị</h3>
                <p>
                  Tạo nhiệm vụ từ Tổng kết. Chuyển vai HR & Facilities để chuẩn
                  bị phương án, rồi quay về Nhân viên để xác nhận.
                </p>
              </section>
            </div>
          </div>
          <div className="dialog-actions">
            <button className="button primary" onClick={() => setHelp(false)}>
              Tôi đã hiểu
              <Check size={16} />
            </button>
          </div>
        </Dialog>
      )}
      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            <Check size={17} />
            <span>{toast}</span>
            <button onClick={() => setToast("")} aria-label="Đóng thông báo">
              <X size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
