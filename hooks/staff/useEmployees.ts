"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addStaffEmployeeAction,
  fetchStaffBranchAction,
  fetchStaffBranchesAction,
  fetchStaffEmployeesAction,
  resetStaffEmployeePinAction,
  softDeleteStaffEmployeeAction,
  toggleStaffEmployeePermissionAction,
  toggleStaffEmployeeStatusAction,
  updateStaffEmployeeAction,
} from "../../app/branch/[id]/staff/actions";
import {
  defaultPermissionsByRole,
  permissionsArrayToObject,
  permissionsObjectToArray,
  type EmployeeRole,
  type PermissionKey,
} from "./usePermissions";

export type Employee = {
  id: string;
  business_id: string;
  branch_id: string | null;
  full_name: string;
  employee_code: string | null;
  phone: string | null;
  email: string | null;
  role: EmployeeRole;
  pin_hash: string;
  permissions: Record<string, boolean> | null;
  active: boolean;
  last_login_at: string | null;
  pin_updated_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type BranchRow = {
  id: string;
  name: string;
  business_id: string;
};

export const roleFilters: {
  key: "all" | "active" | "disabled" | "deleted" | EmployeeRole;
  label: string;
}[] = [
  { key: "all", label: "الكل" },
  { key: "active", label: "نشط" },
  { key: "disabled", label: "معطل" },
  { key: "deleted", label: "محذوفين" },
  { key: "branch_manager", label: "مدير" },
  { key: "kitchen", label: "مطبخ" },
  { key: "waiter", label: "نادل" },
  { key: "cashier", label: "كاشير" },
  { key: "accountant", label: "محاسب" },
];

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function formatDateTime(value: string | null) {
  if (!value) return "لم يسجل دخول";

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function useEmployees(branchId: string) {
  const [branch, setBranch] = useState<BranchRow | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<(typeof roleFilters)[number]["key"]>("all");

  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState(generatePin());
  const [showPin, setShowPin] = useState(false);
  const [role, setRole] = useState<EmployeeRole>("waiter");
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>(
    defaultPermissionsByRole.waiter
  );

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmployeeCode, setEditEmployeeCode] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<EmployeeRole>("waiter");

  function showNotice(text: string) {
    setNotice(text);
    setMessage(text);
  }

  function closeNotice() {
    setNotice("");
  }

  const activeEmployees = useMemo(
    () => employees.filter((employee) => !employee.deleted_at),
    [employees]
  );

  const deletedEmployees = useMemo(
    () => employees.filter((employee) => Boolean(employee.deleted_at)),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeEmployees.filter((employee) => {
      const matchesQuery = !query
        ? true
        : `${employee.full_name} ${employee.phone || ""} ${
            employee.employee_code || ""
          } ${employee.email || ""}`
            .toLowerCase()
            .includes(query);

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "active"
            ? employee.active
            : filter === "disabled"
              ? !employee.active
              : filter === "deleted"
                ? false
                : employee.role === filter;

      return matchesQuery && matchesFilter;
    });
  }, [activeEmployees, search, filter]);

  const stats = useMemo(() => {
    return {
      total: activeEmployees.length,
      activeCount: activeEmployees.filter((employee) => employee.active).length,
      disabledCount: activeEmployees.filter((employee) => !employee.active).length,
      deletedCount: deletedEmployees.length,
      managersCount: activeEmployees.filter(
        (employee) => employee.role === "branch_manager"
      ).length,
      operationCount: activeEmployees.filter((employee) =>
        ["kitchen", "waiter", "cashier"].includes(employee.role)
      ).length,
    };
  }, [activeEmployees, deletedEmployees]);

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const branchResult = await fetchStaffBranchAction(branchId);

    if (!branchResult.ok || !branchResult.branch) {
      showNotice(branchResult.message);
      setBranch(null);
      setEmployees([]);
      setLoading(false);
      return;
    }

    const branchData = branchResult.branch as BranchRow;
    setBranch(branchData);

    const branchesResult = await fetchStaffBranchesAction(branchData.business_id);
    if (branchesResult.ok) {
      setBranches((branchesResult.branches || []) as BranchRow[]);
    }

    await loadEmployees(branchData.business_id);
    setLoading(false);
  }

  async function loadEmployees(businessId = branch?.business_id) {
    if (!businessId) return;

    const result = await fetchStaffEmployeesAction({
      businessId,
      branchId,
    });

    if (!result.ok) {
      showNotice(result.message || "تعذر تحميل الموظفين.");
      setEmployees([]);
      return;
    }

    setEmployees((result.employees || []) as Employee[]);
  }

  function changeRole(nextRole: EmployeeRole) {
    setRole(nextRole);
    setSelectedPermissions(defaultPermissionsByRole[nextRole]);
  }

  function toggleNewPermission(permission: PermissionKey) {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  }

  function selectAllPermissions() {
    setSelectedPermissions(defaultPermissionsByRole.owner);
  }

  function clearPermissions() {
    setSelectedPermissions([]);
  }

  function resetForm() {
    setFullName("");
    setEmployeeCode("");
    setPhone("");
    setEmail("");
    setRole("waiter");
    setPin(generatePin());
    setShowPin(false);
    setSelectedPermissions(defaultPermissionsByRole.waiter);
  }

  async function addEmployee() {
    if (!branch) {
      showNotice("بيانات الفرع غير مكتملة.");
      return;
    }

    const cleanName = fullName.trim();
    const cleanCode = employeeCode.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanName) return showNotice("اكتب اسم الموظف.");
    if (!cleanCode) return showNotice("اكتب كود الموظف.");
    if (!cleanPhone) return showNotice("اكتب رقم جوال الموظف.");
    if (!/^\d{4}$/.test(cleanPin)) return showNotice("PIN يجب أن يكون 4 أرقام.");
    if (selectedPermissions.length === 0) return showNotice("اختر صلاحية واحدة على الأقل.");

    setSaving(true);
    setMessage("");

    const result = await addStaffEmployeeAction({
      businessId: branch.business_id,
      branchId,
      fullName: cleanName,
      employeeCode: cleanCode,
      phone: cleanPhone,
      email: cleanEmail || null,
      role,
      pin: cleanPin,
      permissions: permissionsArrayToObject(selectedPermissions),
    });

    if (!result.ok) {
      showNotice(result.message);
      setSaving(false);
      return;
    }

    resetForm();
    await loadEmployees(branch.business_id);
    showNotice(result.message);
    setSaving(false);
  }

  async function toggleEmployeePermission(
    employee: Employee,
    permission: PermissionKey
  ) {
    const currentPermissions = permissionsObjectToArray(
      employee.permissions,
      employee.role
    );

    const nextPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter((item) => item !== permission)
      : [...currentPermissions, permission];

    if (nextPermissions.length === 0) {
      showNotice("لا يمكن حذف كل الصلاحيات من الموظف.");
      return;
    }

    const nextPermissionsObject = permissionsArrayToObject(nextPermissions);

    const result = await toggleStaffEmployeePermissionAction({
      employeeId: employee.id,
      permissions: nextPermissionsObject,
    });

    if (!result.ok) return showNotice(result.message);

    setEmployees((current) =>
      current.map((item) =>
        item.id === employee.id
          ? { ...item, permissions: nextPermissionsObject }
          : item
      )
    );
  }

  async function toggleEmployeeStatus(employee: Employee) {
    const nextActive = !employee.active;

    const result = await toggleStaffEmployeeStatusAction({
      employeeId: employee.id,
      active: nextActive,
    });

    if (!result.ok) return showNotice(result.message);

    setEmployees((current) =>
      current.map((item) =>
        item.id === employee.id ? { ...item, active: nextActive } : item
      )
    );

    showNotice(result.message);
  }

  async function resetEmployeePin(employee: Employee) {
    const confirmed = window.confirm(
      `سيتم توليد PIN جديد للموظف ${employee.full_name}. هل تريد المتابعة؟`
    );

    if (!confirmed) return;

    const result = await resetStaffEmployeePinAction({
      employeeId: employee.id,
    });

    if (!result.ok) return showNotice(result.message);

    const now = new Date().toISOString();

    setEmployees((current) =>
      current.map((item) =>
        item.id === employee.id ? { ...item, pin_updated_at: now } : item
      )
    );

    showNotice(result.message);
  }

  async function softDeleteEmployee(employee: Employee) {
    const confirmed = window.confirm(`هل تريد حذف ${employee.full_name}؟`);
    if (!confirmed) return;

    const result = await softDeleteStaffEmployeeAction({
      employeeId: employee.id,
    });

    if (!result.ok) return showNotice(result.message);

    const now = new Date().toISOString();

    setEmployees((current) =>
      current.map((item) =>
        item.id === employee.id
          ? { ...item, active: false, deleted_at: now, updated_at: now }
          : item
      )
    );

    showNotice(result.message);
  }

  function openEditEmployee(employee: Employee) {
    setEditingEmployee(employee);
    setEditFullName(employee.full_name);
    setEditEmployeeCode(employee.employee_code || "");
    setEditBranchId(employee.branch_id || "");
    setEditPhone(employee.phone || "");
    setEditEmail(employee.email || "");
    setEditRole(employee.role);
  }

  function closeEditEmployee() {
    setEditingEmployee(null);
  }

  async function saveEditEmployee() {
    if (!editingEmployee) return;

    const result = await updateStaffEmployeeAction({
      employeeId: editingEmployee.id,
      businessId: editingEmployee.business_id,
      branchId: editRole === "owner" ? null : editBranchId,
      fullName: editFullName,
      employeeCode: editEmployeeCode,
      phone: editPhone,
      email: editEmail,
      role: editRole,
    });

    if (!result.ok) return showNotice(result.message);

    setEmployees((current) =>
      current.map((item) =>
        item.id === editingEmployee.id
          ? {
              ...item,
              full_name: editFullName,
              employee_code: editEmployeeCode,
              branch_id: editRole === "owner" ? null : editBranchId,
              phone: editPhone || null,
              email: editEmail || null,
              role: editRole,
              updated_at: new Date().toISOString(),
            }
          : item
      )
    );

    closeEditEmployee();
    showNotice(result.message);
  }

  return {
    branch,
    branches,
    employees,
    activeEmployees,
    deletedEmployees,
    filteredEmployees,
    stats,
    loading,
    saving,
    message,
    notice,
    closeNotice,
    search,
    setSearch,
    filter,
    setFilter,
    fullName,
    setFullName,
    employeeCode,
    setEmployeeCode,
    phone,
    setPhone,
    email,
    setEmail,
    pin,
    setPin,
    showPin,
    setShowPin,
    role,
    changeRole,
    selectedPermissions,
    toggleNewPermission,
    selectAllPermissions,
    clearPermissions,
    loadEmployees,
    addEmployee,
    toggleEmployeePermission,
    toggleEmployeeStatus,
    resetEmployeePin,
    softDeleteEmployee,
    editingEmployee,
    editFullName,
    setEditFullName,
    editEmployeeCode,
    setEditEmployeeCode,
    editBranchId,
    setEditBranchId,
    editPhone,
    setEditPhone,
    editEmail,
    setEditEmail,
    editRole,
    setEditRole,
    openEditEmployee,
    closeEditEmployee,
    saveEditEmployee,
  };
}
