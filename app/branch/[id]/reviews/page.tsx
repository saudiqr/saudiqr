"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Review = {
  id: string;
  branch_id: string;
  product_id: string | null;
  rating: number;
  comment: string | null;
  approved: boolean | null;
  seen_by_owner?: boolean | null;
  created_at: string;
  products: {
    name: string;
  } | null;
};

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

type BreakdownItem = {
  section: string;
  count: number;
};

const filters: { label: string; value: RatingFilter }[] = [
  { label: "الكل", value: "all" },
  { label: "5 نجوم", value: "5" },
  { label: "4 نجوم", value: "4" },
  { label: "3 نجوم", value: "3" },
  { label: "2 نجوم", value: "2" },
  { label: "1 نجمة", value: "1" },
];

export default function ReviewsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RatingFilter>("all");
  const [message, setMessage] = useState("");

  const filteredReviews =
    filter === "all"
      ? reviews
      : reviews.filter((review) => Number(review.rating) === Number(filter));

  const totalReviews = reviews.length;

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;

    const total = reviews.reduce(
      (sum, review) => sum + Number(review.rating || 0),
      0
    );

    return total / reviews.length;
  }, [reviews]);

  const fiveStars = reviews.filter((review) => review.rating === 5).length;
  const lowRatings = reviews.filter((review) => review.rating <= 2).length;
  const newReviews = reviews.filter(
    (review) => review.seen_by_owner === false
  ).length;

  const latestReviewMinutes = reviews.length
    ? getWaitingMinutes(reviews[0].created_at)
    : 0;

  const ratingBreakdown: BreakdownItem[] = [5, 4, 3, 2, 1]
    .map((rating) => ({
      section: `${rating} نجوم`,
      count: reviews.filter((review) => review.rating === rating).length,
    }))
    .filter((item) => item.count > 0);

  async function loadReviews() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("product_reviews")
      .select(`
        id,
        branch_id,
        product_id,
        rating,
        comment,
        approved,
        seen_by_owner,
        created_at,
        products (
          name
        )
      `)
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setReviews([]);
      setLoading(false);
      return;
    }

    setReviews((data || []) as unknown as Review[]);
    setLoading(false);
  }

  async function markReviewsAsSeen() {
    await supabase
      .from("product_reviews")
      .update({ seen_by_owner: true })
      .eq("branch_id", branchId)
      .eq("seen_by_owner", false);
  }

  async function deleteReview(reviewId: string) {
    const confirmed = window.confirm("هل تريد حذف هذا التقييم؟");

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("product_reviews")
      .delete()
      .eq("id", reviewId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadReviews();
  }

  async function toggleApproved(review: Review) {
    setMessage("");

    const { error } = await supabase
      .from("product_reviews")
      .update({ approved: !Boolean(review.approved) })
      .eq("id", review.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadReviews();
  }

  async function reportReview(reviewId: string) {
    setMessage("");

    const reason = window.prompt(
      "سبب البلاغ",
      "تقييم غير مناسب أو قد يكون من منافس"
    );

    if (!reason) return;

    const { error } = await supabase.from("review_reports").insert({
      review_id: reviewId,
      reason,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("تم إرسال البلاغ للإدارة.");
  }

  useEffect(() => {
    if (!branchId) return;

    loadReviews().then(() => {
      markReviewsAsSeen();
    });

    const channel = supabase
      .channel(`reviews-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_reviews",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          loadReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  if (loading) {
    return (
      <div dir="rtl" style={pageStyle}>
        <section style={heroStyle}>
          <div>
            <p style={eyebrowStyle}></p>
            <h1 style={heroTitleStyle}>التقييمات</h1>
            <p style={heroTextStyle}>جاري تحميل التقييمات...</p>
          </div>

          <div style={liveBadgeStyle}></div>
        </section>
      </div>
    );
  }

  return (
    <div dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}></p>
          <h1 style={heroTitleStyle}>التقييمات</h1>
          <p style={heroTextStyle}>
            تابع تقييمات المنتجات والخدمة، وراقب جودة تجربة العميل بشكل مباشر.
          </p>
        </div>

      </section>

      <section style={statsGridStyle}>
        <StatCard
          title="إجمالي التقييمات"
          value={totalReviews}
          icon="⭐"
          breakdown={ratingBreakdown}
        />

        <StatCard
          title="متوسط التقييم"
          value={totalReviews > 0 ? `${averageRating.toFixed(1)} / 5` : "—"}
          icon="📊"
          breakdown={ratingBreakdown}
        />

        <StatCard
          title="5 نجوم"
          value={fiveStars}
          icon="🏆"
          breakdown={[{ section: "تقييم ممتاز", count: fiveStars }]}
        />

        <StatCard
          title="تقييمات منخفضة"
          value={lowRatings}
          icon="⚠️"
          breakdown={[{ section: "1-2 نجوم", count: lowRatings }]}
        />

        <StatCard
          title="أحدث تقييم"
          value={reviews.length ? `${latestReviewMinutes} د` : "0 د"}
          icon="⚡"
          breakdown={
            reviews.length
              ? [{ section: "آخر تقييم", count: latestReviewMinutes }]
              : []
          }
        />

        <StatCard
          title="تقييمات جديدة"
          value={newReviews}
          icon="🔴"
          breakdown={[{ section: "غير مقروءة", count: newReviews }]}
        />
      </section>

      <section style={filterCardStyle}>
        <div>
          <h2 style={sectionTitleStyle}>تصفية التقييمات</h2>
          <p style={sectionSubtitleStyle}>
            اعرض التقييمات حسب عدد النجوم لمتابعة جودة المنتجات والخدمة.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {filters.map((item) => (
            <FilterButton
              key={item.value}
              active={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </FilterButton>
          ))}
        </div>
      </section>

      {message ? (
        <div
          style={{
            ...errorStyle,
            border: message.includes("تم")
              ? "1px solid #4A3425"
              : "1px solid rgba(239,68,68,0.35)",
            background: message.includes("تم")
              ? "rgba(16,185,129,0.14)"
              : "rgba(239,68,68,0.14)",
            color: message.includes("تم") ? "#DEA54B" : "#fca5a5",
          }}
        >
          {message}
        </div>
      ) : null}

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>قائمة التقييمات</h2>
            <p style={sectionSubtitleStyle}>
              كل تقييم يظهر مع المنتج، النجوم، التعليق، وحالة الظهور.
            </p>
          </div>

          <span style={sectionBadgeStyle}>
            {filteredReviews.length} تقييم معروض
          </span>
        </div>

        {filteredReviews.length === 0 ? (
          <div style={emptyStyle}>لا توجد تقييمات في هذا التصنيف.</div>
        ) : (
          <div style={reviewsGridStyle}>
            {filteredReviews.map((review) => {
              const config = getRatingConfig(review.rating);
              const minutes = getWaitingMinutes(review.created_at);

              return (
                <article
                  key={review.id}
                  style={{
                    ...reviewCardStyle,
                    border: `1px solid ${config.border}`,
                  }}
                >
                  <div style={reviewHeaderStyle}>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "999px",
                            background: config.dot,
                            boxShadow: `0 0 12px ${config.dot}`,
                          }}
                        />

                        <h3 style={productTitleStyle}>
                          {review.products?.name || "تقييم عام"}
                        </h3>
                      </div>

                      <span
                        style={{
                          display: "inline-flex",
                          marginTop: "12px",
                          borderRadius: "999px",
                          padding: "8px 12px",
                          background: config.bg,
                          color: config.color,
                          border: `1px solid ${config.border}`,
                          fontWeight: 950,
                          fontSize: "13px",
                        }}
                      >
                        {config.label}
                      </span>

                      <p style={mutedTextStyle}>⏱️ منذ {minutes} دقيقة</p>
                    </div>

                    <span style={ratingBadgeStyle}>{review.rating} ⭐</span>
                  </div>

                  <div style={commentBoxStyle}>
                    {review.comment || "لا يوجد تعليق مكتوب."}
                  </div>

                  <div style={statusBoxStyle}>
                    <span>حالة الظهور</span>
                    <strong
                      style={{
                        color:
                          review.approved === false ? "#fca5a5" : "#DEA54B",
                      }}
                    >
                      {review.approved === false ? "مخفي" : "ظاهر"}
                    </strong>
                  </div>

                  <div style={actionsGridStyle}>
                    <button
                      onClick={() => toggleApproved(review)}
                      style={secondaryButtonStyle}
                    >
                      {review.approved === false ? "إظهار" : "إخفاء"}
                    </button>

                    <button
                      onClick={() => reportReview(review.id)}
                      style={warningButtonStyle}
                    >
                      بلاغ
                    </button>

                    <button
                      onClick={() => deleteReview(review.id)}
                      style={dangerButtonStyle}
                    >
                      حذف
                    </button>
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

function getWaitingMinutes(date: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
}

function getRatingConfig(rating: number) {
  if (rating <= 2) {
    return {
      label: "منخفض",
      bg: "rgba(239,68,68,0.14)",
      color: "#fca5a5",
      border: "rgba(239,68,68,0.34)",
      dot: "#f87171",
    };
  }

  if (rating === 3) {
    return {
      label: "متوسط",
      bg: "rgba(245,158,11,0.14)",
      color: "#fde68a",
      border: "rgba(245,158,11,0.34)",
      dot: "#fbbf24",
    };
  }

  return {
    label: "ممتاز",
    bg: "rgba(198,138,61,0.12)",
    color: "#DEA54B",
    border: "#4A3425",
    dot: "#34d399",
  };
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active
          ? "1px solid rgba(16,185,129,0.75)"
          : "1px solid #4A3425",
        background: active ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.055)",
        color: active ? "#DEA54B" : "#C8B6A4",
        borderRadius: "999px",
        padding: "12px 18px",
        fontWeight: 950,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function StatCard({
  title,
  value,
  icon,
  breakdown,
}: {
  title: string;
  value: number | string;
  icon: string;
  breakdown: BreakdownItem[];
}) {
  return (
    <div style={statCardStyle}>
      <div style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div>
            <p style={{ margin: 0, color: "#C8B6A4", fontWeight: 950 }}>
              {title}
            </p>

            <strong
              style={{
                display: "block",
                marginTop: "10px",
                color: "#FFF8F0",
                fontWeight: 950,
                fontSize: "34px",
              }}
            >
              {value}
            </strong>
          </div>

          <div style={statIconStyle}>{icon}</div>
        </div>

        {breakdown.length > 0 ? (
          <div style={statBreakdownStyle}>
            {breakdown.slice(0, 4).map((item) => (
              <div key={`${title}-${item.section}`} style={statBreakdownLineStyle}>
                <span>{item.section}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "120px",
  color: "#e5e7eb",
  display: "grid",
  gap: "24px",
};

const heroStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #16110E)",
  border: "1px solid #4A3425",
  borderRadius: "28px",
  padding: "28px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#DEA54B",
  fontWeight: 900,
  fontSize: "15px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "38px",
  fontWeight: 950,
  color: "#FFF8F0",
};

const heroTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "16px",
  lineHeight: 1.8,
};

const liveBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "12px 16px",
  background: "rgba(198,138,61,0.12)",
  color: "#DEA54B",
  border: "1px solid #4A3425",
  fontWeight: 950,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "14px",
};

const statCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #2A211C)",
  border: "1px solid #4A3425",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
  minHeight: "168px",
};

const statBreakdownStyle: React.CSSProperties = {
  display: "grid",
  gap: "7px",
  marginTop: "14px",
  borderTop: "1px solid #4A3425",
  paddingTop: "12px",
};

const statBreakdownLineStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "12px",
};

const statIconStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "rgba(198,138,61,0.12)",
  border: "1px solid #4A3425",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px",
  flexShrink: 0,
};

const filterCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #16110E)",
  border: "1px solid #4A3425",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #16110E)",
  border: "1px solid #4A3425",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
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
  lineHeight: 1.8,
};

const sectionBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "10px 14px",
  background: "rgba(245,158,11,0.16)",
  color: "#fde68a",
  border: "1px solid rgba(245,158,11,0.38)",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const errorStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 900,
};

const emptyStyle: React.CSSProperties = {
  marginTop: "18px",
  border: "1px solid #4A3425",
  background: "rgba(255,255,255,0.055)",
  color: "#C8B6A4",
  borderRadius: "22px",
  padding: "22px",
  textAlign: "center",
  fontWeight: 950,
};

const reviewsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  alignItems: "start",
  marginTop: "18px",
};

const reviewCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.055)",
  borderRadius: "24px",
  padding: "18px",
  overflow: "visible",
};

const reviewHeaderStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const productTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#FFF8F0",
  fontSize: "22px",
  fontWeight: 950,
};

const mutedTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "13px",
};

const ratingBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "10px 14px",
  background: "rgba(245,158,11,0.16)",
  color: "#fde68a",
  border: "1px solid rgba(245,158,11,0.38)",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const commentBoxStyle: React.CSSProperties = {
  marginTop: "18px",
  border: "1px solid #4A3425",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "16px",
  padding: "14px",
  color: "#C8B6A4",
  fontWeight: 900,
  minHeight: "78px",
  lineHeight: 1.8,
};

const statusBoxStyle: React.CSSProperties = {
  marginTop: "14px",
  borderTop: "1px solid #4A3425",
  paddingTop: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  color: "#FFF8F0",
  fontWeight: 950,
};

const actionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "8px",
  marginTop: "14px",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #4A3425",
  borderRadius: "14px",
  padding: "11px",
  background: "rgba(198,138,61,0.10)",
  color: "#DEA54B",
  fontWeight: 950,
  cursor: "pointer",
};

const warningButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(245,158,11,0.32)",
  borderRadius: "14px",
  padding: "11px",
  background: "rgba(245,158,11,0.12)",
  color: "#fde68a",
  fontWeight: 950,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(239,68,68,0.32)",
  borderRadius: "14px",
  padding: "11px",
  background: "rgba(239,68,68,0.12)",
  color: "#fca5a5",
  fontWeight: 950,
  cursor: "pointer",
};
