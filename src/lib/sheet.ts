// src/lib/sheet.ts
export function buildZeroSheet(params?: {
  templateKey?: string;
  isDarkAges?: boolean;
}) {
  const templateKey = params?.templateKey ?? "neophyte";
  const isDarkAges = params?.isDarkAges ?? false;

  const draft = {
    name: "",
    conceptId: null,
    clanId: null,
    natureId: null,
    demeanorId: null,

    // No seu JSON, atributos/abilities/etc aparecem apenas com os que foram alterados.
    // Você pode iniciar vazio e o front assume base 1, ou inicializar com base explícita.
    attributes: {},
    abilities: {},
    backgrounds: {},
    disciplines: {},
    virtues: {},

    generation: null,

    // derivados – pode começar null/0 e ser recalculado no front,
    // ou iniciar com defaults se o front precisa.
    maxTraitRating: 5,
    maximumBloodPool: 0,
    bloodPointsPerTurn: 1,

    willpower: 1,
    road: null,
    roadRating: null,

    player: "",
    chronicle: "",
    sire: "",

    sheetPhase: "CREATION",
    debugLog: [],
  };

  return {
    templateKey,
    isDarkAges,
    phase: 1,
    draft,

    disciplineRows: [],
    backgroundRows: [],

    phase1DraftSnapshot: null,
    phase1DisciplineRowsSnapshot: null,
    phase1BackgroundRowsSnapshot: null,
  };
}
