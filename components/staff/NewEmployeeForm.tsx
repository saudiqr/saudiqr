"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createEmployeeAction,
  type CreateEmployeeState,
} from "@/app/branch/[id]/employees/new/actions";

type NewEmployeeFormProps = {
  branchId: string;
};

const initialState: CreateEmployeeState = {
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
      {pending ? "جاري الحفظ..." : "حفظ الموظف"}
    </button>
  );
}

export default function NewEmployeeForm({ branchId }: NewEmployeeFormProps) {
  const [state, formAction] = useActionState(
    createEmployeeAction.bind(null, branchId),
    initialState
  );

  return (
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

        {state.generatedPin && (
          <div className="rounded-3xl border border-[#c89b3c]/60 bg-[#130d08] p-6 text-center">
            <p className="text-sm font-bold text-[#d7c0a0]">
              PIN المؤقت للموظف
            </p>

            <div className="mt-3 rounded-2xl border border-[#7a5a22] bg-[#2b1d13] px-6 py-5 font-mono text-5xl font-black tracking-[0.4em] text-[#f4d08a]">
              {state.generatedPin}
            </div>

            <p className="mt-4 text-sm leading-7 text-[#bfa785]">
              أعطِ هذا الرقم للموظف. عند أول دخول سيُطلب منه تغيير PIN إلى رقم
              يحفظه هو. إذا نسيه لاحقًا، المدير يولد له PIN جديد.
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
              placeholder="مثال: محمد أحمد"
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
              placeholder="مثال: 1002 أو S-1001 أو C-1004"
              required
              className="w-full rounded-2xl border border-[#5b4128] bg-[#2b1d13] px-4 py-3 text-white outline-none transition focus:border-[#d4a54b]"
            />

            <p className="mt-2 text-xs text-[#bfa785]">
              يقبل أرقام وحروف ورموز. لا يمكن تكراره داخل نفس الفرع.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-[#d7c0a0]">
              الدور الوظيفي
            </label>

            <select
              name="role"
              required
              className="w-full rounded-2xl border border-[#5b4128] bg-[#2b1d13] px-4 py-3 text-white outline-none focus:border-[#d4a54b]"
            >
              <option value="">اختر الدور</option>
              <option value="manager">مدير</option>
              <option value="cashier">كاشير</option>
              <option value="kitchen">المطبخ</option>
              <option value="waiter">نادل</option>
            </select>
          </div>

          <div className="rounded-2xl border border-[#5b4128] bg-[#2b1d13] p-5">
            <p className="text-sm font-bold text-[#d7c0a0]">
              PIN الدخول
            </p>
            <p className="mt-2 text-sm leading-7 text-[#bfa785]">
              لا يتم إدخاله يدويًا. النظام يولد PIN مؤقت من 4 أرقام بعد الحفظ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="active"
            name="active"
            type="checkbox"
            defaultChecked
            className="h-5 w-5"
          />

          <label htmlFor="active" className="text-white">
            الموظف نشط ويمكنه تسجيل الدخول
          </label>
        </div>

        <div className="flex gap-4 pt-6">
          <SubmitButton />

          <Link
            href={`/branch/${branchId}/employees`}
            className="rounded-2xl border border-[#5b4128] px-8 py-3 font-bold text-white transition hover:bg-[#2b1d13]"
          >
            رجوع
          </Link>
        </div>
      </form>
    </div>
  );
}
