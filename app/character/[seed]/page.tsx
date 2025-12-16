import { CharacterSheet } from "@/components/CharacterSheet";

export default async function CharacterBySeedPage({
  params,
}: {
  params: Promise<{ seed: string }>;
}) {
  const { seed } = await params;

  // Chama sua API interna para reproduzir o mesmo seed
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/character/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return (
      <div style={{ padding: 24 }}>
        Failed to generate character for seed {seed}.
      </div>
    );
  }

  const data = await res.json();
  return <CharacterSheet seed={String(data.seed)} character={data.character} />;
}
