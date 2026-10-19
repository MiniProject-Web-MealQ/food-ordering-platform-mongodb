function frontendRole(role) {
  return role === "admin" ? "ADMIN" : role === "customer" ? "CUSTOMER" : "MERCHANT";
}

function userView(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: frontendRole(user.role),
    accountRole: user.role,
    status: user.status || "active",
    mustChangePassword: Boolean(user.must_change_password),
  };
}

module.exports = { frontendRole, userView };
