function frontendRole(role) {
  return role === "customer" ? "CUSTOMER" : "MERCHANT";
}

function userView(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: frontendRole(user.role),
  };
}

module.exports = { frontendRole, userView };
