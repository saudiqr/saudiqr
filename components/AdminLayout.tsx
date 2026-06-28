import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main dir="rtl" style={shellStyle}>
      <aside style={sidebarStyle}>
        <AdminSidebar />
      </aside>

      <section style={contentStyle}>{children}</section>
    </main>
  );
}

const shellStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "calc(20% + 16px) calc(80% - 16px)",
  width: "100vw",
  height: "100vh",
  minHeight: "100vh",
  overflow: "hidden",
  background: "#06140f",
};

const sidebarStyle: React.CSSProperties = {
  height: "100vh",
  overflowY: "auto",
  overflowX: "hidden",
  background: "#06140f",
};

const contentStyle: React.CSSProperties = {
  height: "100vh",
  overflowY: "auto",
  overflowX: "hidden",
  padding: "32px",
  background: "#06140f",
  color: "#ffffff",
};
