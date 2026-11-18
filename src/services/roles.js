// Names shown to people for each stored role value.
const ROLE_NAMES = {
  amo: "AMO",
  department_head: "Program Head",
  academic_coordinator: "Academic Coordinator",
  admin: "Admin",
  instructor: "Instructor",
  cashier: "Cashier",
};

export function roleLabel(role) {
  const k = String(role || "").toLowerCase();
  return ROLE_NAMES[k] || role || "";
}
