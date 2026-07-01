"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  regenerateEmployeePinAction,
  updateEmployeeAction,
  type EditEmployeeState,
} from "@/app/branch/[id]/employees/[employeeId]/edit/actions";

type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  role: string;
  active: boolean;
  pin_must_change: boolean;
  failed_login_attempts: number;
};

type EditEmployeeFormProps = {
  branchId: string;
  employee: Employee;
};

const initialState: EditEmployeeState = {
  ok: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-[#c89b3c] px-8 py-3 font-bold text-black transition hover:bg-[#ddb258] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "جاري الحفظ..." : "حفظ التعديلات"}
    </button>
  );
}

export default function EditEmployeeForm({
  branchId,
  employee,
}: EditEmployeeFormProps) {
  const [pinState, setPinState] = useState<EditEmployeeState | null>(null);
  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    updateEmployeeAction.bind(null, branchId, employee.id),
    initialState
  );

  function handleRegeneratePin() {
    const confirmed = window.confirm(
      "سيتم توليد PIN جديد وتفعيل الحساب وإجبار الموظف على تغييره عند أول دخول. هل أنت متأكد؟"
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await regenerateEmployeePinAction(branchId, employee.id);
      setPinState(result);
    });
  }

  return (
    <div className="grid gap-6">
      {employee.failed_login_attempts >= 3 && !employee.active && (
        <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-5 text-red-200">
          <p className="font-black">تنبيه أمني</p>
          <p className="mt-2 text-sm leading-7">
            تم تعطيل هذا الحساب بعد 3 محاولات PIN خاطئة. يمكن للمدير توليد PIN
            جديد لإعادة تفعيل الحساب.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-[#7a5a22] bg-[#22170f] p-8 shadow-xl">
        <form action={formAction} className="grid gap-6">
          {state.message && (
            <div
              className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
                state.ok
                  ? "border-green-500/30 bg-green-500/10 text-green-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {state.message}
            </div>
          )}

          {pinState?.message && (
            <div
              className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
                pinState.ok
                  ? "border-green-500/30 bg-green-500/10 text-green-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {pinState.message}
            </div>
          )}

          {pinState?.generatedPin && (
            <div className="rounded-3xl border border-[#c89b3c]/60 bg-[#130d08] p-6 text-center">
              <p className="text-sm font-bold text-[#d7c0a0]">
                PIN الجديد للموظف
              </p>

              <div className="mt-3 rounded-2xl border border-[#7a5a22] bg-[#2b1d13] px-6 py-5 font-mono text-5xl font-black tracking-[0.4em] text-[#f4d08a]">
                {pinState.generatedPin}
              </div>

              <p className="mt-4 text-sm leading-7 text-[#bfa785]">
                أعطِ هذا الرقم للموظف. عند الدخول سيُطلب منه تغييره مباشرة.
              </p>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#d7c0a0]">
                اسم الموظف
              </label>

              <input
                name="full_name"
                type="text"
                defaultValue={employee.full_name}
                required
                className="w-full rounded-2xl border border-[#5b4128] bg-[#2b1d13] px-4 py-3 text-white outline-none transition focus:border-[#d4a54b]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#d7c0a0]">
                كود الموظف
              </label>

              <input
                name="employee_code"
                type="text"
                defaultValue={employee.employee_code}
                required
                className="w-full rounded-2xl border border-[#5b4128] bg-[#2b1d13] px-4 py-3 text-white outline-none transition focus:border-[#d4a54b]"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#d7c0a0]">
                الدور الوظيفي
              </label>

              <select
                name="role"
                defaultValue={employee.role}
                required
                className="w-full rounded-2xl border border-[#5b4128] bg-[#2b1d13] px-4 py-3 text-white outline-none focus:border-[#d4a54b]"
              >
                <option value="manager">مدير</option>
                <option value="cashier">كاشير</option>
                <option value="kitchen">المطبخ</option>
                <option value="waiter">نادل</option>
              </select>
            </div>

            <div className="rounded-2xl border border-[#5b4128] bg-[#2b1d13] p-5">
              <p className="text-sm font-bold text-[#d7c0a0]">
                حالة تغيير PIN
              </p>
              <p className="mt-2 text-sm leading-7 text-[#bfa785]">
                {employee.pin_must_change
                  ? "الموظف سيُجبر على تغيير PIN عند الدخول القادم."
                  : "الموظف يستخدم PIN خاص به حاليًا."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="active"
              name="active"
              type="checkbox"
              defaultChecked={employee.active}
              className="h-5 w-5"
            />

            <label htmlFor="active" className="text-white">
              الموظف نشط ويمكنه تسجيل الدخول
            </label>
          </div>

          <div className="flex flex-wrap gap-4 pt-6">
            <SubmitButton />

            <button
              type="button"
              onClick={handleRegeneratePin}
              disabled={isPending}
              className="rounded-2xl border border-[#c89b3c] px-8 py-3 font-bold text-[#f4d08a] transition hover:bg-[#2b1d13] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "جاري التوليد..." : "توليد PIN جديد"}
            </button>

            <Link
              href={`/branch/${branchId}/employees`}
              className="rounded-2xl border border-[#5b4128] px-8 py-3 font-bold text-white transition hover:bg-[#2b1d13]"
            >
              رجوع
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
