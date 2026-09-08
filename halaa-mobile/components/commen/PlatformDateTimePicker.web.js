import React, { useState } from "react";
import { useTranslation } from "../../localization";

const pad = value => String(value).padStart(2, "0");
const dateValue = value => `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;

// Browser equivalent only. Native builds retain the community picker unchanged.
export default function PlatformDateTimePicker({ value, mode = "date", minimumDate, maximumDate, onChange }) {
  const { t } = useTranslation("common");
  const time = mode === "time";
  const [draft, setDraft] = useState(() => time ? `${pad(value.getHours())}:${pad(value.getMinutes())}` : dateValue(value));
  const save = event => {
    event.preventDefault();
    const entered = new FormData(event.currentTarget).get("pickerValue");
    if (!entered) return;
    const selected = new Date(value);
    if (time) {
      const [hours, minutes] = String(entered).split(":").map(Number);
      selected.setHours(hours, minutes, 0, 0);
    } else {
      const [year, month, day] = String(entered).split("-").map(Number);
      selected.setFullYear(year, month - 1, day);
      selected.setHours(0, 0, 0, 0);
    }
    if (!Number.isNaN(selected.getTime())) onChange?.({ type: "set" }, selected);
  };
  const buttonStyle = { minHeight: 44, padding: "8px 16px", border: "1px solid #D9C3B0", borderRadius: 8, backgroundColor: "#FFF", color: "#6B4E33", font: "inherit", fontSize: 16, cursor: "pointer" };
  return <form onSubmit={save} style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12, backgroundColor: "#F9F4EF", borderRadius: 10 }}>
    <input name="pickerValue" aria-label={t(time ? "picker.time" : "picker.date")} type={time ? "time" : "date"} required value={draft} min={!time && minimumDate ? dateValue(minimumDate) : undefined} max={!time && maximumDate ? dateValue(maximumDate) : undefined} onChange={event => setDraft(event.target.value)} style={{ ...buttonStyle, flex: "1 1 180px", minWidth: 0 }} />
    <button type="button" onClick={() => onChange?.({ type: "dismissed" })} style={buttonStyle}>{t("buttons.cancel")}</button>
    <button type="submit" style={{ ...buttonStyle, backgroundColor: "#6B4E33", color: "#FFF" }}>{t("buttons.save")}</button>
  </form>;
}
