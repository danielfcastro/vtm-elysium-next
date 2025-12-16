import path from "node:path";
import { seedFromString, mulberry32 } from "../src/core/utils/rng";
import { GameDataProvider } from "../src/core/data/GameDataProvider";
import { AffinityProcessorService } from "../src/core/affinity/AffinityProcessorService";
import { PersonaService } from "../src/core/services/PersonaService";

test("loads data and can complete persona", () => {
  const dataPath = path.join(process.cwd(), "src", "core", "data", "raw");
  const data = new GameDataProvider(dataPath);
  const rng = mulberry32(seedFromString("test"));
  const affinity = new AffinityProcessorService(rng);
  const personaService = new PersonaService(data, affinity);

  const p = personaService.completePersona({});
  expect(p.clan).toBeTruthy();
  expect(p.concept).toBeTruthy();
  expect(p.nature).toBeTruthy();
});
