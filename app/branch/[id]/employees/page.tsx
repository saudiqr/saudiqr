import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BranchPageHeader from "@/components/BranchPageHeader";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EmployeesPage({ params }: PageProps) {
  const { id: branchId } = await params;

  const { data: employees } = await supabase
    .from("employees")
    .select(`
      id,
      employee_code,
      full_name,
      role,
      active,
      created_at
    `)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });

  const total = employees?.length ?? 0;
  const active = employees?.filter((e) => e.active).length ?? 0;
  const inactive = total - active;

  return (
    <div className="space-y-6">
      <BranchPageHeader
  title="إدارة الموظفين"
  description="إدارة موظفي الفرع وأدوارهم وصلاحيات الدخول"
  branchId={branchId}
/>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[#7a5a22] bg-[#22170f] p-6 text-white shadow-xl">
          <p className="text-sm text-[#d8c3a5]">إجمالي الموظفين</p>
          <h2 className="mt-2 text-4xl font-bold text-[#f4d08a]">
            {total}
          </h2>
        </div>

        <div className="rounded-3xl border border-[#7a5a22] bg-[#22170f] p-6 text-white shadow-xl">
          <p className="text-sm text-[#d8c3a5]">الموظفون النشطون</p>
          <h2 className="mt-2 text-4xl font-bold text-green-400">
            {active}
          </h2>
        </div>

        <div className="rounded-3xl border border-[#7a5a22] bg-[#22170f] p-6 text-white shadow-xl">
          <p className="text-sm text-[#d8c3a5]">الموظفون الموقوفون</p>
          <h2 className="mt-2 text-4xl font-bold text-red-400">
            {inactive}
          </h2>
        </div>
      </div>

      <div className="rounded-3xl border border-[#7a5a22] bg-[#22170f] p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              قائمة الموظفين
            </h2>
            <p className="text-sm text-[#cdb89d]">
              جميع موظفي هذا الفرع
            </p>
          </div>

          <Link
            href={`/branch/${branchId}/employees/new`}
            className="rounded-xl bg-[#b8892d] px-5 py-3 font-semibold text-black transition hover:bg-[#d6a847]"
          >
            + إضافة موظف
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#4b3522]">
          <table className="w-full text-right">
            <thead className="bg-[#2b1d13]">
              <tr className="text-[#f2d9a2]">
                <th className="p-4">رقم الموظف</th>
                <th className="p-4">الاسم</th>
                <th className="p-4">الدور</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {employees?.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-t border-[#3b291a] text-white hover:bg-[#2a1c13]"
                >
                  <td className="p-4 font-mono">
                    {employee.employee_code}
                  </td>

                  <td className="p-4">
                    {employee.full_name}
                  </td>

                  <td className="p-4 capitalize">
                    {employee.role}
                  </td>

                  <td className="p-4">
                    {employee.active ? (
                      <span className="rounded-full bg-green-600/20 px-3 py-1 text-sm text-green-400">
                        نشط
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-600/20 px-3 py-1 text-sm text-red-400">
                        موقوف
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/branch/${branchId}/employees/${employee.id}`}
                        className="rounded-lg bg-[#3a2819] px-4 py-2 text-sm hover:bg-[#503524]"
                      >
                        عرض
                      </Link>

                      <Link
                        href={`/branch/${branchId}/employees/${employee.id}/edit`}
                        className="rounded-lg bg-[#b8892d] px-4 py-2 text-sm text-black hover:bg-[#d8a947]"
                      >
                        تعديل
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {!employees?.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-[#c7b6a0]"
                  >
                    لا يوجد موظفون حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}