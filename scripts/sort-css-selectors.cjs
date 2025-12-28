const fs = require("node:fs/promises");
const fg = require("fast-glob");
const postcss = require("postcss");

function sortScope(container) {
  if (!container.nodes || container.nodes.length === 0) return;

  // Primeiro: processa recursivamente @media/@supports etc.
  for (const node of container.nodes) {
    if (node.type === "atrule" && node.nodes) {
      sortScope(node);
    }
  }

  // Pega só rules (seletores) nesse escopo
  const rules = container.nodes.filter((n) => n.type === "rule");
  if (rules.length < 2) return;

  // Ordena alfabeticamente por selector (case-insensitive)
  const sorted = [...rules].sort((a, b) => {
    const sa = (a.selector || "").toLowerCase();
    const sb = (b.selector || "").toLowerCase();
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return 0;
  });

  // Recoloca rules ordenadas somente nas "posições" onde havia rules,
  // preservando at-rules e outros nós no lugar.
  let idx = 0;
  container.nodes = container.nodes.map((n) =>
    n.type === "rule" ? sorted[idx++] : n,
  );
}

async function main() {
  const patterns = process.argv.slice(2);
  const files = await fg(patterns.length ? patterns : ["**/*.css"], {
    ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**"],
    onlyFiles: true,
  });

  if (files.length === 0) {
    console.error("Nenhum arquivo CSS encontrado para os patterns informados.");
    process.exit(1);
  }

  let changed = 0;

  for (const file of files) {
    const inputBuffer = await fs.readFile(file, "utf8");
    const input = String(inputBuffer);
    const root = postcss.parse(input, { from: file });

    sortScope(root);

    const output = root.toString();
    if (output !== input) {
      await fs.writeFile(file, output, "utf8");
      changed++;
    }
  }

  console.log(
    `OK. Arquivos analisados: ${files.length}. Arquivos alterados: ${changed}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
