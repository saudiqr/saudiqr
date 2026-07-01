"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

type EmployeeRole =
  | "owner"
  | "branch_manager"
  | "kitchen"
  | "waiter"
  | "cashier"
  | "accountant"
  | "viewer";

type ActionResult = {
  ok: boolean;
  message: string;
};

export async function fetchStaffBranchAction(branchId: string) {
  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("id, name, business_id")
    .eq("id", branchId)
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: "لم يتم العثور على الفرع.",
      branch: null,
    };
  }

  return {
    ok: true,
    message: "",
    branch: data,
  };
}

export async function fetchStaffBranchesAction(businessId: string) {
  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("id, name, business_id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, message: error.message || "تعذر تحميل الفروع.", branches: [] };
  }

  return { ok: true, message: "", branches: data || [] };
}

export async function fetchStaffEmployeesAction(input: {
  businessId: string;
  branchId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("*")
    .eq("business_id", input.businessId)
    .or(`branch_id.eq.${input.branchId},branch_id.is.null`)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      message: error.message || "تعذر تحميل الموظفين.",
      employees: [],
    };
  }

  return {
    ok: true,
    message: "",
    employees: data || [],
  };
}

function generateFourDigitPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function hashPin(pin: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(pin, salt, 120000, 64, "sha512")
    .toString("hex");

  return `pbkdf2_sha512$120000$${salt}$${hash}`;
}

export async function addStaffEmployeeAction(input: {
  businessId: string;
  branchId: string;
  fullName: string;
  employeeCode: string;
  phone: string;
  email: string | null;
  role: EmployeeRole;
  pin: string;
  permissions: Record<string, boolean>;
}): Promise<ActionResult> {
  const fullName = input.fullName.trim();
  const employeeCode = input.employeeCode.trim();
  const phone = input.phone.trim();
  const email = input.email?.trim().toLowerCase() || null;
  const pin = input.pin.trim();

  if (!fullName) return { ok: false, message: "اكتب اسم الموظف." };
  if (!employeeCode) return { ok: false, message: "اكتب كود الموظف." };
  if (!phone) return { ok: false, message: "اكتب رقم جوال الموظف." };
  if (!/^\d{4}$/.test(pin)) return { ok: false, message: "PIN يجب أن يكون 4 أرقام." };

  const { data: duplicate, error: duplicateError } = await supabaseAdmin
    .from("employees")
    .select("id, deleted_at, active")
    .eq("business_id", input.businessId)
    .ilike("employee_code", employeeCode)
    .maybeSingle();

  if (duplicateError) {
    return { ok: false, message: "تعذر التحقق من كود الموظف." };
  }

  if (duplicate) {
    return {
      ok: false,
      message: "كود الموظف مستخدم سابقًا ولا يمكن استخدامه مرة ثانية.",
    };
  }

  const { error } = await supabaseAdmin.from("employees").insert({
    business_id: input.businessId,
    branch_id: input.role === "owner" ? null : input.branchId,
    full_name: fullName,
    employee_code: employeeCode,
    phone,
    email,
    role: input.role,
    pin_hash: hashPin(pin),
    permissions: input.permissions,
    active: true,
    pin_must_change: true,
    failed_login_attempts: 0,
    locked_until: null,
  });

  if (error) {
    if (
      error.code === "23505" ||
      error.message.toLowerCase().includes("duplicate")
    ) {
      return {
        ok: false,
        message: "كود الموظف مستخدم سابقًا ولا يمكن استخدامه مرة ثانية.",
      };
    }

    return { ok: false, message: error.message || "تعذر إضافة الموظف." };
  }

  await supabaseAdmin.from("employee_audit_logs").insert({
    business_id: input.businessId,
    branch_id: input.branchId,
    action: "employee_created",
    details: {
      full_name: fullName,
      employee_code: employeeCode,
      role: input.role,
      pin_must_change: true,
    },
  });

  revalidatePath(`/branch/${input.branchId}/staff`);

  return {
    ok: true,
    message: `تمت إضافة الموظف بنجاح. PIN المؤقت: ${pin}`,
  };
}

export async function toggleStaffEmployeePermissionAction(input: {
  employeeId: string;
  permissions: Record<string, boolean>;
}): Promise<ActionResult> {
  const { error } = await supabaseAdmin
    .from("employees")
    .update({
      permissions: input.permissions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.employeeId)
    .is("deleted_at", null);

  if (error) return { ok: false, message: error.message || "تعذر تحديث الصلاحيات." };
  return { ok: true, message: "تم تحديث الصلاحيات." };
}

export async function toggleStaffEmployeeStatusAction(input: {
  employeeId: string;
  active: boolean;
}): Promise<ActionResult> {
  const { error } = await supabaseAdmin
    .from("employees")
    .update({
      active: input.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.employeeId)
    .is("deleted_at", null);

  if (error) return { ok: false, message: error.message || "تعذر تحديث حالة الموظف." };
  return { ok: true, message: input.active ? "تم تنشيط الحساب." : "تم تعطيل الحساب." };
}

export async function resetStaffEmployeePinAction(input: {
  employeeId: string;
}): Promise<ActionResult> {
  const pin = generateFourDigitPin();
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("employees")
    .update({
      active: true,
      pin_hash: hashPin(pin),
      pin_must_change: true,
      failed_login_attempts: 0,
      locked_until: null,
      pin_updated_at: now,
      updated_at: now,
    })
    .eq("id", input.employeeId)
    .is("deleted_at", null);

  if (error) return { ok: false, message: error.message || "تعذر توليد PIN." };

  return {
    ok: true,
    message: `تم توليد PIN جديد. الرقم الجديد: ${pin}`,
  };
}

export async function softDeleteStaffEmployeeAction(input: {
  employeeId: string;
}): Promise<ActionResult> {
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("employees")
    .update({
      active: false,
      deleted_at: now,
      updated_at: now,
    })
    .eq("id", input.employeeId);

  if (error) return { ok: false, message: error.message || "تعذر حذف الموظف." };
  return { ok: true, message: "تم نقل الموظف إلى موظفين تم حذفهم." };
}

export async function updateStaffEmployeeAction(input: {
  employeeId: string;
  businessId: string;
  branchId: string | null;
  fullName: string;
  employeeCode: string;
  phone: string | null;
  email: string | null;
  role: EmployeeRole;
}): Promise<ActionResult> {
  const fullName = input.fullName.trim();
  const employeeCode = input.employeeCode.trim();
  const phone = input.phone?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;

  if (!fullName) return { ok: false, message: "اكتب اسم الموظف." };
  if (!employeeCode) return { ok: false, message: "اكتب كود الموظف." };

  const { data: duplicate, error: duplicateError } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("business_id", input.businessId)
    .ilike("employee_code", employeeCode)
    .neq("id", input.employeeId)
    .maybeSingle();

  if (duplicateError) {
    return { ok: false, message: "تعذر التحقق من كود الموظف." };
  }

  if (duplicate) {
    return {
      ok: false,
      message: "كود الموظف مستخدم سابقًا ولا يمكن استخدامه مرة ثانية.",
    };
  }

  const { error } = await supabaseAdmin
    .from("employees")
    .update({
      full_name: fullName,
      employee_code: employeeCode,
      branch_id: input.role === "owner" ? null : input.branchId,
      phone,
      email,
      role: input.role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.employeeId)
    .is("deleted_at", null);

  if (error) {
    return { ok: false, message: error.message || "تعذر تعديل الموظف." };
  }

  return { ok: true, message: "تم تعديل بيانات الموظف." };
}
