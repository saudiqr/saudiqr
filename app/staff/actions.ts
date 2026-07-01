"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export type StaffLoginState = {
  ok: boolean;
  message: string;
};

type EmployeeRole =
  | "owner"
  | "branch_manager"
  | "kitchen"
  | "waiter"
  | "cashier"
  | "accountant"
  | "viewer";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function verifyPin(pin: string, storedHash: string) {
  const [scheme, iterationsText, salt, originalHash] = storedHash.split("$");

  if (scheme !== "pbkdf2_sha512" || !iterationsText || !salt || !originalHash) {
    return false;
  }

  const hash = crypto
    .pbkdf2Sync(pin, salt, Number(iterationsText), 64, "sha512")
    .toString("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(originalHash, "hex")
    );
  } catch {
    return false;
  }
}

function getRedirectPath(role: EmployeeRole, branchId: string) {
  if (role === "kitchen") return `/branch/${branchId}/kitchen`;
  if (role === "cashier") return `/branch/${branchId}/cashier`;
  if (role === "waiter") return `/branch/${branchId}/waiter-calls`;
  if (role === "accountant") return `/branch/${branchId}/cashier`;

  return `/branch/${branchId}/staff`;
}

export async function staffLoginAction(
  _prevState: StaffLoginState,
  formData: FormData
): Promise<StaffLoginState> {
  const branchId = String(formData.get("branch_id") || "").trim();
  const employeeCode = String(formData.get("employee_code") || "").trim();
  const pin = String(formData.get("pin") || "").trim();

  if (!branchId) return { ok: false, message: "الرابط غير مرتبط بفرع." };
  if (!employeeCode) return { ok: false, message: "اكتب كود الموظف." };
  if (!/^\d{4}$/.test(pin)) return { ok: false, message: "ادخل PIN من 4 أرقام." };

  const { data: employee, error } = await supabaseAdmin
    .from("employees")
    .select("id, business_id, branch_id, full_name, employee_code, role, pin_hash, active, pin_must_change, failed_login_attempts, locked_until, deleted_at, permissions")
    .eq("employee_code", employeeCode)
    .or(`branch_id.eq.${branchId},branch_id.is.null`)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { ok: false, message: "تعذر تسجيل الدخول الآن." };
  if (!employee) return { ok: false, message: "كود الموظف أو PIN غير صحيح." };
  if (!employee.active) return { ok: false, message: "هذا الحساب معطل. راجع مدير الفرع." };

  if (employee.locked_until && new Date(employee.locked_until) > new Date()) {
    return { ok: false, message: "تم قفل الحساب مؤقتًا بسبب محاولات خاطئة." };
  }

  const pinOk = verifyPin(pin, employee.pin_hash);

  if (!pinOk) {
    const nextAttempts = Number(employee.failed_login_attempts || 0) + 1;
    const shouldLock = nextAttempts >= 3;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : null;

    await supabaseAdmin
      .from("employees")
      .update({
        failed_login_attempts: nextAttempts,
        locked_until: lockedUntil,
        active: shouldLock ? false : employee.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employee.id);

    await supabaseAdmin.from("employee_audit_logs").insert({
      employee_id: employee.id,
      business_id: employee.business_id,
      branch_id: branchId,
      action: shouldLock ? "employee_login_locked" : "employee_login_failed",
      details: {
        employee_code: employee.employee_code,
        failed_login_attempts: nextAttempts,
        locked: shouldLock,
      },
    });

    if (shouldLock) {
      return {
        ok: false,
        message: "تم تعطيل الحساب بعد 3 محاولات خاطئة. اطلب من المدير توليد PIN جديد.",
      };
    }

    return { ok: false, message: `PIN غير صحيح. المحاولات المتبقية: ${3 - nextAttempts}` };
  }

  await supabaseAdmin
    .from("employees")
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", employee.id);

  await supabaseAdmin
    .from("employee_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("employee_id", employee.id)
    .is("revoked_at", null);

  const rawToken = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

  const { error: sessionError } = await supabaseAdmin
    .from("employee_sessions")
    .insert({
      employee_id: employee.id,
      business_id: employee.business_id,
      branch_id: branchId,
      session_token_hash: hashToken(rawToken),
      expires_at: expiresAt.toISOString(),
      revoked_at: null,
    });

  if (sessionError) {
    return { ok: false, message: `تعذر إنشاء الجلسة: ${sessionError.message}` };
  }

  const cookieStore = await cookies();

  cookieStore.set("karz_staff_session", rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  await supabaseAdmin.from("employee_audit_logs").insert({
    employee_id: employee.id,
    business_id: employee.business_id,
    branch_id: branchId,
    action: "employee_login_success",
    details: {
      employee_code: employee.employee_code,
      role: employee.role,
      old_sessions_revoked: true,
    },
  });

  if (employee.pin_must_change) redirect("/staff/change-pin");

  redirect(getRedirectPath(employee.role as EmployeeRole, branchId));
}
