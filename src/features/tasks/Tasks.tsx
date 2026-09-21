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
      `${t.title} ${locationById(t.locationId).name}`
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
          ? "Đã xác nhận phương án chuẩn bị."
          : "Đã cập nhật nhiệm vụ.",
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
            ? "KHÔNG GIAN HR & FACILITIES"
            : "CÙNG CHUẨN BỊ CHO NGÀY ĐẦU"}
        </span>
        <h1>
          {role === "hr"
            ? "Biến ghi nhận thành sự chuẩn bị."
            : "Những điều đang được chuẩn bị."}
        </h1>
        <p>
          {role === "hr"
            ? "Mỗi nhiệm vụ có một địa điểm, một người phụ trách và một bước tiếp theo."
            : "Xem phản hồi từ HR và Facilities, rồi xác nhận phương án phù hợp với bạn."}
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
            <span>{statusLabels[status]}</span>
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
                  "Tiếp nhận & phân công",
                  "Đang thực hiện phương án",
                  "Cần nhân viên xem lại",
                  "Đã xác nhận phương án",
                ][i]
              }
            </span>
          </button>
        ))}
      </div>
      <section className="surface">
        <div className="section-heading">
          <h2>
            Nhiệm vụ chuẩn bị{" "}
            <span className="count">{session.tasks.length}</span>
          </h2>
          <span className="badge subtle">
            Vai demo: {role === "hr" ? "HR / Facilities" : "Nhân viên"}
          </span>
        </div>
        <div className="filters">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Tìm nhiệm vụ"
              placeholder="Tìm nhiệm vụ, địa điểm…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Lọc bộ phận"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          >
            <option value="all">Tất cả bộ phận</option>
            <option>HR</option>
            <option>Facilities</option>
          </select>
          <select
            aria-label="Lọc trạng thái"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            {taskStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc ưu tiên"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="all">Mọi ưu tiên</option>
            {Object.entries(priorityLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {!tasks.length ? (
          <div className="empty-state">
            <ClipboardList size={36} />
            <h3>
              {session.tasks.length
                ? "Không có nhiệm vụ phù hợp"
                : "Sự chuẩn bị bắt đầu từ một ghi nhận"}
            </h3>
            <p>
              {session.tasks.length
                ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
                : "Khám phá văn phòng, ghi nhận điều cần xác minh và tạo nhiệm vụ tại Tổng kết."}
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nhiệm vụ / Địa điểm</th>
                  <th>Phụ trách</th>
                  <th>Ưu tiên</th>
                  <th>Hạn chuẩn bị</th>
                  <th>Trạng thái</th>
                  <th>
                    <span className="sr-only">Chi tiết</span>
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
                        {locationById(t.locationId).name}
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
                        {priorityLabels[t.priority]}
                      </span>
                    </td>
                    <td>
                      {formatDate(t.dueDate)}
                      {t.dueDate < officeDate() && t.status !== "done" && (
                        <small className="overdue block">Quá hạn</small>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${t.status}`}>
                        {statusLabels[t.status]}
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
      <p className="footnote">
        Dữ liệu cục bộ trên trình duyệt này. Hoàn tất nhiệm vụ xác nhận phương
        án trong demo, không xác minh điều kiện thực tế.
      </p>
      {task && (
        <Dialog
          title="Chi tiết nhiệm vụ"
          subtitle={`${task.ownerTeam} · Hạn ${formatDate(task.dueDate)}`}
          onClose={() => setSelected(null)}
          wide
        >
          <div className="task-detail">
            <span className={`badge ${task.status}`}>
              {statusLabels[task.status]}
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
              {locationById(task.locationId).name}
              <ArrowRight size={15} />
            </button>
            {session.issues
              .filter((i) => task.issueIds.includes(i.id))
              .map((i) => (
                <div className="detail-context" key={i.id}>
                  <p>
                    <strong>Hoạt động:</strong> {journey[i.stepId].time} ·{" "}
                    {journey[i.stepId].title}
                  </p>
                  <p>
                    <strong>Mong muốn:</strong>{" "}
                    {i.requestedSupport ||
                      "Xác minh thông tin và phản hồi trước ngày bắt đầu."}
                  </p>
                </div>
              ))}
            {role === "hr" && task.status !== "done" && (
              <div className="assignment">
                <label>
                  Bộ phận
                  <select
                    value={owner}
                    onChange={(e) =>
                      setOwner(e.target.value as Task["ownerTeam"])
                    }
                  >
                    <option>HR</option>
                    <option>Facilities</option>
                  </select>
                </label>
                <label>
                  Người phụ trách
                  <input
                    placeholder="Ví dụ: Linh"
                    value={assignee}
                    maxLength={80}
                    onChange={(e) => setAssignee(e.target.value)}
                  />
                </label>
                <button
                  className="button secondary"
                  onClick={() => {
                    assignTask(task.id, owner, assignee);
                    notify("Đã lưu phân công.");
                  }}
                >
                  Lưu
                </button>
              </div>
            )}
            {task.resolutionNote && (
              <div className="resolution">
                <ShieldCheck size={22} />
                <div>
                  <strong>Phương án chuẩn bị</strong>
                  <p>{task.resolutionNote}</p>
                </div>
              </div>
            )}
            {task.employeeResponse && (
              <p className="detail-context">
                <strong>Phản hồi nhân viên:</strong> {task.employeeResponse}
              </p>
            )}
            {((role === "hr" && task.status === "in_progress") ||
              (role === "employee" && task.status === "ready_for_review")) && (
              <label className="form-label">
                {role === "hr"
                  ? "Phương án chuẩn bị"
                  : "Điều cần xem lại (nếu có)"}
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    role === "hr"
                      ? "Mô tả cách hỗ trợ và thông tin đã chuẩn bị…"
                      : "Ghi rõ nếu bạn muốn điều chỉnh phương án…"
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
                >
                  Bắt đầu chuẩn bị
                  <ArrowRight size={16} />
                </button>
              )}
              {role === "hr" && task.status === "in_progress" && (
                <button
                  className="button primary"
                  onClick={() => change("ready_for_review")}
                >
                  Gửi phương án xác nhận
                  <ArrowRight size={16} />
                </button>
              )}
              {role === "employee" && task.status === "ready_for_review" && (
                <>
                  <button
                    className="button secondary"
                    onClick={() => change("in_progress")}
                  >
                    Yêu cầu xem lại
                  </button>
                  <button
                    className="button primary"
                    onClick={() => change("done")}
                  >
                    <Check size={16} />
                    Xác nhận phương án
                  </button>
                </>
              )}
              {role === "hr" && task.status === "ready_for_review" && (
                <p className="muted small">
                  Đang chờ nhân viên xác nhận. Chuyển vai Nhân viên để tiếp tục
                  demo.
                </p>
              )}
            </div>
            <h4>Lịch sử cập nhật</h4>
            <ol className="history">
              {task.history.map((h, i) => (
                <li key={i}>
                  <span>
                    <strong>{h.actor}</strong> ·{" "}
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
