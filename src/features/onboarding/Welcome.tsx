import { useLocale } from '../../lib/i18n';
import LanguageSwitch from '../../components/LanguageSwitch';
import { useState, type FormEvent } from "react";
import {
  Accessibility,
  ArrowRight,
  Check,
  PersonStanding,
  Ruler,
} from "lucide-react";
import Dialog from "../../components/Dialog";
import { categories, categoryLabels, type Category } from "../../types/domain";
import { mobilitySchema, type MobilityProfile } from "../../types/simulator";
import { useDemoStore } from "../../store/useDemoStore";
import { WheelchairDiagram } from "../simulator/ObjectIllustration";

export default function Welcome({ onClose, onConfirm, entering = false }: { onClose: () => void; onConfirm?: () => void; entering?: boolean }) {
  const { t, language } = useLocale();
  const { session, start, setMobility } = useDemoStore();
  const [needs, setNeeds] = useState<Category[]>(session.selectedNeeds);
  const [profile, setProfile] = useState<MobilityProfile>({
    ...session.mobility,
  });
  const [error, setError] = useState("");
  const fields = [
    ["widthCm", t("Chiều rộng xe"), t("Đo cả bánh xe và phụ kiện hai bên"), 45, 130],
    ["lengthCm", t("Chiều dài xe"), t("Đo cả phần gác chân phía trước"), 70, 180],
    [
      "heightCm",
      t("Chiều cao xe"),
      t("Từ sàn đến điểm cao nhất của xe, không tính người"),
      55,
      150,
    ],
    ["seatHeightCm", t("Chiều cao mặt ngồi"), t("Từ sàn đến mặt đệm ghế"), 30, 80],
    [
      "armrestHeightCm",
      t("Chiều cao tay vịn"),
      t("Từ sàn đến đỉnh tay vịn"),
      45,
      120,
    ],
  ] as const;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = mobilitySchema.safeParse(profile);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setMobility(result.data);
    start(needs);
    (onConfirm ?? onClose)();
  };
  return (
    <Dialog
      title={
        session.started
          ? t("Nhân vật & kích thước xe của bạn")
          : t("Bạn là nhân vật chính.")
      }
      subtitle={t("Tự điều khiển nhân vật trong văn phòng, thử các lối đi và làm quen đồ vật trước ngày đầu.")}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="mobility-form">
        <LanguageSwitch />
        <div className="mode-options">
          <button
            type="button"
            aria-pressed={profile.mode === "wheelchair"}
            onClick={() => setProfile((p) => ({ ...p, mode: "wheelchair" }))}
          >
            <Accessibility size={23} />
            <strong>{t("Sử dụng xe lăn")}</strong>
            <span>{t("Trải nghiệm dành cho bạn")}</span>
          </button>
          <button
            type="button"
            aria-pressed={profile.mode === "walking"}
            onClick={() => setProfile((p) => ({ ...p, mode: "walking" }))}
          >
            <PersonStanding size={23} />
            <strong>{t("Đi bộ khám phá")}</strong>
            <span>{t("Cùng làm quen không gian")}</span>
          </button>
        </div>
        {profile.mode === "wheelchair" && (
          <div className="profile-layout">
            <div>
              <WheelchairDiagram profile={profile} />
              <p>
                <Ruler size={14} />{t("Kích thước mặc định chỉ là ví dụ. Nhập số đo xe bạn đang dùng.")}</p>
              <p>{t("Rộng và dài thay đổi mô hình cùng vùng va chạm. Các số đo cao giúp so sánh bàn và đồ dùng.")}</p>
            </div>
            <div className="measurement-fields">
              {fields.map(([key, label, hint, min, max]) => (
                <label key={key}>
                  <span>
                    {label}
                    <small>{hint}</small>
                  </span>
                  <div>
                    <input
                      type="number"
                      required
                      min={min}
                      max={max}
                      step="1"
                      value={Number.isFinite(profile[key]) ? profile[key] : ""}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          [key]: e.target.valueAsNumber,
                        }))
                      }
                      aria-label={label}
                    />
                    <span>cm</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        <details className="profile-needs">
          <summary>{t("Điều kiện khác bạn muốn kiểm tra (")}{needs.length})</summary>
          <div className="needs-grid">
            {categories.map((c) => (
              <button
                type="button"
                key={c}
                className={`need-option ${needs.includes(c) ? "selected" : ""}`}
                aria-pressed={needs.includes(c)}
                onClick={() =>
                  setNeeds((v) =>
                    v.includes(c) ? v.filter((x) => x !== c) : [...v, c],
                  )
                }
              >
                <span className="need-check">
                  {needs.includes(c) && <Check size={13} />}
                </span>
                {t(categoryLabels[c])}
              </button>
            ))}
          </div>
        </details>
        <div className="controls-primer">
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd>{t("Di chuyển theo hướng nhìn")}</span>
          <span>
            <kbd>F</kbd>{t("Tương tác khi ở gần")}</span>
          <span>
            <kbd>Q</kbd>
            <kbd>E</kbd>{t("Xoay tại chỗ")}</span>
          <span><kbd>V</kbd>{t("Góc nhìn thứ nhất / thứ ba")}</span>
        </div>
        <p className="profile-disclaimer">{t("Vào map sẽ ẩn chuột: di chuột để nhìn quanh, không cần giữ nút. Esc hiện chuột, Enter tiếp tục. N chọn điểm đến, P tự đi/dừng, H bật/tắt giọng hướng dẫn. Trên điện thoại, vuốt để nhìn.")}</p>
        <p className="profile-disclaimer">{t("Văn phòng mẫu · 1 đơn vị = 1 mét. So sánh hình học giúp phát hiện điều cần xác minh, không xác nhận khả năng tiếp cận ở công ty thật.")}</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button className="button primary" type="submit">
            {session.started ? entering ? t("Vào văn phòng") : t("Lưu nhân vật") : t("Bắt đầu trải nghiệm")}
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
