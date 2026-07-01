"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export type CreateEmployeeState = {
  ok: boolean;
  message: string;
  generatedPin?: string;
};

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

export async function createEmployeeAction(
  branchId: string,
  _prevState: CreateEmployeeState,
  formData: FormData
): Promise<CreateEmployeeState> {
  const fullName = String(formData.get("full_name") || "").trim();
  const employeeCode = normalizeEmployeeCode(
    String(formData.get("employee_code") || "")
  );
  const role = String(formData.get("role") || "").trim();
  const active = formData.get("active") === "on";

  if (!branchId) {
    return { ok: false, message: "معرف الفرع غير موجود." };
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

  const { data: branch, error: branchError } = await supabaseAdmin
    .from("branches")
    .select("id, business_id")
    .eq("id", branchId)
    .single();

  if (branchError || !branch?.business_id) {
    return {
      ok: false,
      message: "تعذر قراءة بيانات الفرع. تأكد أن الفرع موجود.",
    };
  }

  const { data: existingEmployee, error: existingError } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("branch_id", branchId)
    .ilike("employee_code", employeeCode)
    .maybeSingle();

  if (existingError) {
    return {
      ok: false,
      message: "تعذر التحقق من كود الموظف.",
    };
  }

  if (existingEmployee) {
    return {
      ok: false,
      message: "كود الموظف مستخدم بالفعل داخل هذا الفرع.",
    };
  }

  const generatedPin = generateFourDigitPin();
  const pinHash = hashPin(generatedPin);

  const { data: employee, error: insertError } = await supabaseAdmin
    .from("employees")
    .insert({
      business_id: branch.business_id,
      branch_id: branchId,
      employee_code: employeeCode,
      full_name: fullName,
      role,
      active,
      pin_hash: pinHash,
      pin_must_change: true,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .select("id, employee_code, full_name")
    .single();

  if (insertError) {
    if (
      insertError.code === "23505" ||
      insertError.message?.toLowerCase().includes("duplicate")
    ) {
      return {
        ok: false,
        message: "كود الموظف مستخدم بالفعل داخل هذا الفرع.",
      };
    }

    return {
      ok: false,
      message: `فشل حفظ الموظف: ${insertError.message}`,
    };
  }

  await supabaseAdmin.from("employee_audit_logs").insert({
    employee_id: employee.id,
    business_id: branch.business_id,
    branch_id: branchId,
    action: "employee_created",
    details: {
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      role,
      pin_must_change: true,
      pin_generated_by_manager: true,
    },
  });

  revalidatePath(`/branch/${branchId}/employees`);

  return {
    ok: true,
    message: "تم إنشاء الموظف بنجاح. انسخ رقم PIN الآن، لن يظهر مرة أخرى.",
    generatedPin,
  };
}
