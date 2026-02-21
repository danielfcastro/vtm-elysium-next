import type { CharacterListItem } from "@/types/app";
import type { ReactNode } from "react";

export default function LeftToolbar(props: {
  title: string;
  items: CharacterListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabledIds?: string[];
  headerAction?: ReactNode;
  compact?: boolean;
  renderActions?: (item: CharacterListItem) => ReactNode;
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
  } = props;
  const disabled = new Set(disabledIds ?? []);

  return (
    <div>
      <div className="h3" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {headerAction && <div style={{ marginBottom: 12 }}>{headerAction}</div>}

      <div className={compact ? "toolbarGridCompact" : "toolbarGrid"}>
        {items.map((c) => {
          const isDisabled = disabled.has(c.id);
          const isSelected = c.id === selectedId;

          return (
            <div
              key={c.id}
              className="toolbarItemWrapper"
              style={{ display: "flex", gap: 4 }}
            >
              <button
                type="button"
                className={[
                  "toolbarItem",
                  isSelected ? "toolbarItemActive" : "",
                  isDisabled ? "toolbarItemDisabled" : "",
                  compact ? "toolbarItemCompact" : "",
                ].join(" ")}
                onClick={() => !isDisabled && onSelect(c.id)}
                disabled={isDisabled}
              >
                <div className="toolbarItemName">{c.name}</div>
                {!compact && <div className="muted toolbarItemId">{c.id}</div>}
              </button>
              {renderActions && (
                <div className="toolbarActions">{renderActions(c)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
