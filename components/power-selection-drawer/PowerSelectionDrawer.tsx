"use client";

import React from "react";
import { useI18n } from "@/i18n";
import {
  disciplineService,
  DisciplinePower,
} from "@/core/services/DisciplineService";

interface PowerSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  disciplineId: string;
  level: number;
  currentPowers: { level: number; name: string }[];
  onSelectPower: (power: { level: number; name: string }) => void;
}

export default function PowerSelectionDrawer({
  isOpen,
  onClose,
  disciplineId,
  level,
  currentPowers,
  onSelectPower,
}: PowerSelectionDrawerProps) {
  const { t } = useI18n();
  
  if (!isOpen) return null;

  const discipline = disciplineService.getDisciplineById(disciplineId);
  const availablePowers = disciplineService.getPowersForLevel(disciplineId, level);
  
  const isPowerSelected = (powerName: string) => {
    return currentPowers.some(p => p.name === powerName);
  };

  const handleSelect = (power: DisciplinePower) => {
    onSelectPower({ level, name: power.name });
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 400,
        height: "100vh",
        background: "#1a1a2e",
        borderLeft: "1px solid #333",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h3 style={{ margin: 0, color: "#90ee90" }}>
            {discipline?.name || disciplineId}
          </h3>
          <span style={{ color: "#888", fontSize: 12 }}>
            Level {level} Powers
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            fontSize: 24,
            cursor: "pointer",
            padding: "0 8px",
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <p style={{ color: "#aaa", marginBottom: 16, fontSize: 13 }}>
          Select one power for Level {level}. You can change this later.
        </p>

        {availablePowers.length === 0 ? (
          <p style={{ color: "#666" }}>No powers available at this level.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {availablePowers.map((power, idx) => {
              const isSelected = isPowerSelected(power.name);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(power)}
                  disabled={isSelected}
                  style={{
                    background: isSelected ? "#2a4a2a" : "#252540",
                    border: `1px solid ${isSelected ? "#4a8a4a" : "#444"}`,
                    borderRadius: 8,
                    padding: 12,
                    textAlign: "left",
                    cursor: isSelected ? "default" : "pointer",
                    opacity: isSelected ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#90ee90", fontWeight: 600, fontSize: 14 }}>
                      {power.name}
                    </span>
                    {isSelected && (
                      <span style={{ color: "#4a8a4a", fontSize: 12 }}>✓ Selected</span>
                    )}
                  </div>
                  {power.description && (
                    <p style={{ color: "#888", fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
                      {power.description.length > 150
                        ? power.description.substring(0, 150) + "..."
                        : power.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: 16,
          borderTop: "1px solid #333",
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "#333",
            border: "none",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
