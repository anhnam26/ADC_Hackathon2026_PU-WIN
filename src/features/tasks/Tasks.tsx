import { useLocale } from '../../lib/i18n';
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  ClipboardList,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useDemoStore } from "../../store/useDemoStore";
import { locationById } from "../../data/office";
import { journey } from "../../data/journey";
import { formatDate, officeDate } from "../../lib/taskRules";
import {
  priorityLabels,
  statusLabels,
  taskStatuses,
  type Task,
  type TaskStatus,
} from "../../types/domain";
import Dialog from "../../components/Dialog";

export default function Tasks({
  role,
  onLocation,
  notify,
}: {
  role: "employee" | "hr";
  onLocation: (id: string) => void;
  notify: (s: string) => void;
}) {
  const {t: tr, language} = useLocale();
  const { session, transition, assignTask } = useDemoStore();
  const [filter, setFilter] = useState("all");
  const [team, setTeam] = useState("all");
  const [priority, setPriority] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  const [owner, setOwner] = useState<Task["ownerTeam"]>("HR");
  const [error, setError] = useState("");
  const task = session.tasks.find((t) => t.id === selected);
  const tasks = session.tasks.filter(
    (t) =>
      (filter === "all" || t.status === filter) &&
      (team === "all" || t.ownerTeam === team) &&
      (priority === "all" || t.priority === priority) &&
      `${t.title} ${tr(locationById(t.locationId).name)}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  function change(status: TaskStatus) {
    if (!task) return;
    try {
      transition(
        task.id,
        status,
        role === "hr" ? "HR/Facilities" : "Nhân viên",
        note,
      );
      setError("");
      setNote("");
      notify(
        status === "done"
          ? tr("Đã xác nhận phương án chuẩn bị.")
          : tr("Đã cập nhật nhiệm vụ."),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const open = (t: Task) => {
    setSelected(t.id);
    setNote("");
    setError("");
    setOwner(t.ownerTeam);
    setAssignee(t.assignee);
  };
  return (
    <div className="page-content">
      <div className="page-intro">
        <span className="eyebrow">
          {role === "hr"
            ? tr("KHÔNG GIAN HR & FACILITIES")
            : tr("CÙNG CHUẨN BỊ CHO NGÀY ĐẦU")}
        </span>
        <h1>
          {role === "hr"
            ? tr("Biến ghi nhận thành sự chuẩn bị.")
            : tr("Những điều đang được chuẩn bị.")}
        </h1>
        <p>
          {role === "hr"
            ? tr("Mỗi nhiệm vụ có một địa điểm, một người phụ trách và một bước tiếp theo.")
            : tr("Xem phản hồi từ HR và Facilities, rồi xác nhận phương án phù hợp với bạn.")}
        </p>
      </div>
      <div className="stat-grid four">
        {taskStatuses.map((status, i) => (
          <button
            className={`stat-card ${filter === status ? "stat-active" : ""}`}
            onClick={() => setFilter(filter === status ? "all" : status)}
            key={status}
            aria-pressed={filter === status}
          >
            <span>{tr(statusLabels[status])}</span>
            <strong>
              {session.tasks
                .filter((t) => t.status === status)
                .length.toString()
                .padStart(2, "0")}
            </strong>
            <span className="stat-foot">
              {
                [
                  <ClipboardList size={16} />,
                  <Clock3 size={16} />,
                  <Search size={16} />,
                  <ShieldCheck size={16} />,
                ][i]
              }
              {
                [
                  tr("Tiếp nhận & phân công"),
                  tr("Đang thực hiện phương án"),
                  tr("Cần nhân viên xem lại"),
                  tr("Đã xác nhận phương án"),
                ][i]
              }
            </span>
          </button>
        ))}
      </div>
      <section className="surface">
        <div className="section-heading">
          <h2>{tr("Nhiệm vụ chuẩn bị")}{" "}
            <span className="count">{session.tasks.length}</span>
          </h2>
          <span className="badge subtle">
            {tr('Vai demo:')} {role === "hr" ? "HR / Facilities" : tr("Nhân viên")}
          </span>
        </div>
        <div className="filters">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label={tr("Tìm nhiệm vụ")}
              placeholder={tr("Tìm nhiệm vụ, địa điểm…")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label={tr("Lọc bộ phận")}
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          >
            <option value="all">{tr("Tất cả bộ phận")}</option>
            <option>HR</option>
            <option>Facilities</option>
          </select>
          <select
            aria-label={tr("Lọc trạng thái")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">{tr("Tất cả trạng thái")}</option>
            {taskStatuses.map((s) => (
              <option key={s} value={s}>
                {tr(statusLabels[s])}
              </option>
            ))}
          </select>
          <select
            aria-label={tr("Lọc ưu tiên")}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="all">{tr("Mọi ưu tiên")}</option>
            {Object.entries(priorityLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {k === 'high' && language === 'en' ? 'High' : tr(v)}
              </option>
            ))}
          </select>
        </div>
        {!tasks.length ? (
          <div className="empty-state">
            <ClipboardList size={36} />
            <h3>
              {session.tasks.length
                ? tr("Không có nhiệm vụ phù hợp")
                : tr("Sự chuẩn bị bắt đầu từ một ghi nhận")}
            </h3>
            <p>
              {session.tasks.length
                ? tr("Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.")
                : tr("Khám phá văn phòng, ghi nhận điều cần xác minh và tạo nhiệm vụ tại Tổng kết.")}
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{tr("Nhiệm vụ / Địa điểm")}</th>
                  <th>{tr("Phụ trách")}</th>
                  <th>{tr("Ưu tiên")}</th>
                  <th>{tr("Hạn chuẩn bị")}</th>
                  <th>{tr("Trạng thái")}</th>
                  <th>
                    <span className="sr-only">{tr("Chi tiết")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <button className="task-title" onClick={() => open(t)}>
                        {t.title}
                      </button>
                      <span className="table-location">
                        <MapPin size={13} />
                        {tr(locationById(t.locationId).name)}
                      </span>
                    </td>
                    <td>
                      <span className="owner-chip">
                        {t.ownerTeam === "HR" ? "HR" : "FM"}
                      </span>{" "}
                      {t.ownerTeam}
                      {t.assignee && (
                        <small className="block muted">{t.assignee}</small>
                      )}
                    </td>
                    <td>
                      <span className={`priority ${t.priority}`}>
                        {t.priority === 'high' && language === 'en' ? 'High' : tr(priorityLabels[t.priority])}
                      </span>
                    </td>
                    <td>
                      {formatDate(t.dueDate)}
                      {t.dueDate < officeDate() && t.status !== "done" && (
                        <small className="overdue block">{tr("Quá hạn")}</small>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${t.status}`}>
                        {tr(statusLabels[t.status])}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Chi tiết: ${t.title}`}
                        onClick={() => open(t)}
                      >
                        <ArrowRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="footnote">{tr("Dữ liệu cục bộ trên trình duyệt này. Hoàn tất nhiệm vụ xác nhận phương án trong demo, không xác minh điều kiện thực tế.")}</p>
      {task && (
        <Dialog
          title={tr("Chi tiết nhiệm vụ")}
          subtitle={`${task.ownerTeam} · Hạn ${formatDate(task.dueDate)}`}
          onClose={() => setSelected(null)}
          wide
        >
          <div className="task-detail">
            <span className={`badge ${task.status}`}>
              {tr(statusLabels[task.status])}
            </span>
            <h3>{task.title}</h3>
            <button
              className="text-button"
              onClick={() => {
                setSelected(null);
                onLocation(task.locationId);
              }}
            >
              <MapPin size={16} />
              {tr(locationById(task.locationId).name)}
              <ArrowRight size={15} />
            </button>
            {session.issues
              .filter((i) => task.issueIds.includes(i.id))
              .map((i) => (
                <div className="detail-context" key={i.id}>
                  <p>
                    <strong>{tr("Hoạt động:")}</strong> {journey[i.stepId].time}{tr("·")}{" "}
                    {tr(journey[i.stepId].title)}
                  </p>
                  {i.objectName && <p><strong>{tr("Đồ vật:")}</strong> {i.objectName}</p>}
                  {i.measurementNote && <p><strong>{tr("Số đo khi ghi nhận:")}</strong> {i.measurementNote}</p>}
                  <p>
                    <strong>{tr("Mong muốn:")}</strong>{" "}
                    {i.requestedSupport ||
                      tr("Xác minh thông tin và phản hồi trước ngày bắt đầu.")}
                  </p>
                </div>
              ))}
            {role === "hr" && task.status !== "done" && (
              <div className="assignment">
                <label>{tr("Bộ phận")}<select
                    value={owner}
                    onChange={(e) =>
                      setOwner(e.target.value as Task["ownerTeam"])
                    }
                  >
                    <option>HR</option>
                    <option>Facilities</option>
                  </select>
                </label>
                <label>{tr("Người phụ trách")}<input
                    placeholder={tr("Ví dụ: Linh")}
                    value={assignee}
                    maxLength={80}
                    onChange={(e) => setAssignee(e.target.value)}
                  />
                </label>
                <button
                  className="button secondary"
                  onClick={() => {
                    assignTask(task.id, owner, assignee);
                    notify(tr("Đã lưu phân công."));
                  }}
                >{tr("Lưu")}</button>
              </div>
            )}
            {task.resolutionNote && (
              <div className="resolution">
                <ShieldCheck size={22} />
                <div>
                  <strong>{tr("Phương án chuẩn bị")}</strong>
                  <p>{task.resolutionNote}</p>
                </div>
              </div>
            )}
            {task.employeeResponse && (
              <p className="detail-context">
                <strong>{tr("Phản hồi nhân viên:")}</strong> {task.employeeResponse}
              </p>
            )}
            {((role === "hr" && task.status === "in_progress") ||
              (role === "employee" && task.status === "ready_for_review")) && (
              <label className="form-label">
                {role === "hr"
                  ? tr("Phương án chuẩn bị")
                  : tr("Điều cần xem lại (nếu có)")}
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    role === "hr"
                      ? tr("Mô tả cách hỗ trợ và thông tin đã chuẩn bị…")
                      : tr("Ghi rõ nếu bạn muốn điều chỉnh phương án…")
                  }
                />
              </label>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              {role === "hr" && task.status === "todo" && (
                <button
                  className="button primary"
                  onClick={() => change("in_progress")}
                >{tr("Bắt đầu chuẩn bị")}<ArrowRight size={16} />
                </button>
              )}
              {role === "hr" && task.status === "in_progress" && (
                <button
                  className="button primary"
                  onClick={() => change("ready_for_review")}
                >{tr("Gửi phương án xác nhận")}<ArrowRight size={16} />
                </button>
              )}
              {role === "employee" && task.status === "ready_for_review" && (
                <>
                  <button
                    className="button secondary"
                    onClick={() => change("in_progress")}
                  >{tr("Yêu cầu xem lại")}</button>
                  <button
                    className="button primary"
                    onClick={() => change("done")}
                  >
                    <Check size={16} />{tr("Xác nhận phương án")}</button>
                </>
              )}
              {role === "hr" && task.status === "ready_for_review" && (
                <p className="muted small">{tr("Đang chờ nhân viên xác nhận. Chuyển vai Nhân viên để tiếp tục demo.")}</p>
              )}
            </div>
            <h4>{tr("Lịch sử cập nhật")}</h4>
            <ol className="history">
              {task.history.map((h, i) => (
                <li key={i}>
                  <span>
                    <strong>{h.actor}</strong>{tr("·")}{" "}
                    {new Date(h.at).toLocaleString("vi-VN")}
                  </span>
                  <p>{h.message}</p>
                </li>
              ))}
            </ol>
          </div>
        </Dialog>
      )}
    </div>
  );
}
