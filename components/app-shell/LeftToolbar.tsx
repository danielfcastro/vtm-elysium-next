import type { CharacterListItem } from "@/types/app";

export default function LeftToolbar(props: {
  title: string;
  items: CharacterListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabledIds?: string[];
}): React.ReactElement {
  const { title, items, selectedId, onSelect, disabledIds } = props;
  const disabled = new Set(disabledIds ?? []);

  return (
    <div>
      <div className="h3">{title}</div>

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
