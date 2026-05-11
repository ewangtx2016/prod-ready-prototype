import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "./roles";

const LS_ROLE = "demo.role";
const LS_DEVNOTE = "demo.devNote";
export const ORG_STORAGE_KEY = "demo.org";
export const DEFAULT_ORG_NAME = "机构用户平台";
const LEGACY_DEFAULT_ORG_NAME = "示例教育科技有限公司";

type AppState = {
  role: Role;
  setRole: (r: Role) => void;
  showDevNote: boolean;
  setShowDevNote: (v: boolean) => void;
  orgName: string;
  setOrgName: (v: string) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("org_admin");
  const [showDevNote, setShowDevNoteState] = useState(true);
  const [orgName, setOrgNameState] = useState(DEFAULT_ORG_NAME);

  useEffect(() => {
    // 演示身份切换已隐藏，强制为机构管理员
    localStorage.setItem(LS_ROLE, "org_admin");
    setRoleState("org_admin");
    const d = localStorage.getItem(LS_DEVNOTE);
    if (d !== null) setShowDevNoteState(d === "1");
    const rawOrg = localStorage.getItem(ORG_STORAGE_KEY);
    if (rawOrg) {
      try {
        const parsed = JSON.parse(rawOrg) as { name?: string };
        setOrgNameState(parsed.name && parsed.name !== LEGACY_DEFAULT_ORG_NAME ? parsed.name : DEFAULT_ORG_NAME);
      } catch {
        setOrgNameState(DEFAULT_ORG_NAME);
      }
    }
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    localStorage.setItem(LS_ROLE, r);
  }, []);
  const setShowDevNote = useCallback((v: boolean) => {
    setShowDevNoteState(v);
    localStorage.setItem(LS_DEVNOTE, v ? "1" : "0");
  }, []);
  const setOrgName = useCallback((v: string) => {
    setOrgNameState(v.trim() || DEFAULT_ORG_NAME);
  }, []);

  return <Ctx.Provider value={{ role, setRole, showDevNote, setShowDevNote, orgName, setOrgName }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be inside AppStateProvider");
  return v;
}
