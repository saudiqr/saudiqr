"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type StaffRole = "owner" | "manager" | "cashier" | "kitchen" | "waiter";
type StaffStatus = "active" | "disabled";

type PermissionKey =
  | "orders"
  | "kitchen"
  | "cashier"
  | "tables"
  | "waiter_calls"
  | "bill_requests"
  | "stats"
  | "reviews"
  | "products"
  | "categories"
  | "settings";

type StaffMember = {
  id: string;
  branch_id: string;
  user_id: string | null;
  email: string;
  phone: string | null;
  role: StaffRole;
  permissions: PermissionKey[] | null;
  status: StaffStatus;
  created_at: string;
};

const roleLabels: Record<StaffRole, string> = {
  owner: "مالك",
  manager: "مدير",
  cashier: "كاشير",
  kitchen: "مطبخ",
  waiter: "نادل",
};

const statusLabels: Record<StaffStatus, string> = {
  active: "نشط",
  disabled: "معطل",
};

const permissionOptions: { key: PermissionKey; label: string }[] = [
  { key: "orders", label: "الطلبات" },
  { key: "kitchen", label: "المطبخ" },
  { key: "cashier", label: "الكاشير" },
  { key: "tables", label: "الطاولات" },
  { key: "waiter_calls", label: "استدعاء النادل" },
  { key: "bill_requests", label: "طلبات الفاتورة" },
  { key: "stats", label: "الإحصائيات" },
  { key: "reviews", label: "التقييمات" },
  { key: "products", label: "المنتجات" },
  { key: "categories", label: "الأقسام" },
  { key: "settings", label: "الإعدادات" },
];

const defaultPermissionsByRole: Record<StaffRole, PermissionKey[]> = {
  owner: [
    "orders",
    "kitchen",
    "cashier",
    "tables",
    "waiter_calls",
    "bill_requests",
    "stats",
    "reviews",
    "products",
    "categories",
    "settings",
  ],
  manager: [
    "orders",
    "kitchen",
    "cashier",
    "tables",
    "waiter_calls",
    "bill_requests",
    "stats",
    "reviews",
    "products",
    "categories",
  ],
  cashier: ["orders", "cashier", "bill_requests", "tables"],
  kitchen: ["orders", "kitchen"],
  waiter: ["orders", "tables", "waiter_calls", "bill_requests"],
};

export default function StaffPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("waiter");
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>(
    defaultPermissionsByRole.waiter
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const activeCount = useMemo(
    () => staff.filter((member) => member.status === "active").length,
    [staff]
  );

  const disabledCount = useMemo(
    () => staff.filter((member) => member.status === "disabled").length,
    [staff]
  );

  useEffect(() => {
    loadStaff();
  }, [branchId]);

  function changeRole(nextRole: StaffRole) {
    setRole(nextRole);
    setSelectedPermissions(defaultPermissionsByRole[nextRole]);
  }

  function toggleNewPermission(permission: PermissionKey) {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  }

  function getMemberPermissions(member: StaffMember) {
    return member.permissions && member.permissions.length > 0
      ? member.permissions
      : defaultPermissionsByRole[member.role];
  }

  async function loadStaff() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("branch_staff")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("حدث خطأ أثناء تحميل الموظفين.");
      setStaff([]);
    } else {
      setStaff((data || []) as StaffMember[]);
    }

    setLoading(false);
  }

  async function addStaff() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanEmail) {
      setMessage("اكتب بريد الموظف أولاً.");
      return;
    }

    if (!cleanPhone) {
      setMessage("اكتب رقم جوال الموظف.");
      return;
    }

    if (selectedPermissions.length === 0) {
      setMessage("اختر صلاحية واحدة على الأقل للموظف.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("branch_staff").insert({
      branch_id: branchId,
      email: cleanEmail,
      phone: cleanPhone,
      role,
      permissions: selectedPermissions,
      status: "active",
    });

    if (error) {
      setMessage("تعذر إضافة الموظف. تأكد من تنفيذ كود SQL الخاص بالصلاحيات.");
    } else {
      setEmail("");
      setPhone("");
      setRole("waiter");
      setSelectedPermissions(defaultPermissionsByRole.waiter);
      setMessage("تمت إضافة الموظف بنجاح.");
      await loadStaff();
    }

    setSaving(false);
  }

  async function toggleMemberPermission(
    member: StaffMember,
    permission: PermissionKey
  ) {
    const currentPermissions = getMemberPermissions(member);
    const nextPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter((item) => item !== permission)
      : [...currentPermissions, permission];

    if (nextPermissions.length === 0) {
      setMessage("لا يمكن حذف كل الصلاحيات من الموظف.");
      return;
    }

    setMessage("");

    const { error } = await supabase
      .from("branch_staff")
      .update({ permissions: nextPermissions })
      .eq("id", member.id);

    if (error) {
      setMessage("تعذر تحديث صلاحيات الموظف.");
      return;
    }

    setStaff((current) =>
      current.map((item) =>
        item.id === member.id ? { ...item, permissions: nextPermissions } : item
      )
    );
  }

  async function toggleStatus(member: StaffMember) {
    const nextStatus: StaffStatus =
      member.status === "active" ? "disabled" : "active";

    setMessage("");

    const { error } = await supabase
      .from("branch_staff")
      .update({ status: nextStatus })
      .eq("id", member.id);

    if (error) {
      setMessage("تعذر تحديث حالة الموظف.");
      return;
    }

    setStaff((current) =>
      current.map((item) =>
        item.id === member.id ? { ...item, status: nextStatus } : item
      )
    );
  }

  async function deleteStaff(memberId: string) {
    const confirmed = window.confirm("هل تريد حذف هذا الموظف؟");

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("branch_staff")
      .delete()
      .eq("id", memberId);

    if (error) {
      setMessage("تعذر حذف الموظف.");
      return;
    }

    setStaff((current) => current.filter((item) => item.id !== memberId));
  }

  return (
    <div
      dir="rtl"
      style={{
        width: "100%",
        minHeight: "100vh",
        color: "#FFF8F0",
        display: "grid",
        gap: "18px",
      }}
    >
      <header style={heroStyle}>
        <p style={eyebrowStyle}>SaudiQR Staff</p>

        <h1
          style={{
            margin: 0,
            fontSize: "38px",
            fontWeight: 950,
            color: "#FFF8F0",
          }}
        >
          الموظفين والصلاحيات
        </h1>

        <p
          style={{
            margin: "12px 0 0",
            color: "#C8B6A4",
            fontWeight: 800,
            fontSize: "16px",
          }}
        >
          صاحب المطعم يحدد لكل موظف الصفحات التي تظهر له، مع حفظ رقم الجوال لتفعيل واتساب لاحقاً.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "18px",
          marginTop: "22px",
        }}
      >
        <StatCard title="إجمالي الموظفين" value={staff.length} />
        <StatCard title="الموظفين النشطين" value={activeCount} />
        <StatCard title="الموظفين المعطلين" value={disabledCount} />
      </section>

      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <h2 style={sectionTitleStyle}>إضافة موظف جديد</h2>
            <p style={sectionSubtitleStyle}>
              اختر الدور، ثم عدّل الصلاحيات حسب رغبة صاحب المطعم.
            </p>
          </div>

          <span style={badgeStyle}>صلاحيات مخصصة</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 0.8fr auto",
            gap: "14px",
            marginTop: "18px",
          }}
        >
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="بريد الموظف"
            style={inputStyle}
          />

          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="رقم الجوال مثال: 9665xxxxxxxx"
            style={inputStyle}
          />

          <select
            value={role}
            onChange={(event) => changeRole(event.target.value as StaffRole)}
            style={inputStyle}
          >
            <option value="manager">مدير</option>
            <option value="cashier">كاشير</option>
            <option value="kitchen">مطبخ</option>
            <option value="waiter">نادل</option>
            <option value="owner">مالك</option>
          </select>

          <button
            onClick={addStaff}
            disabled={saving}
            style={{
              border: "0",
              borderRadius: "18px",
              padding: "0 28px",
              background: saving
                ? "#4A3425"
                : "linear-gradient(135deg, #C68A3D, #DEA54B)",
              color: "#16110E",
              fontWeight: 950,
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "16px",
              boxShadow: "0 12px 25px rgba(198,138,61,0.28)",
            }}
          >
            {saving ? "جاري الحفظ..." : "إضافة"}
          </button>
        </div>

        <div style={{ marginTop: "18px" }}>
          <p style={miniTitleStyle}>الصلاحيات التي ستظهر لهذا الموظف</p>

          <div style={permissionGridStyle}>
            {permissionOptions.map((permission) => (
              <PermissionChip
                key={permission.key}
                label={permission.label}
                checked={selectedPermissions.includes(permission.key)}
                onClick={() => toggleNewPermission(permission.key)}
              />
            ))}
          </div>
        </div>

        {message ? <p style={messageStyle}>{message}</p> : null}
      </section>

      <section style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "22px 24px",
            borderBottom: "1px solid rgba(198,138,61,0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <h2 style={sectionTitleStyle}>قائمة الموظفين</h2>
            <p style={sectionSubtitleStyle}>
              عدّل الصفحات التي تظهر لكل موظف مباشرة من القائمة.
            </p>
          </div>

          <button onClick={loadStaff} style={refreshButtonStyle}>
            تحديث
          </button>
        </div>

        {loading ? (
          <div style={emptyStyle}>جاري تحميل الموظفين...</div>
        ) : staff.length === 0 ? (
          <div style={emptyStyle}>لا يوجد موظفين حتى الآن.</div>
        ) : (
          <div style={{ display: "grid", gap: "14px", padding: "18px" }}>
            {staff.map((member) => {
              const memberPermissions = getMemberPermissions(member);

              return (
                <article key={member.id} style={staffCardStyle}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.8fr 0.7fr auto",
                      gap: "12px",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p style={staffEmailStyle}>{member.email}</p>
                      <p style={staffPhoneStyle}>
                        {member.phone || "رقم الجوال غير مضاف"}
                      </p>
                    </div>

                    <div>
                      <p style={staffLabelStyle}>الصلاحية الأساسية</p>
                      <strong style={staffValueStyle}>
                        {roleLabels[member.role]}
                      </strong>
                    </div>

                    <div>
                      <p style={staffLabelStyle}>الحالة</p>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "8px 12px",
                          borderRadius: "999px",
                          background:
                            member.status === "active"
                              ? "rgba(198,138,61,0.16)"
                              : "rgba(239,68,68,0.12)",
                          color:
                            member.status === "active" ? "#DEA54B" : "#F3B0B0",
                          fontWeight: 950,
                        }}
                      >
                        {statusLabels[member.status]}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => toggleStatus(member)}
                        style={{
                          ...smallButtonStyle,
                          background:
                            member.status === "active" ? "#C68A3D" : "#C68A3D",
                        }}
                      >
                        {member.status === "active" ? "تعطيل" : "تفعيل"}
                      </button>

                      <button
                        onClick={() => deleteStaff(member.id)}
                        style={{
                          ...smallButtonStyle,
                          background: "#C94F4F",
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: "16px" }}>
                    <p style={miniTitleStyle}>الصفحات المسموحة</p>

                    <div style={permissionGridStyle}>
                      {permissionOptions.map((permission) => (
                        <PermissionChip
                          key={`${member.id}-${permission.key}`}
                          label={permission.label}
                          checked={memberPermissions.includes(permission.key)}
                          onClick={() =>
                            toggleMemberPermission(member, permission.key)
                          }
                        />
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(36,27,22,0.98), rgba(42,33,28,0.98))",
        border: "1px solid rgba(198,138,61,0.38)",
        borderRadius: "24px",
        padding: "22px",
        boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#C8B6A4",
          fontWeight: 950,
          fontSize: "15px",
        }}
      >
        {title}
      </p>

      <strong
        style={{
          display: "block",
          marginTop: "12px",
          color: "#FFF8F0",
          fontWeight: 950,
          fontSize: "38px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function PermissionChip({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: checked
          ? "1px solid rgba(222,165,75,0.85)"
          : "1px solid rgba(148,163,184,0.22)",
        background: checked
          ? "rgba(198,138,61,0.20)"
          : "rgba(255,255,255,0.06)",
        color: checked ? "#DEA54B" : "#C8B6A4",
        borderRadius: "999px",
        padding: "11px 14px",
        fontWeight: 950,
        cursor: "pointer",
        textAlign: "center",
      }}
    >
      {checked ? "✓ " : "+ "}
      {label}
    </button>
  );
}

const heroStyle: React.CSSProperties = {
  marginBottom: "22px",
  background:
    "linear-gradient(135deg, rgba(36,27,22,0.98), rgba(22,17,14,0.98))",
  border: "1px solid rgba(198,138,61,0.42)",
  borderRadius: "28px",
  padding: "28px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#DEA54B",
  fontWeight: 900,
  fontSize: "15px",
};

const cardStyle: React.CSSProperties = {
  marginTop: "24px",
  background: "linear-gradient(135deg, rgba(36,27,22,0.98), rgba(22,17,14,0.98))",
  border: "1px solid rgba(198,138,61,0.38)",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 950,
  color: "#FFF8F0",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "14px",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "10px 14px",
  background: "rgba(198,138,61,0.16)",
  color: "#DEA54B",
  border: "1px solid rgba(198,138,61,0.28)",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(198,138,61,0.32)",
  borderRadius: "18px",
  padding: "16px",
  outline: "none",
  background: "#2A211C",
  color: "#FFF8F0",
  fontWeight: 850,
  fontSize: "15px",
  boxSizing: "border-box",
};

const permissionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "10px",
};

const miniTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#C8B6A4",
  fontWeight: 950,
  fontSize: "14px",
};

const messageStyle: React.CSSProperties = {
  marginTop: "16px",
  marginBottom: 0,
  color: "#DEA54B",
  fontWeight: 900,
};

const refreshButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(198,138,61,0.38)",
  background: "rgba(198,138,61,0.10)",
  color: "#DEA54B",
  borderRadius: "16px",
  padding: "12px 18px",
  fontWeight: 950,
  cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  padding: "28px",
  color: "#C8B6A4",
  fontWeight: 900,
};

const staffCardStyle: React.CSSProperties = {
  border: "1px solid rgba(198,138,61,0.22)",
  background: "rgba(42,33,28,0.88)",
  borderRadius: "22px",
  padding: "18px",
};

const staffEmailStyle: React.CSSProperties = {
  margin: 0,
  color: "#FFF8F0",
  fontWeight: 950,
  fontSize: "16px",
};

const staffPhoneStyle: React.CSSProperties = {
  margin: "7px 0 0",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "14px",
};

const staffLabelStyle: React.CSSProperties = {
  margin: "0 0 7px",
  color: "#C8B6A4",
  fontWeight: 900,
  fontSize: "12px",
};

const staffValueStyle: React.CSSProperties = {
  color: "#FFF8F0",
  fontWeight: 950,
  fontSize: "15px",
};

const smallButtonStyle: React.CSSProperties = {
  border: "0",
  borderRadius: "12px",
  padding: "10px 14px",
  color: "#FFF8F0",
  fontWeight: 950,
  cursor: "pointer",
};
