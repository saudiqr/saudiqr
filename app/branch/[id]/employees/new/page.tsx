import Link from "next/link";
import BranchPageHeader from "@/components/BranchPageHeader";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewEmployeePage({ params }: PageProps) {
  const { id: branchId } = await params;

  return (
    <div className="space-y-6">
      <BranchPageHeader
        title="إضافة موظف"
        description="إضافة موظف جديد مع كود دخول يدوي و PIN خاص به"
        branchId={branchId}
      />

      <div className="rounded-3xl border border-[#7a5a22] bg-[#22170f] p-8 shadow-xl">
        <form className="grid gap-6">
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
                يقبل أرقام وحروف ورموز. يجب ألا يكون مكررًا داخل نفس الفرع.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#d7c0a0]">
                رقم PIN
              </label>

              <input
                name="pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                minLength={4}
                placeholder="من 4 إلى 6 أرقام"
                required
                className="w-full rounded-2xl border border-[#5b4128] bg-[#2b1d13] px-4 py-3 text-white outline-none transition focus:border-[#d4a54b]"
              />

              <p className="mt-2 text-xs text-[#bfa785]">
                الـ PIN يستخدم لتسجيل دخول الموظف من صفحة الموظفين.
              </p>
            </div>

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
            <button
              type="submit"
              className="rounded-2xl bg-[#c89b3c] px-8 py-3 font-bold text-black transition hover:bg-[#ddb258]"
            >
              حفظ الموظف
            </button>

            <Link
              href={`/branch/${branchId}/employees`}
              className="rounded-2xl border border-[#5b4128] px-8 py-3 font-bold text-white transition hover:bg-[#2b1d13]"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}