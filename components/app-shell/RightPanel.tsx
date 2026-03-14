export default function RightPanel({
  title,
  children,
  rightButton,
}: {
  title: string;
  children: React.ReactNode;
  rightButton?: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="h3"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{title}</span>
        {rightButton}
      </div>
      <div className="rightPanelBody">{children}</div>
    </div>
  );
}
