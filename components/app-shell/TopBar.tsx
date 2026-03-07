"use client";

import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "@/i18n";

export interface GameOption {
  id: string;
  name: string;
}

export interface Props {
  titleLeft: string;
  games: GameOption[];
  selectedGameId: string;
  onGameChange: (id: string) => void;
  actions?: React.ReactNode;
  userName?: string;
  userEmail?: string;
  onEditProfile?: () => void;
  onLogout?: () => void;
}

export default function TopBar({
  titleLeft,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  games,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  selectedGameId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onGameChange,
  actions,
  userName,
  userEmail,
  onEditProfile,
  onLogout,
}: Props): React.ReactElement {
  const { locale, setLocale, t } = useI18n();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = userName || userEmail || "Usuário";

  return (
    <div className="shellTopInner">
      <div className="shellTopLeft">
        <h1 className="h1" style={{ margin: 0 }}>
          {titleLeft}
        </h1>
      </div>

      <div className="shellTopActions">
        <div ref={langRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            style={{
              padding: "4px 8px",
              background: "transparent",
              border: "1px solid #444",
              borderRadius: 4,
              cursor: "pointer",
              color: "#888",
              fontSize: 14,
            }}
            title={t("common.language") || "Language"}
          >
            🌐
          </button>
          {showLangMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                background: "#222",
                border: "1px solid #444",
                borderRadius: 4,
                overflow: "hidden",
                zIndex: 100,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setLocale("en");
                  setShowLangMenu(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 16px",
                  background: locale === "en" ? "#2a4a2a" : "transparent",
                  color: locale === "en" ? "#90ee90" : "#ccc",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocale("pt");
                  setShowLangMenu(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 16px",
                  background: locale === "pt" ? "#2a4a2a" : "transparent",
                  color: locale === "pt" ? "#90ee90" : "#ccc",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                Português
              </button>
            </div>
          )}
        </div>

        <div ref={userRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              padding: "4px 12px",
              background: "#333",
              border: "1px solid #444",
              borderRadius: 4,
              cursor: "pointer",
              color: "#ccc",
              fontSize: 12,
            }}
          >
            {displayName} ▾
          </button>
          {showUserMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                background: "#222",
                border: "1px solid #444",
                borderRadius: 4,
                overflow: "hidden",
                zIndex: 100,
                minWidth: 160,
              }}
            >
              {onEditProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onEditProfile();
                    setShowUserMenu(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 16px",
                    background: "transparent",
                    color: "#ccc",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 12,
                  }}
                >
                  Editar Perfil
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setShowUserMenu(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 16px",
                    background: "transparent",
                    color: "#ff6b6b",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 12,
                  }}
                >
                  Sair
                </button>
              )}
            </div>
          )}
        </div>

        {actions}
      </div>
    </div>
  );
}
