"use client";

import React from "react";

/**
 * Página de criação manual de ficha
 * M1 – apenas layout/base e placeholder de conteúdo.
 */
export default function CreateCharacterPage() {
    return (
        <div className="sheetPage">
            {/* Header (mesmo visual do CharacterSheet) */}
            <div className="header">
                <h1 className="h1">ELYSIUM</h1>
                <p style={{ color: "var(--text-medium)", fontSize: "0.9rem" }}>
                    V20 Character Generator
                </p>
            </div>

            <div className="pageContainer">
                {/* Conteúdo principal da ficha */}
                <div className="mainContent">
                    <div className="sheetActive">
                        {/* M1: apenas “shell” da página.
                Nas próximas issues, vamos preencher com o formulário. */}
                        <div className="sheetSection">
                            <h2 className="h2">Criar Ficha</h2>
                            <p className="muted">
                                Use esta página para criar uma ficha manualmente. Nas próximas etapas,
                                adicionaremos os campos de Persona, Backgrounds, Disciplinas e demais
                                seções.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sidebar (reservada para ações como salvar/exportar) */}
                <aside className="sidebar">
                    <div className="sheetSection">
                        <h2 className="h2">Ações</h2>
                        <p className="muted">
                            Os botões de salvar, carregar e exportar ficha serão adicionados aqui em
                            issues futuras.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
