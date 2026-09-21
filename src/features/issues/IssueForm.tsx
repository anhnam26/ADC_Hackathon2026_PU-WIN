import { useState, type FormEvent } from "react";
import { MapPin, Plus } from "lucide-react";
import Dialog from "../../components/Dialog";
import {
  categoryLabels,
  categories,
  type Category,
  type Issue,
} from "../../types/domain";
import { locationById } from "../../data/office";
import { journey } from "../../data/journey";
import { useDemoStore } from "../../store/useDemoStore";

export interface IssueContext {
  locationId: string;
  stepId: number;
  category?: Category;
  checklistId?: string;
  suggestion?: string;
  kind?: Issue["kind"];
  issue?: Issue;
  objectId?: string;
  objectName?: string;
  measurementNote?: string;
}
export default function IssueForm({
  context,
  onClose,
  onSaved,
}: {
  context: IssueContext;
  onClose: () => void;
  onSaved: () => void;
}) {
  const saveIssue = useDemoStore((s) => s.saveIssue);
  const issue = context.issue;
  const [description, setDescription] = useState(
    issue?.description ?? context.suggestion ?? "",
  );
  const [support, setSupport] = useState(issue?.requestedSupport ?? "");
  const [category, setCategory] = useState<Category>(
    issue?.category ??
      context.category ??
      locationById(context.locationId).category,
  );
  const [kind, setKind] = useState<Issue["kind"]>(
    issue?.kind ?? context.kind ?? "verification",
  );
  const [impact, setImpact] = useState<Issue["impact"]>(
    issue?.impact ?? "normal",
  );
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 3) {
      setError("Hãy mô tả ít nhất 3 ký tự để người chuẩn bị hiểu vấn đề.");
      return;
    }
    saveIssue(
      {
        locationId: context.locationId,
        stepId: context.stepId,
        checklistId: issue?.checklistId ?? context.checklistId,
        category,
        kind,
        impact,
        description: description.trim(),
        requestedSupport: support.trim(),
        objectId: issue?.objectId ?? context.objectId,
        objectName: issue?.objectName ?? context.objectName,
        measurementNote: issue?.measurementNote ?? context.measurementNote,
      },
      issue?.id,
    );
    onSaved();
  };
  return (
    <Dialog
      title={issue ? "Chỉnh sửa ghi nhận" : "Cùng chuẩn bị tốt hơn"}
      subtitle="Ghi lại điều chưa rõ hoặc rào cản có thể xảy ra."
      onClose={onClose}
    >
      <div className="context-strip">
        <MapPin size={18} />
        <div>
          <strong>{locationById(context.locationId).name}</strong>
          {(context.objectName ?? issue?.objectName) && <strong>{context.objectName ?? issue?.objectName}</strong>}
          <span>
            {journey[context.stepId].time} · {journey[context.stepId].title}
          </span>
        </div>
      </div>
      {(context.measurementNote ?? issue?.measurementNote) && <p className="measurement-context">{context.measurementNote ?? issue?.measurementNote}</p>}
      <form onSubmit={submit} className="form-stack">
        <fieldset className="kind-options">
          <legend>Loại ghi nhận</legend>
          <label>
            <input
              type="radio"
              name="kind"
              checked={kind === "verification"}
              onChange={() => setKind("verification")}
            />{" "}
            Cần xác minh
          </label>
          <label>
            <input
              type="radio"
              name="kind"
              checked={kind === "barrier"}
              onChange={() => setKind("barrier")}
            />{" "}
            Rào cản có thể xảy ra
          </label>
        </fieldset>
        <label>
          Điều kiện liên quan
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {categories.map((c) => (
              <option value={c} key={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Điều bạn muốn ghi nhận <span className="required">*</span>
          <textarea
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ví dụ: Tôi chưa rõ lối bên hông có mở lúc 08:30 không."
          />
        </label>
        <label>
          Hỗ trợ bạn mong muốn{" "}
          <span className="optional">(không bắt buộc)</span>
          <textarea
            rows={2}
            maxLength={1000}
            value={support}
            onChange={(e) => setSupport(e.target.value)}
            placeholder="Ví dụ: Gửi hướng dẫn đường đi trước ngày đầu."
          />
        </label>
        <label>
          Mức ảnh hưởng
          <select
            value={impact}
            onChange={(e) => setImpact(e.target.value as Issue["impact"])}
          >
            <option value="normal">Cần biết thêm thông tin</option>
            <option value="medium">Có thể làm gián đoạn hoạt động</option>
            <option value="high">Có thể không thực hiện được hoạt động</option>
          </select>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="button primary" type="submit">
            <Plus size={16} />
            Lưu vào tổng kết
          </button>
        </div>
      </form>
    </Dialog>
  );
}
