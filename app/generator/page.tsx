"use client";

import { useEffect, useState } from "react";
import { CharacterSheet } from "@/components/CharacterSheet";

export default function GeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [character, setCharacter] = useState<any | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function generate() {
    try {
      setLoading(true);
      setSeed(null);
      setCharacter(null);

      const res = await fetch("/api/character/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setSeed(String(data.seed));
      setCharacter(data.character);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Generator</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={generate} disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </button>

        {mounted && seed && (
          <a href={`/character/${encodeURIComponent(seed)}`}>Permalink</a>
        )}
      </div>

      {character ? <CharacterSheet seed={seed} character={character} /> : null}
    </main>
  );
}
