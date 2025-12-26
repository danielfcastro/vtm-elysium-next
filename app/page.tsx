import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>VTM Character Generator</h1>

      <p>
        <Link href="/generator">Open Generator (automatic)</Link>
      </p>

      <p>
        <Link href="/create">Create Character (manual)</Link>
      </p>
    </main>
  );
}
