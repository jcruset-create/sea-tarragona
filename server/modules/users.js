const USERS = [
  {
    username: "admin",
    password: process.env.ADMIN_PASSWORD,
    role: "admin",
  },
  {
    username: "supervisor",
    password: process.env.SUPERVISOR_PASSWORD,
    role: "supervisor",
  },
  {
    username: "pantallas",
    password: process.env.SCREENS_PASSWORD || "pantalla2025",
    role: "pantallas",
  },
];

function findUserByPassword(password) {
  return USERS.find((user) => user.password === password);
}

module.exports = {
  USERS,
  findUserByPassword,
};