import { TraitType } from "../enums/TraitType";
import { FreebiePointCostStrategy } from "../strategies/FreebiePointCostStrategy";

export type Priority = "primary" | "secondary" | "tertiary";

export interface CreationPrioritySelection {
  attributes: Record<string, Priority>; // e.g. { physical: "primary", social: "secondary", mental: "tertiary" }
  abilities: Record<string, Priority>; // same structure
}

export interface CreationStartingAllocations {
  attributes: Record<Priority, number>; // V20 default: 7/5/3
  abilities: Record<Priority, number>; // V20 default: 13/9/5
  virtues: number; // V20 default: 7
}

export interface CreationDotBaselines {
  attributeBase: (attrKey: string, clan?: string | null) => number; // usually 1; Nosferatu Appearance = 0
  abilityBase: (_abilityKey: string) => number; // usually 0
  virtueBase: (_virtueKey: string) => number; // usually 1
}

export interface CreationPools {
  startingRemaining: number;
  freebieRemaining: number;
  startingSpent: number;
  freebieSpent: number;

  // optional breakdown (useful for UI):
  startingRemainingByBucket: {
    attributes: Record<Priority, number>;
    abilities: Record<Priority, number>;
    virtues: number;
  };
}

export interface CreationLedgerInput {
  clan?: string | null;

  // current ratings
  attributes: Record<string, number>;
  abilities: Record<string, number>;
  virtues: Record<string, number>;

  // priority choices (your UI must already store these somewhere)
  priorities: CreationPrioritySelection;

  allocations: CreationStartingAllocations;

  baselines: CreationDotBaselines;

  freebieTotal: number; // e.g. 15
}

const freebie = new FreebiePointCostStrategy();

function clampNonNegative(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function sum(obj: Record<string, number>) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

function computeAddedDots(
  ratings: Record<string, number>,
  baseFn: (k: string) => number,
) {
  const addedByKey: Record<string, number> = {};
  for (const [k, rating] of Object.entries(ratings)) {
    const base = baseFn(k);
    addedByKey[k] = clampNonNegative(rating - base);
  }
  return addedByKey;
}

function bucketAddedDots(
  addedByKey: Record<string, number>,
  bucketByKey: Record<string, Priority>,
) {
  const byBucket: Record<Priority, number> = {
    primary: 0,
    secondary: 0,
    tertiary: 0,
  };

  for (const [key, added] of Object.entries(addedByKey)) {
    const bucket = bucketByKey[key];
    if (!bucket) continue; // ignore keys not assigned yet
    byBucket[bucket] += added;
  }

  return byBucket;
}

/**
 * Core rule enforcement:
 * - Starting points cover dots up to allocation per bucket.
 * - Any dots beyond allocation become "overflow" and would require freebies.
 * - BUT overflow is only allowed if *all* starting points (attrs+abilities+virtues) are exhausted.
 */
export function computeCreationPools(
  input: CreationLedgerInput,
): CreationPools {
  const {
    clan,
    attributes,
    abilities,
    virtues,
    priorities,
    allocations,
    baselines,
    freebieTotal,
  } = input;

  // Added dots above baseline:
  const addedAttrByKey = computeAddedDots(attributes, (k) =>
    baselines.attributeBase(k, clan),
  );
  const addedAbilByKey = computeAddedDots(abilities, baselines.abilityBase);
  const addedVirtByKey = computeAddedDots(virtues, baselines.virtueBase);

  // Bucket them by priority (primary/secondary/tertiary):
  const addedAttrByBucket = bucketAddedDots(
    addedAttrByKey,
    priorities.attributes,
  );
  const addedAbilByBucket = bucketAddedDots(
    addedAbilByKey,
    priorities.abilities,
  );

  // Virtues have a single pool in classic V20 creation:
  const addedVirtTotal = sum(addedVirtByKey);

  // Starting covers up to allocation; overflow requires freebies:
  const attrOverflow: Record<Priority, number> = {
    primary: Math.max(
      0,
      addedAttrByBucket.primary - allocations.attributes.primary,
    ),
    secondary: Math.max(
      0,
      addedAttrByBucket.secondary - allocations.attributes.secondary,
    ),
    tertiary: Math.max(
      0,
      addedAttrByBucket.tertiary - allocations.attributes.tertiary,
    ),
  };

  const abilOverflow: Record<Priority, number> = {
    primary: Math.max(
      0,
      addedAbilByBucket.primary - allocations.abilities.primary,
    ),
    secondary: Math.max(
      0,
      addedAbilByBucket.secondary - allocations.abilities.secondary,
    ),
    tertiary: Math.max(
      0,
      addedAbilByBucket.tertiary - allocations.abilities.tertiary,
    ),
  };

  const virtOverflow = Math.max(0, addedVirtTotal - allocations.virtues);

  // Starting spent is capped at allocation:
  const attrStartingSpentByBucket: Record<Priority, number> = {
    primary: Math.min(
      addedAttrByBucket.primary,
      allocations.attributes.primary,
    ),
    secondary: Math.min(
      addedAttrByBucket.secondary,
      allocations.attributes.secondary,
    ),
    tertiary: Math.min(
      addedAttrByBucket.tertiary,
      allocations.attributes.tertiary,
    ),
  };

  const abilStartingSpentByBucket: Record<Priority, number> = {
    primary: Math.min(addedAbilByBucket.primary, allocations.abilities.primary),
    secondary: Math.min(
      addedAbilByBucket.secondary,
      allocations.abilities.secondary,
    ),
    tertiary: Math.min(
      addedAbilByBucket.tertiary,
      allocations.abilities.tertiary,
    ),
  };

  const virtueStartingSpent = Math.min(addedVirtTotal, allocations.virtues);

  const startingSpent =
    attrStartingSpentByBucket.primary +
    attrStartingSpentByBucket.secondary +
    attrStartingSpentByBucket.tertiary +
    abilStartingSpentByBucket.primary +
    abilStartingSpentByBucket.secondary +
    abilStartingSpentByBucket.tertiary +
    virtueStartingSpent;

  const startingAllocatedTotal =
    allocations.attributes.primary +
    allocations.attributes.secondary +
    allocations.attributes.tertiary +
    allocations.abilities.primary +
    allocations.abilities.secondary +
    allocations.abilities.tertiary +
    allocations.virtues;

  const startingRemaining = Math.max(0, startingAllocatedTotal - startingSpent);

  // Freebie spend calculation by overflow dots * strategy cost per dot:
  // (We only compute “required freebies”; we will separately block if startingRemaining > 0.)
  const freebieRequired =
    (attrOverflow.primary + attrOverflow.secondary + attrOverflow.tertiary) *
      freebie.getCost(TraitType.Attribute) +
    (abilOverflow.primary + abilOverflow.secondary + abilOverflow.tertiary) *
      freebie.getCost(TraitType.Ability) +
    virtOverflow * freebie.getCost(TraitType.Virtue);

  const freebieSpent = freebieRequired;
  const freebieRemaining = Math.max(0, freebieTotal - freebieSpent);

  return {
    startingRemaining,
    freebieRemaining,
    startingSpent,
    freebieSpent,
    startingRemainingByBucket: {
      attributes: {
        primary: Math.max(
          0,
          allocations.attributes.primary - attrStartingSpentByBucket.primary,
        ),
        secondary: Math.max(
          0,
          allocations.attributes.secondary -
            attrStartingSpentByBucket.secondary,
        ),
        tertiary: Math.max(
          0,
          allocations.attributes.tertiary - attrStartingSpentByBucket.tertiary,
        ),
      },
      abilities: {
        primary: Math.max(
          0,
          allocations.abilities.primary - abilStartingSpentByBucket.primary,
        ),
        secondary: Math.max(
          0,
          allocations.abilities.secondary - abilStartingSpentByBucket.secondary,
        ),
        tertiary: Math.max(
          0,
          allocations.abilities.tertiary - abilStartingSpentByBucket.tertiary,
        ),
      },
      virtues: Math.max(0, allocations.virtues - virtueStartingSpent),
    },
  };
}

/**
 * “Gate” function:
 * - If the new state would require freebies but startingRemaining > 0, reject the change.
 * - Also reject if required freebies exceed available freebies.
 */
export function validateCreationSpend(
  input: CreationLedgerInput,
):
  | { ok: true; pools: CreationPools }
  | { ok: false; reason: string; pools: CreationPools } {
  const pools = computeCreationPools(input);

  const requiredFreebies = input.freebieTotal - pools.freebieRemaining;

  // If we are using *any* freebies while starting points remain, block:
  if (requiredFreebies > 0 && pools.startingRemaining > 0) {
    return {
      ok: false,
      reason: "You must spend all Starting Points before using Freebie Points.",
      pools,
    };
  }

  if (pools.freebieRemaining < 0) {
    return {
      ok: false,
      reason: "Not enough Freebie Points.",
      pools,
    };
  }

  return { ok: true, pools };
}
