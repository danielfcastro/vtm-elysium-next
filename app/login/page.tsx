"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type RegisterSuccess = {
  token: string;
  user: { id: string; email: string; name: string };
};

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
  const [showRegister, setShowRegister] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);

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
      window.localStorage.setItem("vtm_user_email", data.user.email);

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

  async function onRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRegError(null);
    setRegSubmitting(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          confirmPassword: regConfirmPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (data && typeof data === "object" && (data as any).error) ||
          "Erro ao cadastrar.";
        throw new Error(String(msg));
      }

      const regData = data as RegisterSuccess;

      window.localStorage.setItem("vtm_token", regData.token);
      window.localStorage.setItem("vtm_user_name", regData.user.name);
      window.localStorage.setItem("vtm_user_email", regData.user.email);

      router.push("/player");
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Cadastro falhou.");
    } finally {
      setRegSubmitting(false);
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

              <p style={{ textAlign: "center", marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setShowRegister(true);
                    setError(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-color)",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Não tem uma conta? Cadastre-se
                </button>
              </p>
            </div>
          </form>
        </div>

        {showRegister && (
          <div
            className="drawer-overlay"
            onClick={() => setShowRegister(false)}
          >
            <div
              className="drawer"
              onClick={(e) => e.stopPropagation()}
              style={{ width: 400 }}
            >
              <div className="drawer-header">
                <h3 className="h3">Criar Conta</h3>
                <button
                  type="button"
                  className="drawer-close"
                  onClick={() => setShowRegister(false)}
                >
                  ×
                </button>
              </div>
              <div className="drawer-body">
                {regError ? (
                  <div
                    style={{
                      border: "1px solid #7a2b2b",
                      background: "rgba(197, 37, 37, 0.10)",
                      borderRadius: 6,
                      padding: "10px 12px",
                      marginBottom: 14,
                    }}
                  >
                    {regError}
                  </div>
                ) : null}

                <form onSubmit={onRegisterSubmit}>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", marginBottom: 6 }}>
                        Nome
                      </label>
                      <input
                        className="textInput"
                        type="text"
                        autoComplete="name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        disabled={regSubmitting}
                        required
                        minLength={2}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: 6 }}>
                        Email
                      </label>
                      <input
                        className="textInput"
                        type="email"
                        autoComplete="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        disabled={regSubmitting}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: 6 }}>
                        Senha
                      </label>
                      <input
                        className="textInput"
                        type="password"
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        disabled={regSubmitting}
                        required
                        minLength={8}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: 6 }}>
                        Confirmar Senha
                      </label>
                      <input
                        className="textInput"
                        type="password"
                        autoComplete="new-password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        disabled={regSubmitting}
                        required
                        minLength={8}
                      />
                    </div>

                    <button
                      className="btn"
                      type="submit"
                      disabled={regSubmitting}
                    >
                      {regSubmitting ? "Cadastrando..." : "Cadastrar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
