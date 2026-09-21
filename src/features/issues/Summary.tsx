import { useLocale } from '../../lib/i18n';
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  MapPin,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { useDemoStore } from "../../store/useDemoStore";
import { locationById } from "../../data/office";
import { journey } from "../../data/journey";
import { categoryLabels, statusLabels, type Issue } from "../../types/domain";

export default function Summary({
  onEdit,
  onTasks,
  notify,
}: {
  onEdit: (issue: Issue) => void;
  onTasks: () => void;
  notify: (text: string) => void;
}) {
  const {t: tr, language} = useLocale();
  const { session, deleteIssue, submitIssues } = useDemoStore();
  const draft = session.issues.filter((i) => i.state === "draft");
  const completed = session.stepStatuses.filter(
    (s) => s === "completed",
  ).length;
  return (
    <div className="page-content">
      <div className="page-intro">
        <span className="eyebrow">{tr("SAU MỘT VÒNG LÀM QUEN")}</span>
        <h1>{tr("Một ngày đầu được chuẩn bị tốt hơn.")}</h1>
        <p>{tr("Những điều bạn ghi nhận sẽ trở thành việc chuẩn bị cụ thể cho HR và Facilities.")}</p>
      </div>
      <div className="stat-grid">
        <div className="stat-card">
          <span>{tr("Chặng đã trải nghiệm")}</span>
          <strong>
            {completed}
            <small> / 7</small>
          </strong>
          <span>{tr("Không phải đánh giá mức đáp ứng")}</span>
        </div>
        <div className="stat-card">
          <span>{tr("Điều cần chuẩn bị")}</span>
          <strong>{session.issues.length.toString().padStart(2, "0")}</strong>
          <span>{draft.length} {tr("ghi nhận chưa tạo nhiệm vụ")}</span>
        </div>
        <div className="stat-card accent">
          <span>{tr("Phương án chờ bạn xem")}</span>
          <strong>
            {session.tasks
              .filter((t) => t.status === "ready_for_review")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <button className="text-button" onClick={onTasks}>{tr("Xem phản hồi")}<ArrowRight size={15} />
          </button>
        </div>
      </div>
      <section className="surface">
        <div className="section-heading">
          <h2>{tr("Những điều bạn đã ghi nhận")}{" "}
            <span className="count">{session.issues.length}</span>
          </h2>
          <span className="muted small">{tr("Chỉ lưu trong trình duyệt này")}</span>
        </div>
        {!session.issues.length ? (
          <div className="empty-state">
            <ClipboardCheck size={34} />
            <h3>{tr("Chưa có điều gì cần chuẩn bị thêm")}</h3>
            <p>{tr("Bạn có thể hoàn thành trải nghiệm mà không cần tạo ghi nhận.")}</p>
          </div>
        ) : (
          <div className="issue-list">
            {session.issues.map((issue) => {
              const task = session.tasks.find((t) =>
                t.issueIds.includes(issue.id),
              );
              return (
                <article className="issue-row" key={issue.id}>
                  <div className={`issue-symbol ${issue.kind}`}>
                    <MapPin size={20} />
                  </div>
                  <div className="issue-copy">
                    {issue.objectName && <p><strong>{issue.objectName}</strong></p>}
                    {issue.measurementNote && <p className="measurement-context">{issue.measurementNote}</p>}
                    <div className="inline-meta">
                      <span>{tr(locationById(issue.locationId).name)}</span>
                      <span>{tr("·")}{journey[issue.stepId].time}</span>
                    </div>
                    <h3>{issue.description}</h3>
                    <p>
                      {tr(categoryLabels[issue.category])}
                      {issue.requestedSupport &&
                        ` · Mong muốn: ${issue.requestedSupport}`}
                    </p>
                    <span className={`badge ${task ? task.status : "draft"}`}>
                      {task ? tr(statusLabels[task.status]) : tr("Chưa gửi")}
                    </span>
                    {task && (
                      <span className="muted small">{tr("·")}{task.ownerTeam}</span>
                    )}
                  </div>
                  {issue.state === "draft" && (
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label={`Sửa: ${issue.description}`}
                        onClick={() => onEdit(issue)}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label={`Xóa: ${issue.description}`}
                        onClick={() => {
                          deleteIssue(issue.id);
                          notify(tr("Đã xóa ghi nhận chưa gửi."));
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
        <div className="summary-actions">
          <p>
            <Check size={17} />{tr("Bạn có thể sửa ghi nhận trước khi tạo nhiệm vụ.")}</p>
          <button
            className="button primary"
            disabled={!draft.length}
            onClick={() => {
              submitIssues();
              notify(`Đã tạo ${draft.length} nhiệm vụ chuẩn bị trong demo.`);
            }}
          >
            <Send size={16} />{tr("Tạo")} {draft.length} {tr("nhiệm vụ chuẩn bị")}</button>
        </div>
      </section>
      <section className="surface journey-review">
        <h2>{tr("Hành trình của bạn")}</h2>
        {journey.map((step, i) => (
          <div key={step.id}>
            <time>{step.time}</time>
            <span>{tr(step.title)}</span>
            <span
              className={`badge ${session.stepStatuses[i] === "completed" ? "done" : "draft"}`}
            >
              {session.stepStatuses[i] === "completed"
                ? tr("Đã trải nghiệm")
                : session.stepStatuses[i] === "skipped"
                  ? tr("Đã bỏ qua")
                  : tr("Chưa trải nghiệm")}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
