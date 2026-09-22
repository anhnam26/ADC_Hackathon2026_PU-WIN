import { useLocale } from '../../lib/i18n';
import { objectEnglish } from '../../data/objectEnglish';
import { useState } from "react";
import {
  ArrowRight,
  DoorOpen,
  Flag,
  Ruler,
  ShieldQuestion,
} from "lucide-react";
import Dialog from "../../components/Dialog";
import ObjectIllustration from "./ObjectIllustration";
import type { MobilityProfile, WorldObject } from "../../types/simulator";

export function measurementSummary(o: WorldObject, profile: MobilityProfile) {
  return `${o.name}: rộng ${Math.round(o.size[0] * 100)} × sâu ${Math.round(o.size[2] * 100)} × cao ${Math.round(o.size[1] * 100)} cm${o.clearWidth ? `; thông thủy ${Math.round(o.clearWidth * 100)} cm` : ""}. ${profile.mode === "wheelchair" ? `Xe: ${profile.widthCm} × ${profile.lengthCm} cm; tay vịn ${profile.armrestHeightCm} cm.` : "Chế độ đi bộ."} Số đo mô phỏng.`;
}
export default function ObjectInspector({
  object,
  profile,
  open,
  onClose,
  onToggle,
  onReport,
}: {
  object: WorldObject;
  profile: MobilityProfile;
  open: boolean;
  onClose: () => void;
  onToggle: () => string | null;
  onReport: () => void;
}) {
  const { t, language } = useLocale();
  if(language === 'en') object=objectEnglish(object);
  const [error, setError] = useState("");
  const difference = object.clearWidth
    ? Math.round(object.clearWidth * 100 - profile.widthCm)
    : null;
  return (
    <Dialog
      title={t(object.name)}
      subtitle={t("Hồ sơ đối tượng · Số đo lấy từ mô hình đang trải nghiệm")}
      onClose={onClose}
      wide
    >
      <div className="inspector-grid">
        <div>
          <ObjectIllustration object={object} open={open} />
          <div className="dimension-grid">
            <div>
              <span>{t("Rộng")}</span>
              <strong>
                {Math.round(object.size[0] * 100)}
                <small> cm</small>
              </strong>
            </div>
            <div>
              <span>{t("Sâu")}</span>
              <strong>
                {Math.round(object.size[2] * 100)}
                <small> cm</small>
              </strong>
            </div>
            <div>
              <span>{t('Cao')}</span>
              <strong>
                {Math.round(object.size[1] * 100)}
                <small> cm</small>
              </strong>
            </div>
          </div>
          <p className="illustration-note">{t("Hình chi tiết được tạo từ cùng hình học với vật trong văn phòng. Góc nhìn được phóng to để đọc rõ.")}</p>
        </div>
        <div className="object-description">
          <p>{object.description}</p>
          {object.clearWidth && (
            <div className="specific-measure">
              <Ruler size={17} />
              <span>{t("Rộng thông thủy")}<strong>{Math.round(object.clearWidth * 100)} cm</strong>
              </span>
            </div>
          )}
          {object.underHeight && (
            <div className="specific-measure">
              <Ruler size={17} />
              <span>{t("Khoảng trống dưới mặt")}<strong>
                  {Math.round(object.underHeight * 100)} {t("cm cao ×")}{" "}
                  {Math.round((object.underWidth ?? 0) * 100)} {t("cm rộng")}</strong>
              </span>
            </div>
          )}
          {object.controlHeight && (
            <div className="specific-measure">
              <Ruler size={17} />
              <span>
                {object.kind === "door" ? t("Cao tay nắm") : t("Cao vị trí sử dụng")}
                <strong>
                  {Math.round(object.controlHeight * 100)} {t("cm từ sàn")}</strong>
              </span>
            </div>
          )}
          {profile.mode === "wheelchair" && difference !== null && (
            <div
              className={`fit-comparison ${difference <= 0 ? "blocked-fit" : difference < 12 ? "tight-fit" : ""}`}
            >
              <strong>
                {difference <= 0
                  ? t("Xe không lọt ô cửa theo số đo")
                  : difference < 12
                    ? t("Ô cửa khá sát với xe của bạn")
                    : t("Ô cửa rộng hơn xe của bạn")}
              </strong>
              <p>{t("Ô cửa")} {Math.round(object.clearWidth! * 100)} {t("cm − xe")}{" "}
                {profile.widthCm} cm = {difference} cm{" "}
                {difference > 0 ? t("dư tổng cộng") : t("chênh lệch")}.
              </p>
              <small>
                {difference > 0
                  ? `Khi căn giữa, khoảng dư mỗi bên khoảng ${(difference / 2).toFixed(1)} cm. `
                  : ""}{t("Cần xét cả hướng tiếp cận, tay đẩy và đồ mang theo.")}</small>
            </div>
          )}
          {profile.mode === "wheelchair" && object.underHeight && (
            <div
              className={`fit-comparison ${profile.armrestHeightCm >= object.underHeight * 100 ? "tight-fit" : ""}`}
            >
              <strong>{t("Tay vịn của bạn:")} {profile.armrestHeightCm} cm</strong>
              <p>
                {profile.armrestHeightCm >= object.underHeight * 100
                  ? t("Tay vịn cao hơn hoặc bằng khoảng trống dưới mặt. Có thể cần điều chỉnh.")
                  : `Còn khoảng ${(object.underHeight * 100 - profile.armrestHeightCm).toFixed(0)} cm theo chiều cao.`}
              </p>
              <small>{t("Chưa mô phỏng tư thế đưa chân vào dưới bàn hoặc tầm với cá nhân.")}</small>
            </div>
          )}
        </div>
      </div>
      <div className="object-guide">
        <section>
          <h3>{t("Cách sử dụng / tiếp cận")}</h3>
          <ol>
            {object.usage.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </section>
        <section>
          <h3>
            <ShieldQuestion size={16} />{t("Lưu ý cho bạn")}</h3>
          <ul>
            {object.notes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="object-actions">
        <button className="button secondary" onClick={onReport}>
          <Flag size={16} />{t("Ghi nhận về đồ vật này")}</button>
        {object.kind === "door" && (
          <button
            className="button primary"
            onClick={() => {
              const message = onToggle();
              setError(message ?? "");
            }}
          >
            <DoorOpen size={17} />
            {open ? t("Đóng cửa") : t("Mở cửa")}
          </button>
        )}
        <button className="text-button" onClick={onClose}>{t("Tiếp tục di chuyển")}<ArrowRight size={15} />
        </button>
      </div>
    </Dialog>
  );
}
