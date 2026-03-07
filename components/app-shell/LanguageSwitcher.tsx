"use client";

import { useI18n } from "@/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button
        type="button"
        onClick={() => setLocale("en")}
        style={{
          padding: "2px 8px",
          fontSize: 11,
          background: locale === "en" ? "#2a4a2a" : "#333",
          color: locale === "en" ? "#90ee90" : "#888",
          border: "1px solid #444",
          borderRadius: 3,
          cursor: "pointer",
        }}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("pt")}
        style={{
          padding: "2px 8px",
          fontSize: 11,
          background: locale === "pt" ? "#2a4a2a" : "#333",
          color: locale === "pt" ? "#90ee90" : "#888",
          border: "1px solid #444",
          borderRadius: 3,
          cursor: "pointer",
        }}
      >
        PT
      </button>
    </div>
  );
}
