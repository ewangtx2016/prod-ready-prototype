import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "./roles";

const LS_ROLE = "demo.role";
const LS_DEVNOTE = "demo.devNote";

type AppState = {
  role: Role;
  setRole: (r: Role) => void;
  showDevNote: boolean;
  setShowDevNote: (v: boolean) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("org_admin");
  const [showDevNote, setShowDevNoteState] = useState(true);

  useEffect(() => {
    const r = localStorage.getItem(LS_ROLE) as Role | null;
    if (r) setRoleState(r);
    const d = localStorage.getItem(LS_DEVNOTE);
    if (d !== null) setShowDevNoteState(d === "1");
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    localStorage.setItem(LS_ROLE, r);
  };
  const setShowDevNote = (v: boolean) => {
    setShowDevNoteState(v);
    localStorage.setItem(LS_DEVNOTE, v ? "1" : "0");
  };

  return <Ctx.Provider value={{ role, setRole, showDevNote, setShowDevNote }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be inside AppStateProvider");
  return v;
}