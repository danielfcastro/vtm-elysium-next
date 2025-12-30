import fs from "node:fs";
import path from "node:path";
import { Ability } from "../models/Ability";
import { AttributeCategory } from "../models/AttributeCategory";
import { Background } from "../models/Background";
import { Clan } from "../models/Clan";
import { Concept } from "../models/Concept";
import { Discipline } from "../models/Discipline";
import { Flaw } from "../models/Flaw";
import { GenerationData } from "../models/GenerationData";
import { Merit } from "../models/Merit";
import { Nature } from "../models/Nature";
import { Virtue } from "../models/Virtue";
import { NamePack } from "../models/NamePack";

const readJson = <T>(filePath: string): T =>
  JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;

export class GameDataProvider {
  clans: Clan[];
  disciplines: Discipline[];
  attributeCategories: AttributeCategory[];
  concepts: Concept[];
  natures: Nature[];
  abilities: Ability[];
  backgrounds: Background[];
  virtues: Virtue[];
  generations: GenerationData[];
  merits: Merit[];
  flaws: Flaw[];
  namePacks: NamePack[] = [];

  constructor(dataFolderPath: string) {
    this.clans = readJson<Clan[]>(path.join(dataFolderPath, "clans.json"));
    this.disciplines = readJson<Discipline[]>(
      path.join(dataFolderPath, "disciplines.json"),
    );
    this.attributeCategories = readJson<AttributeCategory[]>(
      path.join(dataFolderPath, "attributes.ts"),
    );

    const rawConcepts = readJson<Concept[]>(
      path.join(dataFolderPath, "concepts.json"),
    );
    this.concepts = [...rawConcepts].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const rawNatures = readJson<Nature[]>(
      path.join(dataFolderPath, "natures.json"),
    );
    this.natures = [...rawNatures].sort((a, b) => a.name.localeCompare(b.name));

    this.abilities = readJson<Ability[]>(
      path.join(dataFolderPath, "abilities.json"),
    );
    this.backgrounds = readJson<Background[]>(
      path.join(dataFolderPath, "backgrounds.json"),
    );
    this.virtues =
      readJson<Virtue[]>(path.join(dataFolderPath, "virtues.json")) ?? [];
    this.generations =
      readJson<GenerationData[]>(
        path.join(dataFolderPath, "generations.json"),
      ) ?? [];
    this.merits =
      readJson<Merit[]>(path.join(dataFolderPath, "merits.json")) ?? [];
    this.flaws =
      readJson<Flaw[]>(path.join(dataFolderPath, "flaws.json")) ?? [];

    this.loadNamePacks(dataFolderPath);
  }

  private loadNamePacks(rootDataPath: string) {
    const namesFolderPath = path.join(rootDataPath, "Names");
    if (!fs.existsSync(namesFolderPath)) return;

    const walk = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full);
        else if (ent.isFile() && ent.name.toLowerCase().endsWith(".json")) {
          try {
            const jsonContent = fs.readFileSync(full, "utf-8");
            const pack = JSON.parse(jsonContent) as NamePack;
            if (pack) this.namePacks.push(pack);
          } catch {
            // Ignore invalid JSON files
          }
        }
      }
    };
    walk(namesFolderPath);
  }
}
