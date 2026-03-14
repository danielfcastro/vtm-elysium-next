import type { ReactNode } from "react";

export default function AppShell(props: {
  top: ReactNode;
  left: ReactNode;
  main: ReactNode;
  right: ReactNode;
}): React.ReactElement {
  const { top, left, main, right } = props;

  return (
    <div className="shellPage">
      <header className="shellTop">{top}</header>

      <div className="shellGrid">
        <aside className="shellLeft">{left}</aside>
        <main className="shellMain">{main}</main>
        <aside className="shellRight">{right}</aside>
      </div>
    </div>
  );
}
