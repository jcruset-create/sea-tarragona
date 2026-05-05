export type UserRole = "admin" | "supervisor" | "pantallas";

type AppUser = {
  role: UserRole;
  password?: string;
};

export const USERS: AppUser[] = [
  {
    role: "admin",
    password: process.env.ADMIN_PASSWORD,
  },
  {
    role: "supervisor",
    password: process.env.SUPERVISOR_PASSWORD,
  },
  {
    role: "pantallas",
    password: process.env.SCREENS_PASSWORD,
  },
];

export function findUserByPassword(password: string | undefined) {
  if (!password) return null;

  return (
    USERS.find(
      (user) => user.password && password === user.password
    ) ?? null
  );
}