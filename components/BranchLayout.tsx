import DashboardSidebar from "@/components/DashboardSidebar";

export default function BranchLayout({
  branchId,
  children,
}: {
  branchId: string;
  children: React.ReactNode;
}) {
  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] text-white">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "calc(20% + 16px) calc(80% - 16px)",
          minHeight: "100vh",
          width: "100vw",
        }}
      >
        <DashboardSidebar firstBranchId={branchId} />

        <section className="min-h-screen bg-[#8caf99] px-8 py-8 text-[#111827]">
          {children}
        </section>
      </div>
    </main>
  );
}