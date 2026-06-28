import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

type ReviewReport = {
  id: string;
  reason: string | null;
  created_at: string | null;
  review_id: string;
  product_reviews:
    | {
        id: string;
        rating: number;
        comment: string | null;
        approved: boolean | null;
        created_at: string | null;
        products:
          | {
              name: string;
            }[]
          | null;
        branches:
          | {
              id: string;
              name: string | null;
              city: string | null;
            }[]
          | null;
      }[]
    | null;
};

function formatDate(value: string | null) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

function getReview(report: ReviewReport) {
  return report.product_reviews?.[0] || null;
}

function getProductName(report: ReviewReport) {
  return getReview(report)?.products?.[0]?.name || "منتج غير معروف";
}

function getBranchName(report: ReviewReport) {
  return getReview(report)?.branches?.[0]?.name || "فرع غير معروف";
}

function getBranchCity(report: ReviewReport) {
  return getReview(report)?.branches?.[0]?.city || "مدينة غير محددة";
}

function getRatingStyle(rating: number): React.CSSProperties {
  if (rating <= 2) {
    return {
      background: "rgba(239,68,68,0.14)",
      color: "#fca5a5",
      border: "1px solid rgba(239,68,68,0.32)",
    };
  }

  if (rating === 3) {
    return {
      background: "rgba(245,158,11,0.14)",
      color: "#fde68a",
      border: "1px solid rgba(245,158,11,0.32)",
    };
  }

  return {
    background: "rgba(16,185,129,0.14)",
    color: "#6ee7b7",
    border: "1px solid rgba(16,185,129,0.32)",
  };
}

async function approveReviewAction(formData: FormData) {
  "use server";

  const reviewId = String(formData.get("review_id") || "");
  const reportId = String(formData.get("report_id") || "");

  if (!reviewId || !reportId) return;

  await supabase
    .from("product_reviews")
    .update({
      approved: true,
    })
    .eq("id", reviewId);

  await supabase.from("review_reports").delete().eq("id", reportId);

  revalidatePath("/admin/review-reports");
}

async function deleteReviewAction(formData: FormData) {
  "use server";

  const reviewId = String(formData.get("review_id") || "");
  const reportId = String(formData.get("report_id") || "");

  if (!reviewId || !reportId) return;

  await supabase.from("review_reports").delete().eq("id", reportId);
  await supabase.from("product_reviews").delete().eq("id", reviewId);

  revalidatePath("/admin/review-reports");
}

async function deleteReportOnlyAction(formData: FormData) {
  "use server";

  const reportId = String(formData.get("report_id") || "");

  if (!reportId) return;

  await supabase.from("review_reports").delete().eq("id", reportId);

  revalidatePath("/admin/review-reports");
}

export default async function AdminReviewReportsPage() {
  const { data, error } = await supabase
    .from("review_reports")
    .select(
      `
      id,
      reason,
      created_at,
      review_id,
      product_reviews(
        id,
        rating,
        comment,
        approved,
        created_at,
        products(name),
        branches(id, name, city)
      )
    `
    )
    .order("created_at", { ascending: false });

  const reports = (data || []) as ReviewReport[];

  const totalCount = reports.length;
  const lowRatingCount = reports.filter((report) => {
    const rating = getReview(report)?.rating || 0;
    return rating > 0 && rating <= 2;
  }).length;
  const approvedCount = reports.filter(
    (report) => getReview(report)?.approved === true
  ).length;
  const pendingCount = reports.filter(
    (report) => getReview(report)?.approved !== true
  ).length;

  return (
    <main dir="rtl" style={pageStyle}>
      <section style={topBarStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Admin</p>
          <h1 style={pageTitleStyle}>بلاغات التقييمات</h1>
          <p style={pageSubtitleStyle}>
            مراجعة البلاغات، اعتماد التقييم الصحيح، أو حذف التقييم المسيء.
          </p>
        </div>

        <div style={topActionsStyle}>
         
        </div>
      </section>

      <section style={statsGridStyle}>
        <StatCard title="كل البلاغات" value={totalCount} />
        <StatCard title="قيد المراجعة" value={pendingCount} />
        <StatCard title="تقييمات منخفضة" value={lowRatingCount} />
        <StatCard title="تقييمات ظاهرة" value={approvedCount} />
      </section>

      <section style={toolbarStyle}>
        <div>
          <h2 style={toolbarTitleStyle}>قائمة البلاغات</h2>
          <p style={toolbarTextStyle}>
            البلاغ يحذف تلقائياً عند اعتماد التقييم أو حذف التقييم.
          </p>
        </div>

        <span style={toolbarBadgeStyle}>{totalCount} بلاغ</span>
      </section>

      {error ? (
        <div style={errorStyle}>خطأ في جلب بلاغات التقييمات: {error.message}</div>
      ) : null}

      {reports.length === 0 && !error ? (
        <section style={emptyStyle}>لا توجد بلاغات تقييمات حالياً.</section>
      ) : (
        <section style={reportsStackStyle}>
          {reports.map((report) => {
            const review = getReview(report);
            const branchId = review?.branches?.[0]?.id || "";
            const rating = review?.rating || 0;

            return (
              <article key={report.id} style={reportCardStyle}>
                <div style={reportMainStyle}>
                  <div style={reportInfoStyle}>
                    <div style={reportHeaderStyle}>
                      <div>
                        <h2 style={reportTitleStyle}>{getProductName(report)}</h2>
                        <p style={mutedTextStyle}>
                          {getBranchName(report)} - {getBranchCity(report)}
                        </p>
                      </div>

                      <span
                        style={{
                          ...statusBadgeStyle,
                          ...(review?.approved ? visibleBadgeStyle : pendingBadgeStyle),
                        }}
                      >
                        {review?.approved ? "ظاهر" : "قيد المراجعة"}
                      </span>
                    </div>

                    <div style={metaGridStyle}>
                      <MetaItem title="تاريخ البلاغ" value={formatDate(report.created_at)} />
                      <MetaItem
                        title="تاريخ التقييم"
                        value={formatDate(review?.created_at || null)}
                      />
                      <MetaItem
                        title="حالة التقييم"
                        value={review?.approved ? "معتمد" : "غير معتمد"}
                      />
                      <MetaItem title="معرف البلاغ" value={report.id} />
                    </div>

                    <div style={textGridStyle}>
                      <div style={textBoxStyle}>
                        <strong>نص التقييم</strong>
                        <p>{review?.comment || "لا يوجد تعليق مكتوب."}</p>
                      </div>

                      <div style={textBoxStyle}>
                        <strong>سبب البلاغ</strong>
                        <p>{report.reason || "لم يتم كتابة سبب البلاغ."}</p>
                      </div>
                    </div>
                  </div>

                  <aside style={sidePanelStyle}>
                    <div style={{ ...ratingBadgeStyle, ...getRatingStyle(rating) }}>
                      <strong>{rating}</strong>
                      <span>من 5</span>
                    </div>

                    {!review ? (
                      <form action={deleteReportOnlyAction}>
                        <input type="hidden" name="report_id" value={report.id} />
                        <button style={dangerButtonStyle}>حذف البلاغ الناقص</button>
                      </form>
                    ) : (
                      <div style={sideActionsStyle}>
                        <form action={approveReviewAction}>
                          <input type="hidden" name="review_id" value={review.id} />
                          <input type="hidden" name="report_id" value={report.id} />
                          <button style={greenButtonStyle}>اعتماد التقييم</button>
                        </form>

                        <form action={deleteReviewAction}>
                          <input type="hidden" name="review_id" value={review.id} />
                          <input type="hidden" name="report_id" value={report.id} />
                          <button style={dangerButtonStyle}>حذف التقييم</button>
                        </form>

                        <form action={deleteReportOnlyAction}>
                          <input type="hidden" name="report_id" value={report.id} />
                          <button style={outlineButtonStyle}>رفض البلاغ فقط</button>
                        </form>

                        {branchId ? (
                          <Link href={`/branch/${branchId}/reviews`} style={outlineLinkButtonStyle}>
                            فتح تقييمات الفرع
                          </Link>
                        ) : (
                          <span style={disabledButtonStyle}>لا يوجد فرع</span>
                        )}
                      </div>
                    )}
                  </aside>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={statCardStyle}>
      <p style={statTitleStyle}>{title}</p>
      <strong style={statValueStyle}>{value}</strong>
    </div>
  );
}

function MetaItem({ title, value }: { title: string; value: string }) {
  return (
    <div style={metaItemStyle}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  background: "#06140f",
  color: "#e5e7eb",
  padding: "32px",
  display: "grid",
  gap: "22px",
  boxSizing: "border-box",
};

const topBarStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.95), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.42)",
  borderRadius: "30px",
  padding: "28px",
  boxShadow: "0 24px 55px rgba(0,0,0,0.32)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#6ee7b7",
  fontWeight: 950,
  fontSize: "14px",
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "38px",
  fontWeight: 950,
  color: "#ffffff",
};

const pageSubtitleStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#d1fae5",
  fontWeight: 850,
  fontSize: "16px",
  lineHeight: 1.8,
};

const topActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const ghostButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  border: "1px solid rgba(16,185,129,0.28)",
  borderRadius: "18px",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.055)",
  color: "#d1fae5",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const outlineButtonLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "18px",
  padding: "14px 18px",
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px",
};

const statCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.95), rgba(8,47,35,0.98))",
  border: "1px solid rgba(16,185,129,0.36)",
  borderRadius: "26px",
  padding: "18px",
  minHeight: "106px",
  display: "grid",
  alignContent: "center",
  gap: "10px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.26)",
};

const statTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#a7f3d0",
  fontWeight: 950,
  fontSize: "14px",
};

const statValueStyle: React.CSSProperties = {
  color: "#ffffff",
  fontWeight: 950,
  fontSize: "30px",
};

const toolbarStyle: React.CSSProperties = {
  background: "rgba(8,47,35,0.88)",
  border: "1px solid rgba(16,185,129,0.28)",
  borderRadius: "26px",
  padding: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
};

const toolbarTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 950,
};

const toolbarTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#a7f3d0",
  fontWeight: 850,
  fontSize: "14px",
};

const toolbarBadgeStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.32)",
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const reportsStackStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
};

const reportCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.36)",
  borderRadius: "30px",
  padding: "20px",
  boxShadow: "0 24px 55px rgba(0,0,0,0.30)",
};

const reportMainStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 260px",
  gap: "18px",
};

const reportInfoStyle: React.CSSProperties = {
  minWidth: 0,
};

const reportHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
};

const reportTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "25px",
  fontWeight: 950,
};

const mutedTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#a7f3d0",
  fontWeight: 850,
  fontSize: "13px",
};

const statusBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const visibleBadgeStyle: React.CSSProperties = {
  background: "rgba(16,185,129,0.16)",
  color: "#6ee7b7",
  border: "1px solid rgba(16,185,129,0.34)",
};

const pendingBadgeStyle: React.CSSProperties = {
  background: "rgba(245,158,11,0.16)",
  color: "#fde68a",
  border: "1px solid rgba(245,158,11,0.34)",
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "16px",
};

const metaItemStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.16)",
  background: "rgba(255,255,255,0.045)",
  borderRadius: "18px",
  padding: "12px",
  display: "grid",
  gap: "8px",
  color: "#d1d5db",
  fontWeight: 850,
  fontSize: "12px",
  wordBreak: "break-word",
};

const textGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "14px",
};

const textBoxStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.16)",
  background: "rgba(255,255,255,0.045)",
  borderRadius: "18px",
  padding: "14px",
  display: "grid",
  gap: "8px",
  color: "#d1d5db",
  fontWeight: 850,
  fontSize: "13px",
  lineHeight: 1.8,
};

const sidePanelStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.18)",
  background: "rgba(255,255,255,0.045)",
  borderRadius: "24px",
  padding: "14px",
  display: "grid",
  gap: "12px",
  alignContent: "start",
};

const ratingBadgeStyle: React.CSSProperties = {
  borderRadius: "20px",
  padding: "16px",
  display: "grid",
  justifyItems: "center",
  gap: "6px",
  fontWeight: 950,
};

const sideActionsStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const greenButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "0",
  borderRadius: "16px",
  padding: "13px",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(239,68,68,0.32)",
  borderRadius: "16px",
  padding: "13px",
  background: "rgba(239,68,68,0.12)",
  color: "#fca5a5",
  fontWeight: 950,
  cursor: "pointer",
};

const outlineButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(16,185,129,0.35)",
  borderRadius: "16px",
  padding: "13px",
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  fontWeight: 950,
  cursor: "pointer",
};

const outlineLinkButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(16,185,129,0.35)",
  borderRadius: "16px",
  padding: "13px",
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  fontWeight: 950,
  cursor: "pointer",
  textDecoration: "none",
  textAlign: "center",
  boxSizing: "border-box",
};

const disabledButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "16px",
  padding: "13px",
  background: "rgba(255,255,255,0.05)",
  color: "#9ca3af",
  fontWeight: 950,
  textAlign: "center",
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.14)",
  color: "#fca5a5",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 950,
};

const emptyStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "28px",
  padding: "34px",
  textAlign: "center",
  color: "#d1d5db",
  fontWeight: 950,
};
