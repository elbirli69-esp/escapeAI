import { useEffect, type ReactNode } from "react";

export type LobbyShellMode = "home" | "create" | "join" | "organizer" | "catalog" | "scan";

export function LobbyShell(props: {
  mode: LobbyShellMode;
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "instant" });
  }, [props.mode]);

  const shellClass = [
    "shell",
    "lobby",
    "lobby-panel",
    props.mode === "home" ? "lobby-home" : "",
    props.mode === "catalog" ? "lobby-catalog" : "",
    props.mode === "create" ? "lobby-create" : "",
    props.mode === "join" ? "lobby-join" : "",
    props.mode === "organizer" ? "lobby-organizer" : "",
    props.className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={shellClass} data-lobby-mode={props.mode} data-testid={props.testId}>
      {props.children}
    </main>
  );
}