import type { CharacterListItem } from "@/types/app";
import type { ReactNode } from "react";

export default function LeftToolbar(props: {
  title: string;
  items: CharacterListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabledIds?: string[];
  headerAction?: ReactNode;
}): React.ReactElement {
  const { title, items, selectedId, onSelect, disabledIds, headerAction } =
    props;
  const disabled = new Set(disabledIds ?? []);

  return (
    <div>
      <div className="h3" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {headerAction && <div style={{ marginBottom: 12 }}>{headerAction}</div>}

      <div className="toolbarGrid">
        {items.map((c) => {
          const isDisabled = disabled.has(c.id);
          const isSelected = c.id === selectedId;

          return (
            <button
              key={c.id}
              type="button"
              className={[
                "toolbarItem",
                isSelected ? "toolbarItemActive" : "",
                isDisabled ? "toolbarItemDisabled" : "",
              ].join(" ")}
              onClick={() => !isDisabled && onSelect(c.id)}
              disabled={isDisabled}
            >
              <div className="toolbarItemName">{c.name}</div>
              <div className="muted toolbarItemId">{c.id}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
