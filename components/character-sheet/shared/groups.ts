// Attribute groups for character sheets
export const ATTRIBUTE_GROUPS = [
  {
    id: "physical",
    label: "Physical",
    traits: [
      { id: "strength", label: "Strength" },
      { id: "dexterity", label: "Dexterity" },
      { id: "stamina", label: "Stamina" },
    ],
  },
  {
    id: "social",
    label: "Social",
    traits: [
      { id: "charisma", label: "Charisma" },
      { id: "manipulation", label: "Manipulation" },
      { id: "appearance", label: "Appearance" },
    ],
  },
  {
    id: "mental",
    label: "Mental",
    traits: [
      { id: "perception", label: "Perception" },
      { id: "intelligence", label: "Intelligence" },
      { id: "wits", label: "Wits" },
    ],
  },
];

// Ability groups for character sheets
export const ABILITY_GROUPS = [
  {
    id: "talents",
    label: "Talents",
    traits: [
      { id: "alertness", label: "Alertness" },
      { id: "athletics", label: "Athletics" },
      { id: "awareness", label: "Awareness" },
      { id: "brawl", label: "Brawl" },
      { id: "dodge", label: "Dodge" },
      { id: "empathy", label: "Empathy" },
      { id: "expression", label: "Expression" },
      { id: "intimidation", label: "Intimidation" },
      { id: "leadership", label: "Leadership" },
      { id: "streetwise", label: "Streetwise" },
      { id: "subterfuge", label: "Subterfuge" },
    ],
  },
  {
    id: "skills",
    label: "Skills",
    traits: [
      { id: "animal_ken", label: "Animal Ken" },
      { id: "crafts", label: "Crafts" },
      { id: "drive", label: "Drive" },
      { id: "firearms", label: "Firearms" },
      { id: "melee", label: "Melee" },
      { id: "meditation", label: "Meditation" },
      { id: "perform", label: "Perform" },
      { id: "ride", label: "Ride" },
      { id: "stealth", label: "Stealth" },
      { id: "survival", label: "Survival" },
      { id: "academics", label: "Academics" },
    ],
  },
  {
    id: "knowledges",
    label: "Knowledges",
    traits: [
      { id: "computer", label: "Computer" },
      { id: "finance", label: "Finance" },
      { id: "investigation", label: "Investigation" },
      { id: "law", label: "Law" },
      { id: "medicine", label: "Medicine" },
      { id: "occult", label: "Occult" },
      { id: "politics", label: "Politics" },
      { id: "science", label: "Science" },
      { id: "technology", label: "Technology" },
      { id: "theology", label: "Theology" },
    ],
  },
];

// Get attribute base value (minimum 1, except Nosferatu appearance = 0)
export function getAttributeBase(
  attrId: string,
  clanId: string | null | undefined,
): number {
  const isNosferatu = clanId === "nosferatu";
  const isAppearance = attrId === "appearance";
  if (isNosferatu && isAppearance) return 0;
  return 1;
}

// Format ID to readable label
export function formatIdLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
