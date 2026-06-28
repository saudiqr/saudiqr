"use client";

import { useState } from "react";

export default function BranchActionsMenu({
  branchId,
  defaultName,
  defaultCity,
  updateBranchAction,
  deleteBranchAction,
}: {
  branchId: string;
  defaultName: string;
  defaultCity: string;
  updateBranchAction: (formData: FormData) => void;
  deleteBranchAction: (formData: FormData) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"idle" | "first" | "final">(
    "idle"
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((value) => !value)}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#4A3425] bg-[#2A211C] text-3xl font-black text-[#DEA54B] transition hover:border-[#C68A3D]"
        aria-label="إجراءات الفرع"
      >
        ⋮
      </button>

      {menuOpen && (
        <div className="absolute left-0 top-14 z-40 w-64 overflow-hidden rounded-3xl border border-[#4A3425] bg-[#241B16] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setEditOpen(true);
            }}
            className="w-full rounded-2xl px-4 py-3 text-right text-base font-black text-[#FFF8F0] transition hover:bg-[#2A211C]"
          >
            تعديل بيانات الفرع
          </button>

          <a
            href={`/branch/${branchId}/settings`}
            className="block rounded-2xl px-4 py-3 text-right text-base font-black text-[#FFF8F0] transition hover:bg-[#2A211C]"
          >
            إعدادات الفرع
          </a>

          <div className="my-2 h-px bg-[#4A3425]" />

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setDeleteStep("first");
            }}
            className="w-full rounded-2xl px-4 py-3 text-right text-base font-black text-[#D95C5C] transition hover:bg-[#D95C5C]/10"
          >
            حذف الفرع
          </button>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-[30px] border border-[#4A3425] bg-[#241B16] p-7 text-[#FFF8F0] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
            <h2 className="text-3xl font-black">تعديل بيانات الفرع</h2>

            <p className="mt-2 text-base leading-8 text-[#C8B6A4]">
              عدّل اسم الفرع والمدينة.
            </p>

            <form action={updateBranchAction} className="mt-6 space-y-4">
              <input type="hidden" name="branchId" value={branchId} />

              <label className="block">
                <span className="mb-2 block text-base font-bold text-[#C8B6A4]">
                  اسم الفرع
                </span>

                <input
                  name="name"
                  defaultValue={defaultName}
                  required
                  className="w-full rounded-2xl border border-[#4A3425] bg-[#1C1612] px-4 py-4 text-lg font-bold text-[#FFF8F0] outline-none transition focus:border-[#C68A3D]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-base font-bold text-[#C8B6A4]">
                  المدينة
                </span>

                <input
                  name="city"
                  defaultValue={defaultCity}
                  className="w-full rounded-2xl border border-[#4A3425] bg-[#1C1612] px-4 py-4 text-lg font-bold text-[#FFF8F0] outline-none transition focus:border-[#C68A3D]"
                />
              </label>

              <div className="grid gap-3 pt-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-2xl border border-[#4A3425] px-5 py-4 text-lg font-black text-[#FFF8F0] transition hover:border-[#C68A3D]"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="rounded-2xl bg-[#C68A3D] px-5 py-4 text-lg font-black text-[#16110E] transition hover:bg-[#DEA54B]"
                >
                  حفظ التعديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteStep !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-[30px] border border-[#4A3425] bg-[#241B16] p-7 text-[#FFF8F0] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
            {deleteStep === "first" && (
              <>
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-[#D95C5C]/40 bg-[#D95C5C]/10 text-4xl">
                  ⚠️
                </div>

                <h2 className="text-3xl font-black">هل أنت متأكد؟</h2>

                <p className="mt-3 text-lg leading-9 text-[#C8B6A4]">
                  سيتم حذف هذا الفرع من النظام. هذا الإجراء حساس وقد يؤثر على
                  البيانات المرتبطة به.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStep("idle")}
                    className="rounded-2xl border border-[#4A3425] px-5 py-4 text-lg font-black text-[#FFF8F0] transition hover:border-[#C68A3D]"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteStep("final")}
                    className="rounded-2xl bg-[#D95C5C] px-5 py-4 text-lg font-black text-white transition hover:opacity-90"
                  >
                    نعم، متأكد
                  </button>
                </div>
              </>
            )}

            {deleteStep === "final" && (
              <>
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-[#D95C5C]/40 bg-[#D95C5C]/10 text-4xl">
                  🗑️
                </div>

                <h2 className="text-3xl font-black">تأكيد نهائي</h2>

                <p className="mt-3 text-lg leading-9 text-[#C8B6A4]">
                  سيتم حذف الفرع. تأكد أنك لا تحتاج بيانات هذا الفرع قبل
                  المتابعة.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStep("first")}
                    className="rounded-2xl border border-[#4A3425] px-5 py-4 text-lg font-black text-[#FFF8F0] transition hover:border-[#C68A3D]"
                  >
                    رجوع
                  </button>

                  <form action={deleteBranchAction}>
                    <input type="hidden" name="branchId" value={branchId} />

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-[#D95C5C] px-5 py-4 text-lg font-black text-white transition hover:opacity-90"
                    >
                      تأكيد الحذف
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
