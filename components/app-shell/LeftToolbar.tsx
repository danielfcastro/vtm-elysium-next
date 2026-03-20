import type { CharacterListItem } from "@/types/app";
import type { ReactNode } from "react";
import { useState, useRef, useEffect, useMemo } from "react";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  characterId: string | null;
  isGhoul: boolean;
}

export default function LeftToolbar(props: {
  title: string;
  items: CharacterListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabledIds?: string[];
  headerAction?: ReactNode;
  compact?: boolean;
  renderActions?: (item: CharacterListItem) => ReactNode;
  renderRowActions?: (item: CharacterListItem) => ReactNode;
  onCreateGhoul?: (domitorId: string, ghoulType: "human" | "animal") => void;
}): React.ReactElement {
  const {
    title,
    items,
    selectedId,
    onSelect,
    disabledIds,
    headerAction,
    compact,
    renderActions,
    renderRowActions,
    onCreateGhoul,
  } = props;
  console.log("[DEBUG SC] LeftToolbar received items:", items.length);
  if (items.length > 0) {
    console.log("[DEBUG SC] First item in toolbar:", items[0]);
  }
  const disabled = new Set(disabledIds ?? []);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    characterId: null,
    isGhoul: false,
  });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Group items: domitors first, then ghouls grouped under their domitors
  const groupedItems = useMemo(() => {
    const domitors = items.filter((c) => !c.isGhoul);
    const ghouls = items.filter((c) => c.isGhoul);

    const result: (CharacterListItem & {
      isGroupHeader?: boolean;
      children?: CharacterListItem[];
    })[] = [];

    // Sort domitors alphabetically
    domitors.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    for (const domitor of domitors) {
      result.push(domitor);

      // Find ghouls for this domitor
      const domitorGhouls = ghouls
        .filter((g) => g.domitorId === domitor.id)
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

      for (const ghoul of domitorGhouls) {
        result.push(ghoul);
      }
    }

    // Bug #3: Show ghouls that weren't grouped (no domitor or domitor not in list)
    const groupedIds = new Set(result.map((i) => i.id));
    const independentGhouls = ghouls
      .filter((g) => !groupedIds.has(g.id))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    for (const ghoul of independentGhouls) {
      result.push(ghoul);
    }

    return result;
  }, [items]);

  // Close context menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    }

    if (contextMenu.visible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [contextMenu.visible]);

  function handleContextMenu(e: React.MouseEvent, item: CharacterListItem) {
    e.preventDefault();
    // Only show context menu for domitors (vampires), not ghouls
    if (!item.isGhoul) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        characterId: item.id,
        isGhoul: item.isGhoul ?? false,
      });
    }
  }

  function handleCreateGhoul(ghoulType: "human" | "animal") {
    if (contextMenu.characterId && onCreateGhoul) {
      onCreateGhoul(contextMenu.characterId, ghoulType);
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }

  return (
    <div>
      <div className="h3" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {headerAction && <div style={{ marginBottom: 12 }}>{headerAction}</div>}

      <div className={compact ? "toolbarGridCompact" : "toolbarGrid"}>
        {groupedItems.map((c) => {
          const isDisabled = disabled.has(c.id);
          const isSelected = c.id === selectedId;
          const isArchived = c.statusId === 6;
          const isClickable = !isDisabled;
          const isGhoulItem = c.isGhoul ?? false;

          return (
            <div
              key={c.id}
              className="toolbarItemWrapper"
              style={{ display: "flex", gap: 4 }}
            >
              {renderRowActions && (
                <div className="toolbarActions">{renderRowActions(c)}</div>
              )}
              <button
                type="button"
                className={[
                  "toolbarItem",
                  isSelected ? "toolbarItemActive" : "",
                  isDisabled ? "toolbarItemDisabled" : "",
                  compact ? "toolbarItemCompact" : "",
                  isArchived ? "toolbarItemArchived" : "",
                  isGhoulItem ? "toolbarItemGhoul" : "",
                ].join(" ")}
                onClick={() => isClickable && onSelect(c.id)}
                onContextMenu={(e) => handleContextMenu(e, c)}
                disabled={!isClickable}
                style={{
                  ...(isArchived ? { color: "#888", opacity: 0.7 } : {}),
                }}
              >
                <div className="toolbarItemName" title={c.name}>
                  {c.name}
                </div>
                {!compact && <div className="muted toolbarItemId">{c.id}</div>}
              </button>
              {renderActions && (
                <div className="toolbarActions">{renderActions(c)}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="contextMenu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000,
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 4,
            padding: "4px 0",
            minWidth: 150,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          <button
            type="button"
            onClick={() => handleCreateGhoul("human")}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 16px",
              textAlign: "left",
              backgroundColor: "transparent",
              border: "none",
              color: "#e0e0e0",
              cursor: "pointer",
              fontSize: 14,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2a2a2a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Create Human Ghoul
          </button>
          <button
            type="button"
            onClick={() => handleCreateGhoul("animal")}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 16px",
              textAlign: "left",
              backgroundColor: "transparent",
              border: "none",
              color: "#e0e0e0",
              cursor: "pointer",
              fontSize: 14,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2a2a2a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Create Animal Ghoul
          </button>
        </div>
      )}
    </div>
  );
}
