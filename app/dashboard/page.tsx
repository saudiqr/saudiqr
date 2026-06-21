"use client";

import DashboardSidebar from "@/components/DashboardSidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);
  const [branchIndex, setBranchIndex] = useState<Record<string, number>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase
        .from("businesses")
        .select(`
          id,
          name,
          created_at,
          branches (
            id,
            name,
            city,
            subscription_status
          )
        `)
        .order("created_at", { ascending: false });

      setBusinesses(data || []);
      setError(error);
    }

    loadData();
  }, []);

  const allBranches = businesses.flatMap((b: any) => b.branches || []);
  const firstBranchId = allBranches[0]?.id;

  const branchPath = (page: string) =>
    firstBranchId ? `/branch/${firstBranchId}/${page}` : "/dashboard";

  function nextBranch(businessId: string, total: number) {
    setBranchIndex((prev) => ({
      ...prev,
      [businessId]: ((prev[businessId] || 0) + 1) % total,
    }));
  }

  function toggleAll(businessId: string) {
    setShowAll((prev) => ({
      ...prev,
      [businessId]: !prev[businessId],
    }));
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#06140f",
        color: "white",
        overflowX: "hidden",
      }}
    >
      <style>{`
        .side-link:hover {
          background: rgba(16,185,129,0.16) !important;
          color: #10b981 !important;
          box-shadow: 0 0 18px rgba(16,185,129,0.16);
        }

        .branch-action:hover {
          background: #10b981 !important;
          color: black !important;
          border-color: #10b981 !important;
        }
      `}</style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "calc(20% + 16px) calc(80% - 16px)",
          minHeight: "100vh",
          width: "100vw",
        }}
      >
        <DashboardSidebar firstBranchId={firstBranchId} />

        <section
          style={{
            width: "100%",
            minHeight: "100vh",
            padding: "32px",
            boxSizing: "border-box",
            background: "#8caf99",
            color: "#111827",
          }}
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(0,0,0,0.15)",
              paddingBottom: "24px",
              marginBottom: "36px",
            }}
          >
            <div>
              <h1 style={{ fontSize: "30px", fontWeight: 900 }}>
                لوحة تحكم SaudiQR
              </h1>
              <p style={{ marginTop: "8px", color: "#334155" }}>
                إدارة النشاطات التجارية والفروع والمنيو والـ QR
              </p>
            </div>

            <Link
              href="/business/new"
              style={{
                background: "#10b981",
                color: "black",
                padding: "16px 24px",
                borderRadius: "18px",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              + إنشاء نشاط جديد
            </Link>
          </header>

          <div
            style={{
              border: "2px solid rgba(16,185,129,0.45)",
              borderRadius: "32px",
              padding: "28px",
              background: "#06140f",
              color: "white",
              boxShadow: "0 0 24px rgba(16,185,129,0.18)",
            }}
          >
            <h2
              style={{
                fontSize: "34px",
                fontWeight: 900,
                marginBottom: "28px",
                color: "#ffffff",
              }}
            >
              نشاطاتي التجارية
            </h2>

            {error && (
              <div style={{ marginBottom: "24px", color: "#fca5a5" }}>
                حدث خطأ أثناء جلب البيانات: {error.message}
              </div>
            )}

            {businesses.length === 0 ? (
              <div
                style={{
                  border: "1px solid rgba(16,185,129,0.25)",
                  background: "#0b1f19",
                  borderRadius: "28px",
                  padding: "40px",
                  textAlign: "center",
                }}
              >
                <h3 style={{ fontSize: "24px", fontWeight: 900 }}>
                  لا يوجد نشاط تجاري حتى الآن
                </h3>
                <p style={{ marginTop: "12px", color: "#d1d5db" }}>
                  أنشئ أول نشاط تجاري ثم أضف الفروع والمنيو.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "24px",
                  width: "100%",
                }}
              >
                {businesses.map((business: any) => {
                  const branches = business.branches || [];
                  const currentIndex = branchIndex[business.id] || 0;
                  const currentBranch = branches[currentIndex];
                  const isAllOpen = showAll[business.id];

                  return (
                    <div
                      key={business.id}
                      style={{
                        background: "linear-gradient(180deg,#0d241d,#081611)",
                        border: "1px solid rgba(16,185,129,0.35)",
                        borderRadius: "28px",
                        padding: "24px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "16px",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              fontSize: "24px",
                              fontWeight: 900,
                              color: "#ffffff",
                              lineHeight: "1.6",
                            }}
                          >
                            {business.name}
                          </h3>

                          <p style={{ marginTop: "8px", color: "#ffffff" }}>
                            عدد الفروع: {branches.length}
                          </p>
                        </div>

                        <Link
                          href={`/branch/new?business_id=${business.id}`}
                          style={{
                            background: "#10b981",
                            color: "black",
                            padding: "14px 18px",
                            borderRadius: "18px",
                            fontWeight: 900,
                            textDecoration: "none",
                            height: "fit-content",
                          }}
                        >
                          + إضافة فرع
                        </Link>
                      </div>

                      <div style={{ marginTop: "24px" }}>
                        {branches.length > 0 ? (
                          <>
                            {!isAllOpen && currentBranch && (
                              <BranchRow branch={currentBranch} />
                            )}

                            {isAllOpen && (
                              <div
                                style={{
                                  maxHeight: "220px",
                                  overflowY: "auto",
                                  paddingLeft: "4px",
                                }}
                              >
                                {branches.map((branch: any) => (
                                  <BranchRow key={branch.id} branch={branch} />
                                ))}
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                marginTop: "12px",
                                flexWrap: "wrap",
                              }}
                            >
                              {branches.length > 1 && !isAllOpen && (
  <button
    onClick={() =>
      setBranchIndex((prev) => ({
        ...prev,
        [business.id]:
          ((prev[business.id] || 0) - 1 + branches.length) %
          branches.length,
      }))
    }
    className="branch-action"
    style={{
      background: "transparent",
      border: "1px solid rgba(16,185,129,0.45)",
      color: "#10b981",
      padding: "9px 12px",
      borderRadius: "12px",
      fontWeight: 900,
      cursor: "pointer",
    }}
  >
    الفرع السابق
  </button>
)}
                              {branches.length > 1 && !isAllOpen && (
                                <button
                                  onClick={() => nextBranch(business.id, branches.length)}
                                  className="branch-action"
                                  style={{
                                    background: "transparent",
                                    border: "1px solid rgba(16,185,129,0.45)",
                                    color: "#10b981",
                                    padding: "9px 12px",
                                    borderRadius: "12px",
                                    fontWeight: 900,
                                    cursor: "pointer",
                                  }}
                                >
                                 الفرع التالي
                                </button>
                              )}

                              {branches.length > 1 && (
                                <button
                                  onClick={() => toggleAll(business.id)}
                                  className="branch-action"
                                  style={{
                                    background: "transparent",
                                    border: "1px solid rgba(16,185,129,0.45)",
                                    color: "#10b981",
                                    padding: "9px 12px",
                                    borderRadius: "12px",
                                    fontWeight: 900,
                                    cursor: "pointer",
                                  }}
                                >
                                  {isAllOpen ? "إخفاء جميع الفروع" : "عرض كل الفروع"}
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <p style={{ color: "#ffffff", fontWeight: 700 }}>
                            لا توجد فروع لهذا النشاط بعد.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function BranchRow({ branch }: { branch: any }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        border: "1px solid rgba(16,185,129,0.22)",
        background: "#07130f",
        borderRadius: "20px",
        padding: "16px",
        marginBottom: "12px",
      }}
    >
      <div>
        <p style={{ fontWeight: 900, color: "#ffffff" }}>{branch.name}</p>
        <p style={{ marginTop: "6px", color: "#ffffff" }}>
          {branch.city || "بدون مدينة"} • الاشتراك:{" "}
          {branch.subscription_status || "inactive"}
        </p>
      </div>

      <Link
        href={`/branch/${branch.id}`}
        style={{
          color: "white",
          border: "1px solid rgba(255,255,255,0.6)",
          padding: "10px 14px",
          borderRadius: "12px",
          fontWeight: 900,
          textDecoration: "none",
        }}
      >
        إدارة
      </Link>
    </div>
  );
}

function SideLink({
  href,
  text,
  icon,
  active = false,
}: {
  href: string;
  text: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className="side-link"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "16px 18px",
        borderRadius: "18px",
        background: active ? "rgba(16,185,129,0.14)" : "transparent",
        color: active ? "#10b981" : "#d1d5db",
        textDecoration: "none",
        fontWeight: 800,
        fontSize: "16px",
        boxSizing: "border-box",
        transition: "0.2s",
      }}
    >
      <span>{text}</span>
      <span style={{ fontSize: "22px" }}>{icon}</span>
    </Link>
  );
}