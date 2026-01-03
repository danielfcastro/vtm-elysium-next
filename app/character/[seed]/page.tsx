import CharacterSheet from "@/components/character-sheet/CharacterSheet";

export default async function CharacterBySeedPage({
  params,
}: {
  params: { seed: string };
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/character/${params.seed}`,
    {
      // Se sua API for pública, ok. Se exigir auth, você ajusta depois.
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return (
      <div className="p-4">
        <div className="muted">Character not found.</div>
      </div>
    );
  }

  const data = await res.json();

  // O endpoint antigo costuma retornar { seed, character } ou direto um bundle.
  // Passamos o payload inteiro e o CharacterSheet extrai o modelo internamente.
  return (
    <div className="p-4">
      <CharacterSheet mode="readonly" sheet={data} />
    </div>
  );
}
