"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type LoginSuccess = {
  token: string;
  user: { id: string; email: string; name: string };
};

type MeResponse =
  | {
      user: { id: string; email: string; name: string };
      roles?: string[];
      isStoryteller?: boolean;
    }
  | Record<string, unknown>;

function isLoginSuccess(data: unknown): data is LoginSuccess {
  if (!data || typeof data !== "object") return false;
  const d = data as any;
  return (
    typeof d.token === "string" &&
    d.user &&
    typeof d.user.id === "string" &&
    typeof d.user.email === "string" &&
    typeof d.user.name === "string"
  );
}

function pickRedirectFromMe(me: MeResponse): "/player" | "/storyteller" {
  const roles = Array.isArray((me as any).roles)
    ? ((me as any).roles as any[])
    : [];
  const isStoryteller =
    (me as any).isStoryteller === true ||
    roles.includes("STORYTELLER") ||
    roles.includes("Storyteller");

  return isStoryteller ? "/storyteller" : "/player";
}

export default function LoginPage(): React.ReactElement {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (data && typeof data === "object" && (data as any).error) ||
          "Credenciais inválidas.";
        throw new Error(String(msg));
      }

      if (!isLoginSuccess(data)) {
        throw new Error("Resposta inesperada de /api/login.");
      }

      // Persistência simples do token (podes trocar por cookie httpOnly depois)
      window.localStorage.setItem("vtm_token", data.token);
      window.localStorage.setItem("vtm_user_name", data.user.name);

      // Decide redirect via /api/me (token não contém roles)
      const meRes = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${data.token}` },
      });

      if (!meRes.ok) {
        // fallback seguro caso /api/me ainda não esteja pronto/implementado
        router.push("/player");
        return;
      }

      const me = (await meRes.json().catch(() => ({}))) as MeResponse;
      router.push(pickRedirectFromMe(me));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="sheetPage">
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          paddingTop: 48,
        }}
      >
        <div className="sheetActive">
          <div className="sheetSection" style={{ marginBottom: 16 }}>
            <h2 className="h2">Sign in</h2>
            <p className="muted">Access your games and characters.</p>
          </div>

          {error ? (
            <div
              style={{
                border: "1px solid #7a2b2b",
                background: "rgba(197, 37, 37, 0.10)",
                borderRadius: 6,
                padding: "10px 12px",
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit}>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Email
                </label>
                <input
                  className="textInput"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6 }}>
                  Password
                </label>
                <input
                  className="textInput"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <button className="btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Login"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
