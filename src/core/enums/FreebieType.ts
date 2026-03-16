export const FreebieType = {
  Neophite: 15,
  Ancillae: 15,
  Elder: 15,
  ElderElysium: 20,
  ElderBelladona: 20,
  Human: 21,
} as const;

export type FreebieType = (typeof FreebieType)[keyof typeof FreebieType];
