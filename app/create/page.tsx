"use client";

import React, { useState } from "react";
import {
    CharacterDraft,
    createEmptyCharacterDraft,
    draftToCharacter,
} from "@/core/models/CharacterDraft"; // ajuste o caminho se não usar "@/"

/**
 * Validação do campo Name:
 * - obrigatório
 * - mínimo 2 caracteres (ignorando espaços nas pontas)
 */
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
        createEmptyCharacterDraft()
    );

    // Erro específico do campo Name
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
        // se quiser, pode limpar o erro enquanto digita:
        // setNameError(null);
    }

    function handleNameBlur() {
        const error = validateName(draft.name);
        setNameError(error);
    }

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const error = validateName(draft.name);
        setNameError(error);

        if (error) {
            // bloqueia o submit se o Name estiver inválido
            return;
        }

        // Aqui ainda não estamos persistindo (isso é Issue #8),
        // apenas mostrando que o objeto está pronto para salvar
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

            {/* Form engloba conteúdo + sidebar para termos um onSubmit único */}
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

                            {/* ======== SECTION: Persona ======== */}
                            <div className="sheetSection">
                                <h2 className="h2">Persona</h2>

                                {/* se você já tiver uma classe .personaGrid no CSS, use aqui */}
                                <div className="personaGrid">
                                    {/* Campo Name deve ficar no topo da seção Persona.
                      Usamos gridColumn: "span 2" para ocupar a linha inteira. */}
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

                                    {/* Os outros campos de Persona (Concept, Clan, etc.)
                      serão adicionados nas próximas issues. */}
                                </div>
                            </div>

                            {/* Debug – ajuda a validar estado e conversão; pode ser removido depois */}
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
                                    Informe um Name válido (mín. 2 caracteres) para salvar.
                                </p>
                            )}
                        </div>
                    </aside>
                </div>
            </form>
        </div>
    );
}
