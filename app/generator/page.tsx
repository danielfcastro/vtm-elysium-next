"use client";

import { useEffect, useState } from "react";
import CharacterSheet from "@/components/character-sheet/CharacterSheet";

export default function GeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [payload, setPayload] = useState<any | null>(null);

  useEffect(() => {
    // mantemos compatibilidade com o que você já tinha: se seed/payload vierem do seu fluxo, ok
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setPayload(null);

    try {
      const res = await fetch("/api/generator", { method: "POST" });
      if (!res.ok) return;

      const data = await res.json();
      setSeed(data?.seed ?? null);
      setPayload(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4">
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button className="btn" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </button>
        <div className="muted">Seed: {seed ?? "-"}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        {payload ? <CharacterSheet mode="readonly" sheet={payload} /> : null}
      </div>
    </main>
  );
}
