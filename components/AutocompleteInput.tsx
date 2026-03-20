"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export interface AutocompleteOption {
  id: string;
  name: string;
}

interface AutocompleteInputProps {
  label: string;
  valueId?: string | null;
  onChangeId: (id: string | null) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  query?: string;
  onQueryChange?: (q: string) => void;
}

export function AutocompleteInput({
  label,
  valueId,
  onChangeId,
  options,
  placeholder,
  query: externalQuery,
  onQueryChange,
}: AutocompleteInputProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const query = externalQuery !== undefined ? externalQuery : internalQuery;
  const setQuery =
    onQueryChange !== undefined ? onQueryChange : setInternalQuery;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);

  const selected = useMemo(
    () => options.find((o) => o.id === valueId) ?? null,
    [options, valueId],
  );

  // Quando o valueId externo muda, sincroniza o texto com o nome selecionado
  useEffect(() => {
    setQuery(selected?.name ?? "");
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 20);
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 20);
  }, [options, query]);

  // Fecha dropdown ao clicar fora do componente
  useEffect(() => {
    const handleClickOutside = (evt: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(evt.target as Node)) {
        setIsOpen(false);
        setActiveIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setIsOpen(true);
    setActiveIndex(null);
  }

  function selectOption(opt: AutocompleteOption | null) {
    if (!opt) {
      onChangeId(null);
      setQuery("");
    } else {
      onChangeId(opt.id);
      setQuery(opt.name);
    }
    setIsOpen(false);
    setActiveIndex(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Navegação por setas
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((prev) => {
        if (prev === null) return 0;
        return Math.min(prev + 1, Math.max(filtered.length - 1, 0));
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(filtered.length ? filtered.length - 1 : 0);
        return;
      }
      setActiveIndex((prev) => {
        if (prev === null) return Math.max(filtered.length - 1, 0);
        return Math.max(prev - 1, 0);
      });
      return;
    }

    // Enter ou Tab: confirmar seleção
    if (e.key === "Enter" || e.key === "Tab") {
      // Tenta pegar a opção atualmente destacada ou a primeira filtrada
      let option: AutocompleteOption | null = null;

      if (isOpen) {
        if (activeIndex !== null && filtered[activeIndex]) {
          option = filtered[activeIndex];
        } else if (filtered[0]) {
          option = filtered[0];
        }
      } else {
        // Lista fechada: tenta match exato pelo texto digitado
        const q = query.trim().toLowerCase();
        if (q) {
          option = options.find((o) => o.name.toLowerCase() === q) ?? null;
        }
      }

      if (option) {
        // Para Enter, evita submit do form; para Tab, deixa o foco seguir.
        if (e.key === "Enter") {
          e.preventDefault();
        }
        selectOption(option);
      } else if (e.key === "Enter" && query.trim()) {
        // Enter WITHOUT option -> use current query as a custom value
        e.preventDefault();
        onChangeId(query.trim());
        setIsOpen(false);
        setActiveIndex(null);
      } else if (e.key === "Enter") {
        // Enter with empty query → just close
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(null);
      }

      // Em qualquer caso, não precisamos de mais nada aqui.
      return;
    }

    if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(null);
      return;
    }
  }

  // Opcional: fecha a lista ao perder foco (por Tab ou clique em outro lugar)
  function handleBlur() {
    // Pequeno delay para permitir o onMouseDown dos botões da lista
    setTimeout(() => {
      if (!rootRef.current) return;
      const active = document.activeElement;
      if (!active || !rootRef.current.contains(active)) {
        setIsOpen(false);
        setActiveIndex(null);
      }
    }, 0);
  }

  return (
    <span className="autocompleteRoot" ref={rootRef}>
      {label && <span className="autocompleteLabel">{label}</span>}
      <input
        type="text"
        className="autocompleteInput"
        value={query}
        onChange={handleChange}
        onFocus={() => {
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
      {isOpen && filtered.length > 0 && (
        <span className="autocompleteList">
          {filtered.map((opt, index) => (
            <button
              key={opt.id}
              type="button"
              className={
                "autocompleteItem" +
                (index === activeIndex ? " autocompleteItemActive" : "")
              }
              onMouseDown={(e) => {
                // onMouseDown para evitar blur antes da seleção
                e.preventDefault();
                selectOption(opt);
              }}
            >
              {opt.name}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
