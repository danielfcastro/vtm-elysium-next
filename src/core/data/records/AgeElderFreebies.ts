/**
 * Mapeamento de Pontos de Bônus (Freebies) por Faixa Etária
 * Chave: Índice da faixa (0 a 13)
 * Valor: Quantidade de pontos concedidos
 */
export const AGE_FREEBIES: Record<string, number> = {
  "0-50": 45,
  "51-100": 90,
  "101-200": 150,
  "201-350": 225,
  "351-550": 315,
  "551-800": 390,
  "801-1100": 465,
  "1101-1450": 525,
  "1451-1850": 585,
  "1851-2300": 630,
  "2301-2800": 675,
  "2801-3350": 705,
  "3351-3950": 735,
  "3951-5600": 750,
};
