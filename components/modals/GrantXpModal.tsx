"use client";

import React, { useEffect, useMemo, useCallback, useState } from "react";
import type { CharacterListItem } from "@/types/app";
import type { GrantXpRequest, GrantXpFormState } from "@/types/xp";
import { buildGrantXpRequest, validateGrantXpRequest } from "@/lib/xp";

export interface GrantXpModalProps {
  open: boolean;
  gameId: string;
  characters: CharacterListItem[];
  onClose: () => void;
  onConfirm: (payload: GrantXpRequest) => Promise<void> | void;
}

const DEFAULT_STATE: Omit<GrantXpFormState, "open"> = {
  sameForAll: true,
  amountForAll: "",
  amountsByCharacterId: {},
  note: "",
  sessionDate: "",
  isSubmitting: false,
  error: null,
};

function toIntOrEmpty(value: string): number | "" {
  if (value.trim() === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return Math.trunc(n);
}

export default function GrantXpModal(props: GrantXpModalProps) {
  const { open, gameId, characters, onClose, onConfirm } = props;

  const [state, setState] = useState<GrantXpFormState>({
    open,
    ...DEFAULT_STATE,
  });

  const characterIds = useMemo(() => characters.map((c) => c.id), [characters]);

  useEffect(() => {
    if (!open) {
      setState((prev) => ({ ...prev, open: false }));
      return;
    }

    const amountsByCharacterId: Record<string, number | ""> = {};
    for (const id of characterIds) amountsByCharacterId[id] = "";

    setState({
      open: true,
      ...DEFAULT_STATE,
      amountsByCharacterId,
    });
  }, [open, gameId, characterIds]);

  const closeIfAllowed = useCallback(() => {
    setState((prev) => {
      if (prev.isSubmitting) return prev;
      return { ...prev, error: null, open: false };
    });
    onClose();
  }, [onClose]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeIfAllowed();
      }
    },
    [closeIfAllowed],
  );

  const setSameForAll = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, sameForAll: value, error: null }));
  }, []);

  const setAmountForAll = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      amountForAll: toIntOrEmpty(value),
      error: null,
    }));
  }, []);

  const setAmountForCharacter = useCallback(
    (characterId: string, value: string) => {
      setState((prev) => ({
        ...prev,
        amountsByCharacterId: {
          ...prev.amountsByCharacterId,
          [characterId]: toIntOrEmpty(value),
        },
        error: null,
      }));
    },
    [],
  );

  const setNote = useCallback((value: string) => {
    setState((prev) => ({ ...prev, note: value, error: null }));
  }, []);

  const setSessionDate = useCallback((value: string) => {
    setState((prev) => ({ ...prev, sessionDate: value, error: null }));
  }, []);

  const submit = useCallback(async () => {
    setState((prev) => ({ ...prev, error: null }));

    const payload = buildGrantXpRequest({
      gameId,
      characters,
      state: {
        sameForAll: state.sameForAll,
        amountForAll: state.amountForAll,
        amountsByCharacterId: state.amountsByCharacterId,
        note: state.note,
        sessionDate: state.sessionDate,
      },
    });

    const validationError = validateGrantXpRequest(payload);
    if (validationError) {
      setState((prev) => ({ ...prev, error: validationError }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));
      await onConfirm(payload);
      closeIfAllowed();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to grant XP. Please try again.";
      setState((prev) => ({ ...prev, error: { message } }));
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [gameId, characters, state, onConfirm, closeIfAllowed]);

  if (!open) return null;

  const disabled = state.isSubmitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onKeyDown={onKeyDown}
    >
      {/* Overlay */}
      <button
        type="button"
        className="absolute inset-0 w-full h-full bg-black/50"
        onClick={closeIfAllowed}
        disabled={disabled}
        aria-label="Close"
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 rounded-xl bg-white shadow-xl">
        <div className="px-6 py-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Grant Experience Points</h2>
              <div className="text-sm text-gray-600">
                Game: <span className="font-mono">{gameId}</span>
              </div>
            </div>

            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              onClick={closeIfAllowed}
              disabled={disabled}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Error */}
          {state.error?.message ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {state.error.message}
            </div>
          ) : null}

          {/* Same for all */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.sameForAll}
              onChange={(e) => setSameForAll(e.target.checked)}
              disabled={disabled}
            />
            <span className="font-medium">Grant all players the same XP?</span>
          </label>

          {/* Note + Session date (optional) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Note (optional)</div>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={state.note}
                onChange={(e) => setNote(e.target.value)}
                disabled={disabled}
                placeholder="e.g., Session 04 milestone"
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Session Date (optional)</div>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={state.sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                disabled={disabled}
                placeholder="e.g., 2026-01-01T21:00:00Z"
              />
            </div>
          </div>

          {/* Amount section */}
          {state.sameForAll ? (
            <div className="space-y-1">
              <div className="text-sm font-medium">XP</div>
              <input
                type="number"
                min={0}
                step={1}
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={
                  state.amountForAll === "" ? "" : String(state.amountForAll)
                }
                onChange={(e) => setAmountForAll(e.target.value)}
                disabled={disabled}
                placeholder="0"
              />
              {state.error?.fieldErrors?.amount ? (
                <div className="text-xs text-red-700">
                  {state.error.fieldErrors.amount}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium">XP per character</div>

              <div className="max-h-72 overflow-auto rounded-md border">
                <div className="divide-y">
                  {characters.map((c, idx) => {
                    const fieldKey = `grants.${idx}.amount`;
                    const fieldError = state.error?.fieldErrors?.[fieldKey];

                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {c.name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono truncate">
                            {c.id}
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className="w-28 rounded-md border px-3 py-2 text-sm text-right"
                            value={
                              state.amountsByCharacterId[c.id] === ""
                                ? ""
                                : String(state.amountsByCharacterId[c.id])
                            }
                            onChange={(e) =>
                              setAmountForCharacter(c.id, e.target.value)
                            }
                            disabled={disabled}
                            placeholder="0"
                          />
                          {fieldError ? (
                            <div className="text-xs text-red-700 mt-1">
                              {fieldError}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {state.error?.fieldErrors?.grants ? (
                <div className="text-xs text-red-700">
                  {state.error.fieldErrors.grants}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            onClick={closeIfAllowed}
            disabled={disabled}
          >
            Cancel
          </button>

          <button
            type="button"
            className="rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-black/90 disabled:opacity-60"
            onClick={submit}
            disabled={disabled}
          >
            {state.isSubmitting ? "Granting..." : "Grant XP"}
          </button>
        </div>
      </div>
    </div>
  );
}
