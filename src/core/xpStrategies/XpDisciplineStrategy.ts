import { BaseXpStrategy } from "./BaseXpStrategy";
import { TraitType } from "../enums/TraitType";
import { GameDataProvider } from "../data/GameDataProvider";
import { ITraitCostStrategy } from "../strategies/ITraitCostStrategy";
import { AffinityProcessorService } from "../affinity/AffinityProcessorService";
import { Character } from "../models/Character";
import { Rng } from "../utils/rng";

export class XpDisciplineStrategy extends BaseXpStrategy {
  type = TraitType.Discipline;
  minRequiredXp = 4;

  private readonly bloodMagicIds = new Set(["thaumaturgy", "necromancy"]);
  private readonly rareDisciplines = new Set([
    "chimerstry",
    "dementation",
    "necromancy",
    "obtenebration",
    "serpentis",
    "thaumaturgy",
    "vicissitude",
  ]);

  constructor(
    private readonly data: GameDataProvider,
    private readonly cost: ITraitCostStrategy,
    private readonly affinity: AffinityProcessorService,
    private readonly rng: Rng,
  ) {
    super();
  }

  trySpendXp(
    character: Character,
    affinityProfile: Record<string, number>,
    budget: number,
    spentXp: { value: number },
  ): boolean {
    const upgradeCandidates: any[] = [];
    const newCandidates: any[] = [];

    for (const disc of this.data.disciplines) {
      const id = disc.id;
      const current = character.disciplines[id] ?? 0;
      const isClan =
        !!character.clan && (character.clan.disciplines ?? []).includes(id);

      if (current > 0) {
        if (current >= character.maxTraitRating) continue;
        const est = this.cost.getCost(TraitType.Discipline, current, isClan);
        if (est <= budget) upgradeCandidates.push(disc);
      } else {
        const est = this.cost.getCost(TraitType.Discipline, 0, isClan);
        if (est <= budget) {
          if (this.rareDisciplines.has(id) && !isClan) {
            if (this.rng.next() > 0.2) continue;
          }
          newCandidates.push(disc);
        }
      }
    }

    let preferUpgrade = false;
    if (upgradeCandidates.length && newCandidates.length)
      preferUpgrade = this.rng.next() < 0.85;
    else if (upgradeCandidates.length) preferUpgrade = true;
    else if (newCandidates.length) preferUpgrade = false;
    else {
      this._isAvailable = false;
      return false;
    }

    const selected = preferUpgrade
      ? this.affinity.getWeightedRandom(
          upgradeCandidates as any,
          affinityProfile,
        )
      : this.affinity.getWeightedRandom(newCandidates as any, affinityProfile);

    if (!selected) return false;

    const isClan =
      !!character.clan &&
      (character.clan.disciplines ?? []).includes((selected as any).id);
    const id = (selected as any).id;

    if (this.bloodMagicIds.has(id)) {
      return this.handleBloodMagic(character, id, isClan, budget, spentXp);
    }
    return this.handleStandard(character, id, isClan, budget, spentXp);
  }

  private handleStandard(
    character: Character,
    id: string,
    isClan: boolean,
    budget: number,
    spentXp: { value: number },
  ) {
    const current = character.disciplines[id] ?? 0;
    const cost = this.cost.getCost(TraitType.Discipline, current, isClan);
    if (cost > budget) return false;
    if (current >= character.maxTraitRating) return false;

    character.disciplines[id] = current + 1;
    spentXp.value += cost;
    this.recordSpendEvent(character, id, cost, current, current + 1);
    character.debugLog.push(
      `[XP] Increased Discipline ${id} to ${character.disciplines[id]} (Cost: ${cost})`,
    );
    return true;
  }

  private handleBloodMagic(
    character: Character,
    primaryId: string,
    isClan: boolean,
    budget: number,
    spentXp: { value: number },
  ) {
    const primaryRating = character.disciplines[primaryId] ?? 0;

    if (primaryRating === 0) {
      const newCost = this.cost.getCost(TraitType.Discipline, 0, isClan);
      if (newCost > budget) return false;
      character.disciplines[primaryId] = 1;
      spentXp.value += newCost;
      this.recordSpendEvent(character, primaryId, newCost, 0, 1);
      character.debugLog.push(
        `[XP] Learned ${primaryId} (1) (Cost: ${newCost})`,
      );
      return true;
    }

    const secondaries = Object.keys(character.disciplines).filter((k) =>
      k.startsWith(`${primaryId} (`),
    );
    const chances: Record<number, number> = {};

    if (secondaries.length === 0) {
      if (primaryRating === 1) {
        chances[0] = 100;
        chances[2] = 0;
      } else if (primaryRating === 2) {
        chances[0] = 95;
        chances[2] = 5;
      } else if (primaryRating === 3) {
        chances[0] = 85;
        chances[2] = 15;
      } else if (primaryRating === 4) {
        chances[0] = 60;
        chances[2] = 40;
      } else {
        chances[0] = 25;
        chances[2] = 75;
      }
    } else {
      if (primaryRating === 2) {
        chances[0] = 95;
        chances[1] = 4;
        chances[2] = 1;
      } else if (primaryRating === 3) {
        chances[0] = 60;
        chances[1] = 30;
        chances[2] = 10;
      } else if (primaryRating === 4) {
        chances[0] = 50;
        chances[1] = 35;
        chances[2] = 15;
      } else {
        chances[0] = 20;
        chances[1] = 60;
        chances[2] = 20;
      }
    }

    let available = Object.keys(chances)
      .map((k) => Number(k))
      .filter((k) => chances[k] > 0);

    while (available.length) {
      const total = available.reduce((s, a) => s + chances[a], 0);
      let roll = this.rng.int(0, total);
      let selectedAction = available[available.length - 1];

      for (const action of available) {
        if (roll < chances[action]) {
          selectedAction = action;
          break;
        }
        roll -= chances[action];
      }

      let ok = false;
      if (selectedAction === 0)
        ok = this.tryUpgradePrimary(
          character,
          primaryId,
          isClan,
          budget,
          spentXp,
        );
      else if (selectedAction === 1)
        ok = this.tryUpgradeSecondary(
          character,
          secondaries,
          primaryRating,
          budget,
          spentXp,
        );
      else if (selectedAction === 2)
        ok = this.tryBuyNewPath(
          character,
          primaryId,
          secondaries,
          primaryRating,
          budget,
          spentXp,
        );

      if (ok) return true;
      available = available.filter((a) => a !== selectedAction);
    }
    return false;
  }

  private tryUpgradePrimary(
    character: Character,
    id: string,
    isClan: boolean,
    budget: number,
    spentXp: { value: number },
  ) {
    const current = character.disciplines[id] ?? 0;
    if (current >= character.maxTraitRating) return false;
    const cost = this.cost.getCost(TraitType.Discipline, current, isClan);
    if (cost > budget) return false;

    character.disciplines[id] = current + 1;
    spentXp.value += cost;
    this.recordSpendEvent(character, id, cost, current, current + 1);
    character.debugLog.push(
      `[XP] Upgraded Primary ${id} to ${character.disciplines[id]} (Cost: ${cost})`,
    );

    if (character.disciplines[id] > 5) this.applyHighLevelBonus(character, id);
    return true;
  }

  private tryUpgradeSecondary(
    character: Character,
    secondaries: string[],
    primaryRating: number,
    budget: number,
    spentXp: { value: number },
  ) {
    if (!secondaries.length) return false;
    const shuffled = [...secondaries].sort(() => this.rng.next() - 0.5);

    for (const secId of shuffled) {
      const current = character.disciplines[secId] ?? 0;
      if (current >= primaryRating) continue;
      if (current >= 5) continue;

      const cost = this.cost.getCost(
        TraitType.Discipline,
        current,
        false,
        true,
      );
      if (cost <= budget) {
        character.disciplines[secId] = current + 1;
        spentXp.value += cost;
        this.recordSpendEvent(character, secId, cost, current, current + 1);
        character.debugLog.push(
          `[XP] Upgraded Secondary ${secId} to ${character.disciplines[secId]} (Cost: ${cost})`,
        );
        return true;
      }
    }
    return false;
  }

  private tryBuyNewPath(
    character: Character,
    primaryId: string,
    _secondaries: string[],
    primaryRating: number,
    budget: number,
    spentXp: { value: number },
  ) {
    if (primaryRating <= 1) return false;
    const cost = this.cost.getCost(TraitType.Discipline, 0, false, true);
    if (cost > budget) return false;

    let index = 2;
    while (character.disciplines[`${primaryId} (${index})`] !== undefined)
      index++;
    const newName = `${primaryId} (${index})`;

    character.disciplines[newName] = 1;
    spentXp.value += cost;
    this.recordSpendEvent(character, newName, cost, 0, 1);
    character.debugLog.push(
      `[XP] Acquired New Path ${newName} (Cost: ${cost})`,
    );
    return true;
  }

  private recordSpendEvent(
    character: any,
    traitId: string,
    cost: number,
    before: number,
    after: number,
  ) {
    const cAny = character as any;
    if (!Array.isArray(cAny.spendEvents)) cAny.spendEvents = [];
    cAny.spendEvents.push({
      source: "xp",
      type: TraitType.Discipline,
      traitId,
      delta: 1,
      cost,
      before,
      after,
    });
    character.debugLog.push(
      `[Spend][XP] ${TraitType.Discipline}: '${traitId}' (+1 dot) - Cost: ${cost} (${before} -> ${after})`,
    );
  }

  private applyHighLevelBonus(character: Character, primaryId: string) {
    const secondaries = Object.keys(character.disciplines).filter((k) =>
      k.startsWith(`${primaryId} (`),
    );
    const valid = secondaries.filter(
      (s) => (character.disciplines[s] ?? 0) < 5,
    );

    if (valid.length) {
      const target = valid[this.rng.int(0, valid.length)];
      character.disciplines[target] = (character.disciplines[target] ?? 0) + 1;
      character.debugLog.push(
        `[Bonus] ${target} increased freely due to Master Level mastery.`,
      );
    } else {
      let index = 2;
      while (character.disciplines[`${primaryId} (${index})`] !== undefined)
        index++;
      const newName = `${primaryId} (${index})`;
      character.disciplines[newName] = 1;
      character.debugLog.push(
        `[Bonus] ${newName} unlocked freely due to Master Level mastery.`,
      );
    }
  }
}
