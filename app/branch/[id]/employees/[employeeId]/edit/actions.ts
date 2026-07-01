"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export type EditEmployeeState = {
  ok: boolean;
  message: string;
  generatedPin?: string;
};

type EmployeeRole = "manager" | "cashier" | "kitchen" | "waiter";

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

function normalizeEmployeeCode(value: string) {
  return value.trim();
}

export async function updateEmployeeAction(
  branchId: string,
  employeeId: string,
  _prevState: EditEmployeeState,
  formData: FormData
): Promise<EditEmployeeState> {
  const fullName = String(formData.get("full_name") || "").trim();
  const employeeCode = normalizeEmployeeCode(
    String(formData.get("employee_code") || "")
  );
  const role = String(formData.get("role") || "").trim() as EmployeeRole;
  const active = formData.get("active") === "on";

  if (!branchId || !employeeId) {
    return { ok: false, message: "بيانات الموظف غير مكتملة." };
  }

  if (!fullName) {
    return { ok: false, message: "اكتب اسم الموظف." };
  }

  if (!employeeCode) {
    return { ok: false, message: "اكتب كود الموظف." };
  }

  if (!["manager", "cashier", "kitchen", "waiter"].includes(role)) {
    return { ok: false, message: "اختر الدور الوظيفي." };
  }

  const { data: currentEmployee, error: currentError } = await supabase
    .from("employees")
    .select("id, business_id, branch_id")
    .eq("id", employeeId)
    .eq("branch_id", branchId)
    .single();

  if (currentError || !currentEmployee) {
    return { ok: false, message: "الموظف غير موجود." };
  }

  const { data: duplicateEmployee, error: duplicateError } = await supabase
    .from("employees")
    .select("id")
    .eq("branch_id", branchId)
    .ilike("employee_code", employeeCode)
    .neq("id", employeeId)
    .maybeSingle();

  if (duplicateError) {
    return { ok: false, message: "تعذر التحقق من كود الموظف." };
  }

  if (duplicateEmployee) {
    return {
      ok: false,
      message: "كود الموظف مستخدم بالفعل داخل هذا الفرع.",
    };
  }

  const { error: updateError } = await supabase
    .from("employees")
    .update({
      employee_code: employeeCode,
      full_name: fullName,
      role,
      active,
    })
    .eq("id", employeeId)
    .eq("branch_id", branchId);

  if (updateError) {
    return {
      ok: false,
      message: `فشل تحديث الموظف: ${updateError.message}`,
    };
  }

  await supabase.from("employee_audit_logs").insert({
    employee_id: employeeId,
    business_id: currentEmployee.business_id,
    branch_id: branchId,
    action: "employee_updated",
    details: {
      employee_code: employeeCode,
      full_name: fullName,
      role,
      active,
    },
  });

  revalidatePath(`/branch/${branchId}/employees`);
  revalidatePath(`/branch/${branchId}/employees/${employeeId}/edit`);

  return {
    ok: true,
    message: "تم تحديث بيانات الموظف بنجاح.",
  };
}

export async function regenerateEmployeePinAction(
  branchId: string,
  employeeId: string
): Promise<EditEmployeeState> {
  if (!branchId || !employeeId) {
    return { ok: false, message: "بيانات الموظف غير مكتملة." };
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, business_id, employee_code, full_name")
    .eq("id", employeeId)
    .eq("branch_id", branchId)
    .single();

  if (employeeError || !employee) {
    return { ok: false, message: "الموظف غير موجود." };
  }

  const generatedPin = generateFourDigitPin();
  const pinHash = hashPin(generatedPin);

  const { error: updateError } = await supabase
    .from("employees")
    .update({
      active: true,
      pin_hash: pinHash,
      pin_must_change: true,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq("id", employeeId)
    .eq("branch_id", branchId);

  if (updateError) {
    return {
      ok: false,
      message: `فشل توليد PIN جديد: ${updateError.message}`,
    };
  }

  await supabase.from("employee_audit_logs").insert({
    employee_id: employeeId,
    business_id: employee.business_id,
    branch_id: branchId,
    action: "employee_pin_regenerated",
    details: {
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      pin_must_change: true,
      account_reactivated: true,
    },
  });

  revalidatePath(`/branch/${branchId}/employees`);
  revalidatePath(`/branch/${branchId}/employees/${employeeId}/edit`);

  return {
    ok: true,
    message: "تم توليد PIN جديد. انسخه الآن، لن يظهر مرة أخرى.",
    generatedPin,
  };
}
