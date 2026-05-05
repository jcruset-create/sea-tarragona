export type UserRole = "admin" | "supervisor" | "pantallas";

export type AppView =
  | "operativo"
  | "agenda"
  | "ajustes"
  | "pantalla"
  | "informes"
  | "operarios";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  pantallas: "Pantallas",
};

export const DEFAULT_VIEW_BY_ROLE: Record<UserRole, AppView> = {
  admin: "operativo",
  supervisor: "operativo",
  pantallas: "operarios",
};

export const VIEWS_BY_ROLE: Record<UserRole, AppView[]> = {
  admin: ["operativo", "agenda", "ajustes", "pantalla", "informes", "operarios"],
  supervisor: ["operativo", "agenda", "ajustes", "pantalla", "informes", "operarios"],
  pantallas: ["pantalla", "operarios"],
};

export function isValidUserRole(value: string | null): value is UserRole {
  return value === "admin" || value === "supervisor" || value === "pantallas";
}

export function canAccessView(role: UserRole | null, view: AppView) {
  if (!role) return false;
  return VIEWS_BY_ROLE[role].includes(view);
}

export function getDefaultViewForRole(role: UserRole | null): AppView {
  if (!role) return "operativo";
  return DEFAULT_VIEW_BY_ROLE[role];
}

export function canUseAdminTools(role: UserRole | null) {
  return role === "admin";
}

export function canUseSupervisorTools(role: UserRole | null) {
  return role === "admin" || role === "supervisor";
}

export function canUseScreens(role: UserRole | null) {
  return role === "admin" || role === "supervisor" || role === "pantallas";
}