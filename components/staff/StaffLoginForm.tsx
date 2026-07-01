"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";
import { staffLoginAction, type StaffLoginState } from "@/app/staff/actions";

type Props = {
  branchId: string | null;
  branchName: string;
  subdomain?: string | null;
};

type ActiveField = "employee_code" | "pin";

const initialState: StaffLoginState = {
  ok: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-[#d8a342] font-black text-[#160f09] shadow-xl transition hover:bg-[#efbd61] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "جاري الدخول..." : "دخول الموظف"}
    </button>
  );
}

export default function StaffLoginForm({
  branchId,
  branchName,
  subdomain,
}: Props) {
  const [pin, setPin] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [activeField, setActiveField] = useState<ActiveField>("employee_code");
  const [state, formAction] = useActionState(staffLoginAction, initialState);

  useEffect(() => {
    if (state.message) {
      setPin("");
      setActiveField("pin");
    }
  }, [state.message]);

  const pinDots = Array.from({ length: 4 }, (_, index) => (
    <span
      key={index}
      className={`h-3.5 w-3.5 rounded-full border ${
        index < pin.length
          ? "border-[#f5d18a] bg-[#f5d18a]"
          : "border-[#6b4a25] bg-[#1b120c]"
      }`}
    />
  ));

  return (
    <div className="w-full max-w-[520px] rounded-[28px] border border-[#6b4a25] bg-[#1b120c]/95 p-4 shadow-2xl shadow-black/30">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#6b4a25] bg-[#2a1b11] text-3xl">
          ☕
        </div>

        <p className="text-xs font-black text-[#d8a342]">KARZ Staff Access</p>
        <h1 className="mt-1 text-2xl font-black text-[#fff7ed]">
          دخول الموظفين
        </h1>

        <p className="mt-1 text-xs font-bold leading-6 text-[#bfa789]">
          {branchName}
          {subdomain ? ` · ${subdomain}.karz.sa` : ""}
        </p>
      </div>

      {!branchId ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm font-bold leading-7 text-red-200">
          لم يتم ربط هذا الرابط بفرع. أثناء التطوير افتح الصفحة بهذا الشكل:
          <br />
          /staff?branch_id=BRANCH_ID
        </div>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="branch_id" value={branchId} />
          <input type="hidden" name="employee_code" value={employeeCode} />
          <input type="hidden" name="pin" value={pin} />

          <div className="space-y-3">
            <div className="grid grid-cols-[1.35fr_1fr] gap-3">
              <button
                type="button"
                onClick={() => setActiveField("employee_code")}
                className={`rounded-2xl border px-3 py-3 text-center transition ${
                  activeField === "employee_code"
                    ? "border-[#d8a342] bg-[#2f2014]"
                    : "border-[#6b4a25] bg-[#261910]"
                }`}
              >
                <span className="block text-xs font-black text-[#d9c3a4]">
                  كود الموظف
                </span>

                <strong className="mt-1 block min-h-7 truncate text-xl font-black tracking-widest text-[#fff7ed]">
                  {employeeCode || "اكتب الكود"}
                </strong>
              </button>

              <button
                type="button"
                onClick={() => setActiveField("pin")}
                className={`rounded-2xl border px-3 py-3 transition ${
                  activeField === "pin"
                    ? "border-[#d8a342] bg-[#2f2014]"
                    : "border-[#6b4a25] bg-[#261910]"
                }`}
              >
                <span className="mb-2 block text-center text-xs font-black text-[#d9c3a4]">
                  PIN
                </span>

                <span className="flex h-7 items-center justify-center gap-2">
                  {pinDots}
                </span>
              </button>
            </div>

            <div className="rounded-3xl border border-[#6b4a25] bg-[#120c08] p-3">
              {activeField === "employee_code" ? (
                <VirtualKeyboard
                  value={employeeCode}
                  onChange={(value) =>
                    setEmployeeCode(value.trimStart().toUpperCase())
                  }
                  mode="text"
                  maxLength={20}
                  onEnter={() => setActiveField("pin")}
                />
              ) : (
                <VirtualKeyboard
                  value={pin}
                  onChange={setPin}
                  mode="pin"
                  maxLength={4}
                />
              )}
            </div>

            {state.message ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs font-bold leading-6 text-red-200">
                {state.message}
              </div>
            ) : null}

            <SubmitButton />
          </div>
        </form>
      )}

      <p className="mt-3 text-center text-[11px] font-bold leading-5 text-[#7c6651]">
        جلسة واحدة فقط لكل موظف. الدخول من جهاز جديد يلغي الجهاز القديم.
      </p>
    </div>
  );
}
