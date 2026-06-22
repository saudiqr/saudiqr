"use client";

import DashboardSidebar from "@/components/DashboardSidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);
  const [branchIndex, setBranchIndex] = useState<Record<string, number>>({});
  const [businessPage, setBusinessPage] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<any>(null);
const [editBusinessName, setEditBusinessName] = useState("");
const [deleteBusiness, setDeleteBusiness] = useState<any>(null);
const [deleteStep, setDeleteStep] = useState<1 | 2 | 3>(1);
const [deleteProgress, setDeleteProgress] = useState(0);

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

      if (error) {
        setBusinesses([]);
        setError(error);
        return;
      }

      const businessList = data || [];
      const branchIds = businessList.flatMap((business: any) =>
        (business.branches || []).map((branch: any) => branch.id)
      );

      let reviews: any[] = [];

      if (branchIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("branch_id, rating")
          .in("branch_id", branchIds);

        reviews = reviewsData || [];
      }

      const enrichedBusinesses = businessList.map((business: any) => {
        const branches = business.branches || [];
        const businessBranchIds = branches.map((branch: any) => branch.id);

        const businessReviews = reviews.filter((review: any) =>
          businessBranchIds.includes(review.branch_id)
        );

        const reviewsCount = businessReviews.length;

        const ratingAverage =
          reviewsCount > 0
            ? businessReviews.reduce(
                (sum: number, review: any) => sum + review.rating,
                0
              ) / reviewsCount
            : null;

        return {
          ...business,
          ratingAverage,
          reviewsCount,
        };
      });

      setBusinesses(enrichedBusinesses);
      setError(null);
    }

    loadData();
  }, []);

  const allBranches = businesses.flatMap((b: any) => b.branches || []);
  const firstBranchId = allBranches[0]?.id;
  const businessesPerPage = 2;

  const visibleBusinesses = businesses.slice(
    businessPage * businessesPerPage,
    businessPage * businessesPerPage + businessesPerPage
  );

  const totalBusinessPages = Math.ceil(businesses.length / businessesPerPage);

  function nextBranch(businessId: string, total: number) {
    setBranchIndex((prev) => ({
      ...prev,
      [businessId]: ((prev[businessId] || 0) + 1) % total,
    }));
  }
async function updateBusinessName() {
  if (!editingBusiness) return;

  const name = editBusinessName.trim();

  if (!name) {
    alert("اسم النشاط مطلوب");
    return;
  }

  const { error } = await supabase
    .from("businesses")
    .update({ name })
    .eq("id", editingBusiness.id);

  if (error) {
    alert(error.message);
    return;
  }

  setBusinesses((prev) =>
    prev.map((business) =>
      business.id === editingBusiness.id
        ? { ...business, name }
        : business
    )
  );

  setEditingBusiness(null);
}

async function confirmDeleteBusiness() {
  if (!deleteBusiness) return;

  setDeleteStep(3);
  setDeleteProgress(0);

  const timer = setInterval(() => {
    setDeleteProgress((prev) => {
      if (prev >= 100) {
        clearInterval(timer);
        return 100;
      }

      return prev + 10;
    });
  }, 120);

  setTimeout(async () => {
    const { error } = await supabase
      .from("businesses")
      .delete()
      .eq("id", deleteBusiness.id);

    if (error) {
      alert(error.message);
      setDeleteBusiness(null);
      setDeleteStep(1);
      setDeleteProgress(0);
      return;
    }

    setBusinesses((prev) =>
      prev.filter((business) => business.id !== deleteBusiness.id)
    );

    setDeleteProgress(100);

    setTimeout(() => {
      setDeleteBusiness(null);
      setDeleteStep(1);
      setDeleteProgress(0);
    }, 700);
  }, 1400);
}
  return (
    <main
      dir="rtl"
      onClick={() => setOpenMenu(null)}
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#06140f",
        color: "white",
        overflowX: "hidden",
      }}
    >
      <style>
        {`
        .menu-item{
          width:100%;
          display:flex;
          justify-content:center;
          align-items:center;
          padding:8px;
          color:white;
          text-decoration:none;
          transition:.2s;
          border-bottom:1px solid rgba(255,255,255,.08);
          background:transparent;
          cursor:pointer;
          font-weight:900;
          box-sizing:border-box;
        }

        .menu-item:hover{
          background:#0f2a22;
          color:#10b981;
        }

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
      `}
      </style>

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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                marginBottom: "28px",
              }}
            >
              <h2
                style={{
                  fontSize: "34px",
                  fontWeight: 900,
                  color: "#ffffff",
                  margin: 0,
                }}
              >
                نشاطاتي التجارية
              </h2>

              {businesses.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={() =>
                      setBusinessPage((prev) =>
                        prev === 0 ? totalBusinessPages - 1 : prev - 1
                      )
                    }
                    className="branch-action"
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(16,185,129,0.45)",
                      color: "#10b981",
                      padding: "10px 16px",
                      borderRadius: "14px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    النشاط السابق
                  </button>

                  <button
                    onClick={() =>
                      setBusinessPage((prev) =>
                        prev + 1 >= totalBusinessPages ? 0 : prev + 1
                      )
                    }
                    className="branch-action"
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(16,185,129,0.45)",
                      color: "#10b981",
                      padding: "10px 16px",
                      borderRadius: "14px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    النشاط التالي
                  </button>

                  <Link
                    href="/dashboard/branches"
                    className="branch-action"
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(16,185,129,0.45)",
                      color: "#10b981",
                      padding: "10px 16px",
                      borderRadius: "14px",
                      fontWeight: 900,
                      textDecoration: "none",
                    }}
                  >
                    عرض كل النشاطات
                  </Link>
                </div>
              )}
            </div>

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
                {visibleBusinesses.map((business: any) => {
                  const branches = business.branches || [];
                  const currentIndex = branchIndex[business.id] || 0;
                  const currentBranch = branches[currentIndex];

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
                          {businesses.length > 2 && (
                            <div
                              style={{
                                marginTop: "24px",
                                display: "flex",
                                gap: "12px",
                                justifyContent: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                onClick={() =>
                                  setBusinessPage((prev) =>
                                    prev === 0
                                      ? totalBusinessPages - 1
                                      : prev - 1
                                  )
                                }
                                className="branch-action"
                                style={{
                                  background: "transparent",
                                  border: "1px solid rgba(16,185,129,0.45)",
                                  color: "#10b981",
                                  padding: "10px 16px",
                                  borderRadius: "14px",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                }}
                              >
                                النشاط السابق
                              </button>

                              <button
                                onClick={() =>
                                  setBusinessPage((prev) =>
                                    prev + 1 >= totalBusinessPages
                                      ? 0
                                      : prev + 1
                                  )
                                }
                                className="branch-action"
                                style={{
                                  background: "transparent",
                                  border: "1px solid rgba(16,185,129,0.45)",
                                  color: "#10b981",
                                  padding: "10px 16px",
                                  borderRadius: "14px",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                }}
                              >
                                النشاط التالي
                              </button>

                              <Link
                                href="/dashboard/branches"
                                className="branch-action"
                                style={{
                                  background: "transparent",
                                  border: "1px solid rgba(16,185,129,0.45)",
                                  color: "#10b981",
                                  padding: "10px 16px",
                                  borderRadius: "14px",
                                  fontWeight: 900,
                                  textDecoration: "none",
                                }}
                              >
                                عرض كل النشاطات
                              </Link>
                            </div>
                          )}

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

                          <p style={{ marginTop: "8px", color: "#d1d5db" }}>
                            التقييم العام:{" "}
                            {business.ratingAverage !== null
                              ? `⭐ ${Number(business.ratingAverage).toFixed(1)} (${business.reviewsCount} تقييم)`
                              : "لا توجد تقييمات"}
                          </p>
                        </div>

                        <div style={{ position: "relative" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();

                              setOpenMenu(
                                openMenu === business.id ? null : business.id
                              );
                            }}
                            style={{
                              background: "transparent",
                              border: "1px solid rgba(16,185,129,.3)",
                              color: "#10b981",
                              width: "44px",
                              height: "44px",
                              borderRadius: "12px",
                              cursor: "pointer",
                              fontSize: "24px",
                              fontWeight: "bold",
                            }}
                          >
                            ⋮
                          </button>

                          {openMenu === business.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                top: "45px",
                                left: 0,
                                width: "150px",
                                background: "#07130f",
                                border: "1px solid rgba(16,185,129,.25)",
                                borderRadius: "16px",
                                overflow: "hidden",
                                zIndex: 999,
                              }}
                            >
                              <Link
  href={`/branch/new?business_id=${business.id}`}
  className="menu-item"
>
  إضافة فرع جديد
</Link>

                              <Link
  href={`/dashboard/branches?business_id=${business.id}`}
  className="menu-item"
>
  إدارة النشاط
</Link>

                              <button
  className="menu-item"
  onClick={() => {
    setEditingBusiness(business);
    setEditBusinessName(business.name);
    setOpenMenu(null);
  }}
>
  تعديل إسم النشاط
</button>
                              <button
  className="menu-item"
  style={{ color: "#ef4444" }}
  onClick={() => {
    setDeleteBusiness(business);
    setDeleteStep(1);
    setDeleteProgress(0);
    setOpenMenu(null);
  }}
>
  حذف النشاط
</button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: "24px" }}>
                        {branches.length > 0 ? (
                          <>
                            {currentBranch && <BranchRow branch={currentBranch} />}

                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                marginTop: "12px",
                                flexWrap: "wrap",
                              }}
                            >
                              {branches.length > 1 && (
                                <button
                                  onClick={() =>
                                    setBranchIndex((prev) => ({
                                      ...prev,
                                      [business.id]:
                                        ((prev[business.id] || 0) -
                                          1 +
                                          branches.length) %
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

                              {branches.length > 1 && (
                                <button
                                  onClick={() =>
                                    nextBranch(business.id, branches.length)
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
                                  الفرع التالي
                                </button>
                              )}

                              {branches.length > 1 && (
                                <Link
                                  href={`/dashboard/branches?business_id=${business.id}`}
                                  className="branch-action"
                                  style={{
                                    background: "transparent",
                                    border: "1px solid rgba(16,185,129,0.45)",
                                    color: "#10b981",
                                    padding: "9px 12px",
                                    borderRadius: "12px",
                                    fontWeight: 900,
                                    textDecoration: "none",
                                  }}
                                >
                                  عرض كل الفروع
                                </Link>
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

      {editingBusiness && (
        <div
          onClick={() => setEditingBusiness(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "420px",
              background: "#07130f",
              border: "1px solid rgba(16,185,129,.35)",
              borderRadius: "24px",
              padding: "24px",
              color: "white",
            }}
          >
            <h3
              style={{
                fontSize: "22px",
                fontWeight: 900,
                marginBottom: "16px",
              }}
            >
              تعديل النشاط
            </h3>

            <input
              value={editBusinessName}
              onChange={(e) => setEditBusinessName(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid rgba(16,185,129,.35)",
                background: "#06140f",
                color: "white",
                fontWeight: 800,
                outline: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "18px",
              }}
            >
              <button
  onClick={updateBusinessName}
  className="branch-action"
>
  حفظ
</button>

              <button
                onClick={() => setEditingBusiness(null)}
                className="branch-action"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
{deleteBusiness && (
  <div
    onClick={() => deleteStep !== 3 && setDeleteBusiness(null)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.65)",
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "430px",
        background: "#07130f",
        border: "1px solid rgba(239,68,68,.45)",
        borderRadius: "24px",
        padding: "24px",
        color: "white",
      }}
    >
      {deleteStep === 1 && (
        <>
          <h3 style={{ fontSize: "22px", fontWeight: 900 }}>
            حذف النشاط
          </h3>

          <p style={{ marginTop: "12px", color: "#d1d5db" }}>
            هل أنت متأكد من حذف نشاط: {deleteBusiness.name}؟
          </p>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              onClick={() => setDeleteStep(2)}
              className="branch-action"
              style={{ color: "#ef4444" }}
            >
              نعم احذف
            </button>

            <button
              onClick={() => setDeleteBusiness(null)}
              className="branch-action"
            >
              إلغاء
            </button>
          </div>
        </>
      )}

      {deleteStep === 2 && (
        <>
          <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#ef4444" }}>
            تأكيد أخير
          </h3>

          <p style={{ marginTop: "12px", color: "#d1d5db" }}>
            هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه.
          </p>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              onClick={confirmDeleteBusiness}
              className="branch-action"
              style={{ color: "#ef4444" }}
            >
              نعم متأكد
            </button>

            <button
              onClick={() => setDeleteBusiness(null)}
              className="branch-action"
            >
              إلغاء
            </button>
          </div>
        </>
      )}

      {deleteStep === 3 && (
        <>
          <h3 style={{ fontSize: "22px", fontWeight: 900 }}>
            جاري الحذف...
          </h3>

          <div
            style={{
              marginTop: "20px",
              width: "100%",
              height: "14px",
              background: "#111827",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${deleteProgress}%`,
                height: "100%",
                background: "#ef4444",
                transition: ".2s",
              }}
            />
          </div>

          <p style={{ marginTop: "12px", fontWeight: 900 }}>
            {deleteProgress >= 100 ? "تم الحذف" : `${deleteProgress}%`}
          </p>
        </>
      )}
    </div>
  </div>
)}
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