export default function RightPanel(props: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  const { title, children } = props;

  return (
    <div>
      <div className="h3">{title}</div>
      <div className="rightPanelBody">{children}</div>
    </div>
  );
}
