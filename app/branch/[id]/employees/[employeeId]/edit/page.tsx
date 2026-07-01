import { notFound } from "next/navigation";
import BranchPageHeader from "@/components/BranchPageHeader";
import { supabase } from "@/lib/supabase";
import EditEmployeeForm from "@/components/staff/EditEmployeeForm";

type PageProps = {
  params: Promise<{
    id: string;
    employeeId: string;
  }>;
};

export default async function EditEmployeePage({ params }: PageProps) {
  const { id: branchId, employeeId } = await params;

  const { data: employee } = await supabase
    .from("employees")
    .select("id, employee_code, full_name, role, active, pin_must_change, failed_login_attempts")
    .eq("id", employeeId)
    .eq("branch_id", branchId)
    .single();

  if (!employee) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BranchPageHeader
        title="تعديل موظف"
        description="تعديل بيانات الموظف أو إعادة توليد PIN جديد عند الحاجة"
        branchId={branchId}
      />

      <EditEmployeeForm branchId={branchId} employee={employee} />
    </div>
  );
}
