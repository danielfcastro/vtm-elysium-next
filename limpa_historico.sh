#!/bin/bash

# Número da última entrada que você quer MANTER (inclusive)
ULTIMA_A_MANTER=439

# Arquivo de histórico do bash (padrão na maioria das distros)
HISTFILE="${HISTFILE:-$HOME/.bash_history}"

# Verifica se o arquivo existe
if [[ ! -f "$HISTFILE" ]]; then
    echo "Arquivo de histórico não encontrado: $HISTFILE"
    exit 1
fi

# Faz um backup automático com data e hora
cp "$HISTFILE" "${HISTFILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "Backup criado em: ${HISTFILE}.backup.*"

# Mantém apenas as primeiras N linhas (comandos 1 a 439)
head -n "$ULTIMA_A_MANTER" "$HISTFILE" > "${HISTFILE}.tmp"

# Substitui o arquivo original
mv "${HISTFILE}.tmp" "$HISTFILE"

# Atualiza o histórico da sessão atual (importante!)
history -c                  # limpa o histórico em memória
history -r "$HISTFILE"     # recarrega do arquivo (agora só com 1-439)

echo "Histórico limpo com sucesso!"
echo "Agora contém apenas os comandos de 1 até $ULTIMA_A_MANTER."
echo "Total de comandos restantes: $(wc -l < "$HISTFILE")"
