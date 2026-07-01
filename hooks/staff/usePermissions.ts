"use client";

export type EmployeeRole =
  | "owner"
  | "branch_manager"
  | "kitchen"
  | "waiter"
  | "cashier"
  | "accountant"
  | "viewer";

export type PermissionKey =
  | "orders"
  | "hall_manager"
  | "kitchen"
  | "waiter"
  | "cashier"
  | "tables"
  | "bill_requests"
  | "reviews"
  | "stats"
  | "products"
  | "categories"
  | "settings"
  | "employees"
  | "subscriptions";

export const roleLabels: Record<EmployeeRole, string> = {
  owner: "مالك",
  branch_manager: "مدير الفرع",
  kitchen: "مطبخ",
  waiter: "نادل",
  cashier: "كاشير",
  accountant: "محاسب",
  viewer: "مشاهدة فقط",
};

export const roleIcon: Record<EmployeeRole, string> = {
  owner: "👑",
  branch_manager: "🧑‍💼",
  kitchen: "👨‍🍳",
  waiter: "🧑‍🍽️",
  cashier: "💳",
  accountant: "📊",
  viewer: "👀",
};

export const permissionOptions: { key: PermissionKey; label: string }[] = [
  { key: "orders", label: "الطلبات" },
  { key: "hall_manager", label: "مدير الصالة" },
  { key: "kitchen", label: "المطبخ" },
  { key: "waiter", label: "النادل" },
  { key: "cashier", label: "الكاشير" },
  { key: "tables", label: "الطاولات" },
  { key: "bill_requests", label: "طلبات الفاتورة" },
  { key: "reviews", label: "التقييمات" },
  { key: "stats", label: "الإحصائيات" },
  { key: "products", label: "المنتجات" },
  { key: "categories", label: "الأقسام" },
  { key: "settings", label: "الإعدادات" },
  { key: "employees", label: "الموظفين" },
  { key: "subscriptions", label: "الاشتراك" },
];

export const defaultPermissionsByRole: Record<EmployeeRole, PermissionKey[]> = {
  owner: permissionOptions.map((item) => item.key),
  branch_manager: [
    "orders",
    "hall_manager",
    "kitchen",
    "waiter",
    "cashier",
    "tables",
    "bill_requests",
    "reviews",
    "stats",
    "products",
    "categories",
    "employees",
  ],
  kitchen: ["kitchen"],
  waiter: ["waiter", "tables", "bill_requests"],
  cashier: ["cashier", "bill_requests", "tables"],
  accountant: ["cashier", "stats", "subscriptions"],
  viewer: ["stats", "reviews"],
};

export function permissionsArrayToObject(keys: PermissionKey[]) {
  return keys.reduce<Record<string, boolean>>((result, key) => {
    result[key] = true;
    return result;
  }, {});
}

export function permissionsObjectToArray(
  permissions: Record<string, boolean> | null,
  role: EmployeeRole
) {
  if (!permissions || Object.keys(permissions).length === 0) {
    return defaultPermissionsByRole[role];
  }

  return permissionOptions
    .map((item) => item.key)
    .filter((key) => permissions[key] === true);
}
