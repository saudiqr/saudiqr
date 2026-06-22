"use client";

import DashboardSidebar from "@/components/DashboardSidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardBranchesPage() {
  const [business, setBusiness] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [totalReviewsCount, setTotalReviewsCount] = useState(0);

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchCity, setEditBranchCity] = useState("");

  const [deleteBranch, setDeleteBranch] = useState<any>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2 | 3>(1);
  const [deleteProgress, setDeleteProgress] = useState(0);

  useEffect(() => {
    async function loadData() {
      const params = new URLSearchParams(window.location.search);
      const businessId = params.get("business_id");

      if (!businessId) {
        setLoading(false);
        return;
      }

      const { data: businessData } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("id", businessId)
        .single();

      const { data: branchesData } = await supabase
        .from("branches")
        .select("id, name, city, subscription_status, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      const branchList = branchesData || [];

      let productsTotal = 0;
      let ordersTotal = 0;
      let ratingTotal = 0;
      let reviewsTotal = 0;

      const branchesWithRatings = [];

      for (const branch of branchList) {
        const { count: productCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", branch.id);

        const { count: orderCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", branch.id);

        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("rating")
          .eq("branch_id", branch.id);

        const reviews = reviewsData || [];
        const branchReviewsCount = reviews.length;
        const branchRatingTotal = reviews.reduce(
          (sum, review) => sum + Number(review.rating || 0),
          0
        );

        const branchAverageRating =
          branchReviewsCount > 0 ? branchRatingTotal / branchReviewsCount : 0;

        productsTotal += productCount || 0;
        ordersTotal += orderCount || 0;
        ratingTotal += branchRatingTotal;
        reviewsTotal += branchReviewsCount;

        branchesWithRatings.push({
          ...branch,
          average_rating: branchAverageRating,
          reviews_count: branchReviewsCount,
        });
      }

      setBusiness(businessData);
      setBranches(branchesWithRatings);
      setProductsCount(productsTotal);
      setOrdersCount(ordersTotal);
      setOverallRating(reviewsTotal > 0 ? ratingTotal / reviewsTotal : 0);
      setTotalReviewsCount(reviewsTotal);
      setLoading(false);
    }

    loadData();
  }, []);

  const firstBranchId = branches[0]?.id;

  function formatRating(average: number, count: number) {
    if (!count || average <= 0) return "لا توجد تقييمات";
    return `⭐ ${average.toFixed(1)} (${count} تقييم)`;
  }

  async function updateBranchData() {
    if (!editingBranch) return;

    const name = editBranchName.trim();
    const city = editBranchCity.trim();

    if (!name) {
      alert("اسم الفرع مطلوب");
      return;
    }

    const { error } = await supabase
      .from("branches")
      .update({
        name,
        city: city || null,
      })
      .eq("id", editingBranch.id);

    if (error) {
      alert(error.message);
      return;
    }

    setBranches((prev) =>
      prev.map((branch) =>
        branch.id === editingBranch.id
          ? { ...branch, name, city: city || null }
          : branch
      )
    );

    setEditingBranch(null);
  }

  async function confirmDeleteBranch() {
    if (!deleteBranch) return;

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
        .from("branches")
        .delete()
        .eq("id", deleteBranch.id);

      if (error) {
        alert(error.message);
        setDeleteBranch(null);
        setDeleteStep(1);
        setDeleteProgress(0);
        return;
      }

      setBranches((prev) =>
        prev.filter((branch) => branch.id !== deleteBranch.id)
      );

      setDeleteProgress(100);

      setTimeout(() => {
        setDeleteBranch(null);
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
          .menu-item {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
            color: white;
            text-decoration: none;
            transition: .2s;
            border-bottom: 1px solid rgba(255,255,255,.08);
            background: transparent;
            cursor: pointer;
            font-weight: 900;
            box-sizing: border-box;
            border-left: none;
            border-right: none;
            border-top: none;
          }

          .menu-item:hover {
            background: #0f2a22;
            color: #10b981;
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
                إدارة النشاط
              </h1>

              <p style={{ marginTop: "8px", color: "#334155" }}>
                {business?.name || "جميع الفروع التابعة لهذا النشاط التجاري"}
              </p>
            </div>

            <Link
              href="/dashboard"
              style={{
                background: "#06140f",
                color: "white",
                padding: "14px 20px",
                borderRadius: "16px",
                fontWeight: 900,
                textDecoration: "none",
                border: "1px solid rgba(16,185,129,0.45)",
              }}
            >
              العودة للوحة الرئيسية
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
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                marginBottom: "28px",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "30px",
                    fontWeight: 900,
                    color: "white",
                    margin: 0,
                  }}
                >
                  {business?.name || "النشاط التجاري"}
                </h2>

                <p style={{ marginTop: "10px", color: "#d1d5db" }}>
                  نظرة عامة على النشاط والفروع
                </p>
              </div>

              {business?.id && (
                <Link
                  href={`/branch/new?business_id=${business.id}`}
                  style={{
                    background: "#10b981",
                    color: "black",
                    padding: "14px 20px",
                    borderRadius: "16px",
                    fontWeight: 900,
                    textDecoration: "none",
                  }}
                >
                  + إضافة فرع جديد
                </Link>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "16px",
                marginBottom: "28px",
              }}
            >
              <StatCard title="عدد الفروع" value={branches.length} />
              <StatCard title="عدد المنتجات" value={productsCount} />
              <StatCard title="عدد الطلبات" value={ordersCount} />
              <StatCard
                title="التقييم العام"
                value={
                  totalReviewsCount > 0
                    ? `⭐ ${overallRating.toFixed(1)} (${totalReviewsCount})`
                    : "لا توجد تقييمات"
                }
              />
            </div>

            {loading ? (
              <p style={{ color: "#d1d5db", fontWeight: 800 }}>
                جاري التحميل...
              </p>
            ) : branches.length === 0 ? (
              <div
                style={{
                  border: "1px solid rgba(16,185,129,0.25)",
                  background: "#0b1f19",
                  borderRadius: "24px",
                  padding: "32px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#d1d5db", fontWeight: 800 }}>
                  لا توجد فروع لهذا النشاط.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px",
                      border: "1px solid rgba(16,185,129,0.25)",
                      background: "#0b1f19",
                      borderRadius: "24px",
                      padding: "20px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          color: "white",
                          fontSize: "22px",
                          fontWeight: 900,
                          margin: 0,
                        }}
                      >
                        {branch.name}
                      </h3>

                      <p style={{ marginTop: "8px", color: "#d1d5db" }}>
                        {branch.city || "بدون مدينة"} • الاشتراك:{" "}
                        {branch.subscription_status || "inactive"}
                      </p>

                      <p
                        style={{
                          marginTop: "8px",
                          color:
                            branch.reviews_count > 0 ? "#facc15" : "#9ca3af",
                          fontWeight: 900,
                        }}
                      >
                        {formatRating(
                          Number(branch.average_rating || 0),
                          Number(branch.reviews_count || 0)
                        )}
                      </p>
                    </div>

                    <div style={{ position: "relative" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu(
                            openMenu === branch.id ? null : branch.id
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

                      {openMenu === branch.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            top: "45px",
                            left: 0,
                            width: "160px",
                            background: "#07130f",
                            border: "1px solid rgba(16,185,129,.25)",
                            borderRadius: "16px",
                            overflow: "hidden",
                            zIndex: 999,
                            boxShadow: "0 10px 30px rgba(0,0,0,.35)",
                          }}
                        >
                          <Link
                            href={`/branch/${branch.id}`}
                            className="menu-item"
                          >
                            إدارة الفرع
                          </Link>

                          <Link
                            href={`/branch/${branch.id}/qr`}
                            className="menu-item"
                          >
                            QR الفرع
                          </Link>

                          <button
                            type="button"
                            className="menu-item"
                            onClick={() => {
                              setEditingBranch(branch);
                              setEditBranchName(branch.name || "");
                              setEditBranchCity(branch.city || "");
                              setOpenMenu(null);
                            }}
                          >
                            تعديل الفرع
                          </button>

                          <button
                            type="button"
                            className="menu-item"
                            style={{ color: "#ef4444" }}
                            onClick={() => {
                              setDeleteBranch(branch);
                              setDeleteStep(1);
                              setDeleteProgress(0);
                              setOpenMenu(null);
                            }}
                          >
                            حذف الفرع
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {editingBranch && (
        <div
          onClick={() => setEditingBranch(null)}
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
              width: "430px",
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
              تعديل الفرع
            </h3>

            <input
              value={editBranchName}
              onChange={(e) => setEditBranchName(e.target.value)}
              placeholder="اسم الفرع"
              style={inputStyle}
            />

            <input
              value={editBranchCity}
              onChange={(e) => setEditBranchCity(e.target.value)}
              placeholder="المدينة"
              style={{
                ...inputStyle,
                marginTop: "12px",
              }}
            />

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button onClick={updateBranchData} className="branch-action">
                حفظ
              </button>

              <button
                onClick={() => setEditingBranch(null)}
                className="branch-action"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteBranch && (
        <div
          onClick={() => deleteStep !== 3 && setDeleteBranch(null)}
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
                  حذف الفرع
                </h3>

                <p style={{ marginTop: "12px", color: "#d1d5db" }}>
                  هل أنت متأكد من حذف فرع: {deleteBranch.name}؟
                </p>

                <div
                  style={{ display: "flex", gap: "10px", marginTop: "20px" }}
                >
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="branch-action"
                    style={{ color: "#ef4444" }}
                  >
                    نعم احذف
                  </button>

                  <button
                    onClick={() => setDeleteBranch(null)}
                    className="branch-action"
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}

            {deleteStep === 2 && (
              <>
                <h3
                  style={{
                    fontSize: "22px",
                    fontWeight: 900,
                    color: "#ef4444",
                  }}
                >
                  تأكيد أخير
                </h3>

                <p style={{ marginTop: "12px", color: "#d1d5db" }}>
                  هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه.
                </p>

                <div
                  style={{ display: "flex", gap: "10px", marginTop: "20px" }}
                >
                  <button
                    onClick={confirmDeleteBranch}
                    className="branch-action"
                    style={{ color: "#ef4444" }}
                  >
                    نعم متأكد
                  </button>

                  <button
                    onClick={() => setDeleteBranch(null)}
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

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(16,185,129,0.25)",
        background: "#0b1f19",
        borderRadius: "22px",
        padding: "20px",
      }}
    >
      <p
        style={{
          color: "#9ca3af",
          fontWeight: 800,
          margin: 0,
          marginBottom: "10px",
        }}
      >
        {title}
      </p>

      <p
        style={{
          color: "white",
          fontSize: "28px",
          fontWeight: 900,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid rgba(16,185,129,.35)",
  background: "#06140f",
  color: "white",
  fontWeight: 800,
  outline: "none",
};