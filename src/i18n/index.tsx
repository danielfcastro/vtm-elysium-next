"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type Language = "en" | "pt";

interface I18nContextType {
  locale: Language;
  setLocale: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface Translations {
  common: Record<string, string>;
  xp: Record<string, any>;
  categories: Record<string, string>;
  character: Record<string, string>;
  status: Record<string, string>;
  player: Record<string, string>;
  storyteller: Record<string, string>;
}

const translations: Record<Language, Translations> = {
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      confirm: "Confirm",
      delete: "Delete",
      edit: "Edit",
      view: "View",
    },
    xp: {
      spendExperience: "Spend Experience",
      availableXp: "Available XP",
      totalCost: "Total Cost",
      insufficientXp: "Insufficient XP (need {{needed}} more)",
      pendingChanges: "PENDING CHANGES",
      maxTraitRating: "Max trait rating: {{rating}} dots per trait",
      legend: { current: "Current", pending: "Pending" },
    },
    categories: {
      attributes: "Attributes",
      talents: "Talents",
      skills: "Skills",
      knowledges: "Knowledges",
      disciplines: "Disciplines",
      backgrounds: "Backgrounds",
      virtues: "Virtues",
      willpower: "Willpower",
      roadRating: "Road Rating",
    },
    character: {
      create: "Create Character",
      edit: "Edit Character",
      name: "Name",
      concept: "Concept",
      clan: "Clan",
      generation: "Generation",
      sire: "Sire",
    },
    status: {
      draft_phase1: "Draft Phase 1",
      draft_phase2: "Draft Phase 2",
      submitted: "Submitted",
      approved: "Approved",
      rejected: "Rejected",
      archived: "Archived",
      xp: "XP",
    },
    player: {
      myCharacters: "My Characters",
      newCharacter: "New",
      editCharacter: "Edit Character",
      selectCharacter: "Select a character to view the sheet.",
      selectGame: "Select a Game",
      noCharacterSelected: "(No character selected)",
      spendXp: "Spend XP",
      submitForApproval: "Submit for Approval",
      loadingSheet: "Loading sheet...",
      loading: "Loading...",
      auditTrail: "Audit Trail",
      noChangesYet: "No changes yet.",
      noAuditLogs: "No audit logs found.",
      recentChanges: "Recent Changes",
      characterInfo: "Character Info",
      weakness: "Weakness",
    },
    storyteller: {
      title: "Storyteller",
      characters: "Characters",
      addXp: "Add XP",
      meritsFlaws: "M&F",
      selectGame: "Select a Game",
      selectCharacter: "Select a character to view the sheet.",
      loadingSheet: "Loading sheet...",
      auditTrail: "Audit Trail",
      noAuditLogs: "No audit logs found.",
      approve: "Approve",
      reject: "Reject",
      confirmReject: "Confirm Reject",
      rejectionReason: "Rejection reason...",
      status: "Status",
      grantingXp: "Granting...",
      grant: "Grant",
      xpAmount: "XP Amount",
      grantToAll: "Grant the same to all players?",
      allPlayers: "All Players",
      enterPositiveInteger: "Enter positive integer",
      approving: "...",
      rejecting: "...",
    },
  },
  pt: {
    common: {
      save: "Salvar",
      cancel: "Cancelar",
      close: "Fechar",
      loading: "Carregando...",
      error: "Erro",
      success: "Sucesso",
      confirm: "Confirmar",
      delete: "Excluir",
      edit: "Editar",
      view: "Ver",
    },
    xp: {
      spendExperience: "Gastar Experiência",
      availableXp: "XP Disponível",
      totalCost: "Custo Total",
      insufficientXp: "XP insuficiente (precisa de {{needed}} mais)",
      pendingChanges: "ALTERAÇÕES PENDENTES",
      maxTraitRating: "Rating máximo: {{rating}} pontos por traço",
      legend: { current: "Atual", pending: "Pendente" },
    },
    categories: {
      attributes: "Atributos",
      talents: "Talentos",
      skills: "Habilidades",
      knowledges: "Conhecimentos",
      disciplines: "Disciplinas",
      backgrounds: "Backgrounds",
      virtues: "Virtudes",
      willpower: "Força de Vontade",
      roadRating: "Rating do Caminho",
    },
    character: {
      create: "Criar Personagem",
      edit: "Editar Personagem",
      name: "Nome",
      concept: "Conceito",
      clan: "Clã",
      generation: "Geração",
      sire: "Sire",
    },
    status: {
      draft_phase1: "Rascunho Fase 1",
      draft_phase2: "Rascunho Fase 2",
      submitted: "Enviado",
      approved: "Aprovado",
      rejected: "Rejeitado",
      archived: "Arquivado",
      xp: "XP",
    },
    player: {
      myCharacters: "Meus Personagens",
      newCharacter: "Novo",
      editCharacter: "Editar Personagem",
      selectCharacter: "Selecione um personagem para ver a ficha.",
      selectGame: "Selecione uma Crônica",
      noCharacterSelected: "(Nenhum personagem selecionado)",
      spendXp: "Gastar XP",
      submitForApproval: "Enviar para Aprovação",
      loadingSheet: "Carregando ficha...",
      loading: "Carregando...",
      auditTrail: "Histórico de Alterações",
      noChangesYet: "Nenhuma alteração ainda.",
      noAuditLogs: "Nenhum registro encontrado.",
      recentChanges: "Alterações Recentes",
      characterInfo: "Informações do Personagem",
      weakness: "Fraqueza",
    },
    storyteller: {
      title: "Narrador",
      characters: "Personagens",
      addXp: "Adicionar XP",
      meritsFlaws: "M&F",
      selectGame: "Selecione uma Crônica",
      selectCharacter: "Selecione um personagem para ver a ficha.",
      loadingSheet: "Carregando ficha...",
      auditTrail: "Histórico de Alterações",
      noAuditLogs: "Nenhum registro encontrado.",
      approve: "Aprovar",
      reject: "Rejeitar",
      confirmReject: "Confirmar Rejeição",
      rejectionReason: "Motivo da rejeição...",
      status: "Status",
      grantingXp: "Concedendo...",
      grant: "Conceder",
      xpAmount: "Quantidade de XP",
      grantToAll: "Conceder o mesmo para todos os jogadores?",
      allPlayers: "Todos os Jogadores",
      enterPositiveInteger: "Digite um inteiro positivo",
      approving: "...",
      rejecting: "...",
    },
  },
};

const I18nContext = createContext<I18nContextType | null>(null);

const LOCALE_KEY = "vtm_locale";

function getNestedValue(obj: any, path: string): string {
  const keys = path.split(".");
  let result = obj;
  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = result[key];
    } else {
      return path;
    }
  }
  return typeof result === "string" ? result : path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(LOCALE_KEY) as Language | null;
    if (stored && (stored === "en" || stored === "pt")) {
      setLocaleState(stored);
    } else {
      const browserLang = navigator.language.split("-")[0];
      if (browserLang === "pt") {
        setLocaleState("pt");
      }
    }
  }, []);

  const setLocale = (lang: Language) => {
    setLocaleState(lang);
    localStorage.setItem(LOCALE_KEY, lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = getNestedValue(translations[locale], key);

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`{{${paramKey}}}`, "g"), String(value));
      });
    }

    return text;
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: "pt" as Language,
      setLocale: () => {},
      t: (key: string) => key,
    };
  }
  return context;
}
