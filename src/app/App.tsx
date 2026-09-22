import { useLocale } from '../lib/i18n';
import { useCallback, useEffect, useState } from "react";
import { flushSync } from 'react-dom';
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
import {useAccount} from '../features/auth/AccountContext';

type Page = "journey" | "summary" | "tasks";
export default function App() {
  const {user,logout,openAdmin}=useAccount();
  const { t, language } = useLocale();
  const { session, notice, reset, setReducedMotion, selectStep } =
    useDemoStore();
  const [page, setPage] = useState<Page>("journey");
  const [role, setRole] = useState<"employee" | "hr">("employee");
  const [welcome, setWelcome] = useState(true);
  const [entered, setEntered] = useState(false);
  const [issueContext, setIssueContext] = useState<IssueContext | null>(null);
  const [settings, setSettings] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [help, setHelp] = useState(false);
  const [gameMenu, setGameMenu] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const notify = useCallback((text: string) => setToast(text), []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
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
      office: t("Day Zero Office — dữ liệu mô phỏng"),
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
    notify(t("Đã xuất báo cáo JSON."));
  };
  return (
    <div className={`app-shell ${page === 'journey' ? 'game-shell' : ''}`}>
      <a href="#main-content" className="skip-link">{t("Đến nội dung chính")}</a>
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            goTo("journey");
          }}
          aria-label={t("Day Zero — Trang hành trình")}
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
            <span>{t("Không gian trải nghiệm")}</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">{t("KHÔNG GIAN CỦA BẠN")}</span>
        <nav aria-label={t("Điều hướng chính")}>
          <button
            className={page === "journey" ? "active" : ""}
            onClick={() => goTo("journey")}
          >
            <Compass size={19} />
            <span>{t("Hành trình ngày đầu")}</span>
            <span className="nav-active-dot" />
          </button>
          <button
            className={page === "summary" ? "active" : ""}
            onClick={() => goTo("summary")}
          >
            <ClipboardCheck size={19} />
            <span>{t("Tổng kết trải nghiệm")}</span>
            {session.issues.length > 0 && (
              <span className="nav-count">{session.issues.length}</span>
            )}
          </button>
          <button
            className={page === "tasks" ? "active" : ""}
            onClick={() => goTo("tasks")}
          >
            <Users size={19} />
            <span>{t("Nhiệm vụ chuẩn bị")}</span>
            {pending > 0 && <span className="nav-count">{pending}</span>}
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-card">
            <span className="leaf-art">
              <Leaf size={26} />
              <Sparkles size={15} />
            </span>
            <h3>{t("Một ngày đầu")}<br />{t("ít bỡ ngỡ hơn.")}</h3>
            <p>{t("Một nơi làm việc tốt bắt đầu từ sự thấu hiểu.")}</p>
            <button onClick={() => setHelp(true)}>{t("Tìm hiểu trải nghiệm")}<ArrowRight size={14} />
            </button>
          </div>
          <button className="sidebar-utility" onClick={() => setHelp(true)}>
            <HelpCircle size={18} />{t("Hướng dẫn trải nghiệm")}</button>
          <button className="sidebar-utility" onClick={() => setSettings(true)}>
            <Settings2 size={18} />{t("Tùy chọn & dữ liệu")}</button>
          <div className="sidebar-foot">
            <span className="live-dot" />{t("Được thiết kế để ai cũng tham gia")}</div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">{t("Không gian của bạn")}<span>/</span>
            <strong>
              {page === "journey"
                ? t("Hành trình ngày đầu")
                : page === "summary"
                  ? t("Tổng kết trải nghiệm")
                  : t("Nhiệm vụ chuẩn bị")}
            </strong>
          </div>
          <div className="topbar-actions">
            <div className="account-actions"><span>{user.name}</span>{user.role==='manager'&&<button className="button secondary" onClick={openAdmin}>{language==='vi'?'Trang quản trị':'Admin dashboard'}</button>}<button className="button secondary" onClick={logout}>{language==='vi'?'Đăng xuất':'Sign out'}</button></div>
            <span className="demo-label">
              <span />
              DEMO
            </span>
            <label className="role-switch">
              <span className="sr-only">{t("Vai trải nghiệm")}</span>
              <select
                aria-label={t("Vai trải nghiệm")}
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as typeof role);
                  if (e.target.value === "hr") goTo("tasks");
                }}
              >
                <option value="employee">{t("Nhân viên")}</option>
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
              <span className="sun-icon">{t("✳")}</span>
              <span>{t("Chào")} {role === "hr" ? t("đội ngũ chuẩn bị") : user.name},{" "}
                {role === "hr"
                  ? t("cùng tạo một khởi đầu tốt đẹp.")
                  : t("ngày đầu của bạn bắt đầu từ đây.")}
              </span>
            </div>
            <span>{t("Ngày bắt đầu")}<strong>{formatDate(session.startDate)}</strong>
            </span>
          </div>
          {notice && (
            <div className="storage-notice" role="alert">
              {notice}
            </div>
          )}
          {page === "journey" && !entered && <div className="game-launch">
            <span className="eyebrow">YOUR FIRST DAY, REIMAGINED</span><h1>DAY ZERO<span>{t("Hành trình của bạn bắt đầu ở đây.")}</span></h1>
            <p>{t("Thiết lập xe của bạn. Gặp đồng nghiệp mới. Làm quen văn phòng theo nhịp riêng.")}</p>
            <button className="button primary" onClick={() => setWelcome(true)}>{t("Thiết lập nhân vật")}</button>
          </div>}
          {page === "journey" && session.started && entered && (
            <Simulator
              key={`${session.id}-${target ?? 'default'}`}
              target={target}
              onIssue={setIssueContext}
              onSummary={() => goTo("summary")}
              onPreferences={() => setWelcome(true)}
              notify={notify}
              onMenu={() => setGameMenu(true)}
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
            DAY ZERO <span>{t("·")}</span>{t("Một khởi đầu cho tất cả.")}</span>
          <span>{t("Dữ liệu mô phỏng · Lưu trên trình duyệt này")}</span>
        </footer>
      </div>
      {welcome && <Welcome entering={!entered} onConfirm={() => {
        flushSync(() => { setEntered(true); setWelcome(false); });
        const stage = document.querySelector<HTMLElement>('[data-testid="game-stage"]');
        stage?.focus({ preventScroll: true });
        if (stage?.dataset.camera !== 'map' && matchMedia('(pointer: fine)').matches) {
          try { stage?.requestPointerLock?.()?.catch(() => notify(t("Nhấn Enter trong map để bật điều khiển chuột."))); } catch { notify(t("Trình duyệt chưa hỗ trợ khóa chuột.")); }
        }
      }} onClose={() => setWelcome(false)} />}
      {gameMenu && <Dialog title={t("Tạm dừng")} subtitle={t("DAY ZERO · Không gian của bạn, nhịp đi của bạn.")} onClose={() => setGameMenu(false)}>
        <div className="game-menu-actions">
          <p>{user.name} · {user.email}</p>
          {user.role==='manager'&&<button className="button secondary" onClick={openAdmin}>{language==='vi'?'Trang quản trị':'Admin dashboard'}</button>}
          <button className="button secondary" onClick={logout}>{language==='vi'?'Đăng xuất':'Sign out'}</button>
          <button className="button primary" onClick={() => setGameMenu(false)}>{t("Trở lại trò chơi")}</button>
          <button className="button secondary" onClick={() => { setGameMenu(false); goTo('summary'); }}>{t("Tổng kết trải nghiệm")}</button>
          <button className="button secondary" onClick={() => { setGameMenu(false); goTo('tasks'); }}>{t("Nhiệm vụ chuẩn bị")}</button>
          <button className="button secondary" onClick={() => { setGameMenu(false); setWelcome(true); }}>{t("Nhân vật & kích thước xe")}</button>
          <button className="button secondary" onClick={() => { setGameMenu(false); setSettings(true); }}>{t("Tùy chọn & dữ liệu")}</button>
          <button className="button secondary" onClick={() => { setGameMenu(false); setHelp(true); }}>{t("Hướng dẫn trải nghiệm")}</button>
        </div>
      </Dialog>}
      {issueContext && (
        <IssueForm
          context={issueContext}
          onClose={() => setIssueContext(null)}
          onSaved={() => {
            setIssueContext(null);
            notify(t("Đã lưu ghi nhận. Xem và tạo nhiệm vụ ở Tổng kết."));
          }}
        />
      )}
      {settings && (
        <Dialog
          title={t("Theo nhịp của bạn")}
          subtitle={t("Tùy chỉnh trải nghiệm và quản lý dữ liệu demo.")}
          onClose={() => setSettings(false)}
        >
          <div className="settings-content">
            <label className="setting-row">
              <div>
                <strong>{t("Giảm chuyển động")}</strong>
                <span>{t("Tắt hiệu ứng giao diện và làm mượt camera; nhân vật vẫn do bạn điều khiển.")}</span>
              </div>
              <input
                type="checkbox"
                checked={session.reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
              />
            </label>
            <button className="setting-row" onClick={exportReport}>
              <div>
                <strong>{t("Xuất báo cáo")}</strong>
                <span>{t("Tải tiến độ, ghi nhận và nhiệm vụ ở dạng JSON.")}</span>
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
                <strong>{t("Đặt lại demo")}</strong>
                <span>{t("Xóa phiên hiện tại và bắt đầu một hành trình mới.")}</span>
              </div>
              <RotateCcw size={20} />
            </button>
            <p className="muted small">{t("Đây là bản demo cục bộ. Đổi vai giúp mô phỏng quy trình trong cùng trình duyệt; dữ liệu không được gửi đến HR thật hoặc đồng bộ sang máy khác.")}</p>
          </div>
        </Dialog>
      )}
      {resetConfirm && (
        <Dialog
          title={t("Bắt đầu lại hành trình?")}
          subtitle={t("Tiến độ, ghi nhận và nhiệm vụ của phiên hiện tại sẽ bị xóa khỏi trình duyệt này.")}
          onClose={() => setResetConfirm(false)}
        >
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setResetConfirm(false)}
            >{t("Giữ phiên hiện tại")}</button>
            <button
              className="button primary"
              onClick={() => {
                reset();
                setEntered(false);
                setResetConfirm(false);
                setRole("employee");
                goTo("journey");
                setWelcome(true);
                notify(t("Đã đặt lại dữ liệu demo."));
              }}
            >{t("Đặt lại demo")}</button>
          </div>
        </Dialog>
      )}
      {help && (
        <Dialog
          title={t("Khám phá hôm nay, sẵn sàng ngày mai.")}
          subtitle={t("Bạn không cần hoàn thành mọi thứ trong một lần.")}
          onClose={() => setHelp(false)}
        >
          <div className="help-steps">
            <div>
              <Map size={23} />
              <section>
                <h3>{t("01 · Làm quen không gian")}</h3>
                <p>{language==='vi'?'Nhập kích thước xe rồi vào map. WASD di chuyển, Shift đi chậm, V đổi góc nhìn, N chọn điểm đến, P dừng tự đi. B ghi chú bất kỳ vị trí nào; hướng dẫn hiển thị bằng phụ đề, không phát âm thanh.':'Set your wheelchair dimensions and enter. WASD moves, Shift slows down, V changes the view, N selects a destination and P stops auto-walk. B adds a note anywhere. Guidance is text-only.'}</p>
              </section>
            </div>
            <div>
              <Compass size={23} />
              <section>
                <h3>{t("02 · Thử và ghi nhận")}</h3>
                <p>{t("Đến gần đồ vật rồi nhấn F để xem hình minh họa, kích thước, cách dùng và lưu ý. Cửa cần mở bằng nút trong bảng tương tác. Xe có va chạm với khung cửa, bàn ghế và tường.")}</p>
              </section>
            </div>
            <div>
              <ShieldCheck size={23} />
              <section>
                <h3>{t("03 · Cùng chuẩn bị")}</h3>
                <p>{t("Tạo nhiệm vụ từ Tổng kết. Chuyển vai HR & Facilities để chuẩn bị phương án, rồi quay về Nhân viên để xác nhận.")}</p>
              </section>
            </div>
          </div>
          <div className="dialog-actions">
            <button className="button primary" onClick={() => setHelp(false)}>{t("Tôi đã hiểu")}<Check size={16} />
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
            <button onClick={() => setToast("")} aria-label={t("Đóng thông báo")}>
              <X size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
