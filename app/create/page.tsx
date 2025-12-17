"use client";

import React, { useState } from "react";
import {
    CharacterDraft,
    createEmptyCharacterDraft,
    draftToCharacter,
} from "@/core/models/CharacterDraft"; // ajuste o caminho se necessário

export default function CreateCharacterPage() {
    // Estado central do formulário de criação
    const [draft, setDraft] = useState<CharacterDraft>(() =>
        createEmptyCharacterDraft(),
    );

    // Helper genérico para updates parciais – será usado nas próximas issues
    function updateDraft(patch: Partial<CharacterDraft>) {
        setDraft((prev) => ({
            ...prev,
            ...patch,
        }));
    }

    // Exemplo de uso futuro do draftToCharacter (M1: só para debug, não precisa usar ainda)
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

                        {/* Debug do estado e da conversão – pode ser removido depois */}
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

                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sheetSection">
                        <h2 className="h2">Ações</h2>
                        <p className="muted">
                            Os botões de salvar, carregar e exportar ficha serão adicionados
                            aqui em issues futuras.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
