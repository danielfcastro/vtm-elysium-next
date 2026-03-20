import { getXpCost } from "../xpDrawerConstants";

export interface TraitRowProps {
  label: string;
  current: number;
  newValue: number;
  maxValue?: number;
  cost: number;
  onIncrease: () => void;
  onDecrease: () => void;
  type: string;
  availableXp: number;
  totalCost: number;
  baseAvailableXp?: number;
}

export function TraitRow({
  label,
  current,
  newValue,
  maxValue = 5,
  cost,
  onIncrease,
  onDecrease,
  type,
  availableXp,
  totalCost,
  baseAvailableXp: _baseAvailableXp,
}: TraitRowProps) {
  const isIncreased = newValue > current;
  const effectiveMax = maxValue ?? 5;
  const canIncrease = newValue < effectiveMax;
  const isLocked = maxValue != null && current >= maxValue;
  const canEverIncrease = !isLocked && current < effectiveMax;
  const nextCost = isIncreased ? cost : getXpCost(type as any, newValue);
  const remainingXp = availableXp - totalCost;
  const canAffordNext = remainingXp >= nextCost;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 8px",
        borderBottom: "1px solid #2a2a2a",
        backgroundColor: canEverIncrease ? "transparent" : "rgba(30,30,30,0.5)",
        opacity: canEverIncrease ? 1 : 0.6,
      }}
    >
      <div
        style={{
          flex: 1,
          fontSize: 13,
          color: canEverIncrease ? "#ddd" : "#777",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: maxValue }).map((_, i) => {
            const isFilled = i < newValue;
            const isNew = isIncreased && i >= current && i < newValue;
            return (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: isFilled
                    ? isNew
                      ? "#ff8c00"
                      : "#c0c0c0"
                    : "#2a2a2a",
                  border: isFilled ? "1px solid #555" : "1px solid #3a3a3a",
                  boxShadow: isFilled
                    ? "inset 0 0 3px rgba(0,0,0,0.5)"
                    : "none",
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            width: 40,
            textAlign: "right",
            fontSize: 11,
            color: "#ffcc00",
          }}
        >
          {newValue > current ? `+${cost}` : ""}
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={onDecrease}
            disabled={newValue <= current}
            style={{
              width: 20,
              height: 20,
              fontSize: 14,
              lineHeight: 1,
              backgroundColor: newValue > current ? "#333" : "#222",
              color: newValue > current ? "#fff" : "#555",
              border: "1px solid #444",
              borderRadius: 3,
              cursor: newValue > current ? "pointer" : "not-allowed",
            }}
          >
            −
          </button>
          <button
            onClick={onIncrease}
            disabled={!canIncrease || !canAffordNext}
            style={{
              width: 20,
              height: 20,
              fontSize: 14,
              lineHeight: 1,
              backgroundColor:
                canIncrease && canAffordNext ? "#1a5c1a" : "#222",
              color: canIncrease && canAffordNext ? "#8f8" : "#555",
              border: "1px solid #444",
              borderRadius: 3,
              cursor: canIncrease && canAffordNext ? "pointer" : "not-allowed",
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
