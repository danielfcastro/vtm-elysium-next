"use client";

import React, { useState } from "react";
import {
    CharacterDraft,
    createEmptyCharacterDraft,
    draftToCharacter,
} from "@/core/models/CharacterDraft"; // ajuste o caminho se não usar alias "@/"

function validateName(name: string): string | null {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        return "Name é obrigatório.";
    }
    if (trimmed.length < 2) {
        return "Name deve ter pelo menos 2 caracteres.";
    }
    return null;
}

export default function CreateCharacterPage() {
    // Estado central do formulário de criação
    const [draft, setDraft] = useState<CharacterDraft>(() =>
        createEmptyCharacterDraft(),
    );
    const [nameError, setNameError] = useState<string | null>(null);

    function updateDraft(patch: Partial<CharacterDraft>) {
        setDraft((prev) => ({
            ...prev,
            ...patch,
        }));
    }

    function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        updateDraft({ name: value });
        // opcionalmente poderíamos limpar o erro aqui, mas deixamos para blur/submit
    }

    function handleNameBlur() {
        setNameError(validateName(draft.name));
    }

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const error = validateName(draft.name);
        setNameError(error);

        if (error) {
            // bloqueia o submit se inválido
            return;
        }

        // Issue futura (#8): persistência em localStorage / API
        const character = draftToCharacter(draft);
        console.log("Character pronto para salvar:", character);
    }

    const isNameValid = validateName(draft.name) === null;
    const characterForPreview = draftToCharacter(draft);

    return (
        <div className="sheetPage">
            {/* Header */}
            <div className="header">
                <h1 className="h1">ELYSIUM</h1>
                <p style={{ color: "var(--text-medium)", fontSize: "0.9rem" }}>
                    V20 Character Generator
                </p>
            </div>

            {/* Form engloba conteúdo e sidebar para termos onSubmit consistente */}
            <form onSubmit={handleSubmit}>
                <div className="pageContainer">
                    {/* Conteúdo principal */}
                    <div className="mainContent">
                        <div className="sheetActive">
                            <div className="sheetSection">
                                <h2 className="h2">Criar Ficha</h2>
                                <p className="muted">
                                    Use esta página para criar uma ficha manualmente. Nas próximas
                                    etapas, adicionaremos os campos de Persona, Backgrounds,
                                    Disciplinas e demais seções.
                                </p>
                            </div>

                            {/* SECTION: Persona */}
                            <div className="sheetSection">
                                <h2 className="h2">Persona</h2>
                                <div className="personaGrid">
                                    {/* Campo Name no topo da Persona, ocupando as 2 colunas */}
                                    <div style={{ gridColumn: "span 2" }}>
                                        <label
                                            htmlFor="name"
                                            style={{
                                                display: "block",
                                                fontWeight: 600,
                                                marginBottom: 4,
                                            }}
                                        >
                                            Name
                                        </label>
                                        <input
                                            id="name"
                                            type="text"
                                            value={draft.name}
                                            onChange={handleNameChange}
                                            onBlur={handleNameBlur}
                                            placeholder="Nome do personagem"
                                            style={{
                                                width: "100%",
                                                padding: "0.4rem 0.6rem",
                                                backgroundColor: "var(--medium-bg)",
                                                border: "1px solid var(--border-color)",
                                                borderRadius: 4,
                                                color: "var(--text-light)",
                                            }}
                                        />
                                        {nameError && (
                                            <p
                                                style={{
                                                    color: "#ff6b6b",
                                                    fontSize: "0.8rem",
                                                    marginTop: 4,
                                                }}
                                            >
                                                {nameError}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Debug – ajuda a validar estado e conversão, pode ser removido depois */}
                            <div className="sheetSection">
                                <h3 className="h3">Estado atual do draft (debug)</h3>
                                <pre
                                    style={{
                                        background: "var(--bg-elevated)",
                                        padding: "0.75rem",
                                        borderRadius: "var(--radius-sm)",
                                        fontSize: "0.75rem",
                                        overflowX: "auto",
                                        marginBottom: "1rem",
                                    }}
                                >
                  {JSON.stringify(draft, null, 2)}
                </pre>

                                <h3 className="h3">Character convertido (debug)</h3>
                                <pre
                                    style={{
                                        background: "var(--bg-elevated)",
                                        padding: "0.75rem",
                                        borderRadius: "var(--radius-sm)",
                                        fontSize: "0.75rem",
                                        overflowX: "auto",
                                    }}
                                >
                  {JSON.stringify(characterForPreview, null, 2)}
                </pre>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar com botão de salvar */}
                    <aside className="sidebar">
                        <div className="sheetSection">
                            <h2 className="h2">Ações</h2>
                            <button
                                type="submit"
                                className="btn"
                                disabled={!isNameValid}
                            >
                                Salvar Ficha
                            </button>
                            {!isNameValid && (
                                <p className="muted" style={{ marginTop: "0.5rem" }}>
                                    Informe um Name válido para salvar.
                                </p>
                            )}
                        </div>
                    </aside>
                </div>
            </form>
        </div>
    );
}
