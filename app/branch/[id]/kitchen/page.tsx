"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { OperationLayout } from "@/components/operations/OperationLayout";
import { OperationMode } from "@/components/operations/OperationMode";
import { OperationButton } from "@/components/operations/OperationButton";
import {
  kitchenFilters,
  itemStatusConfig,
  type ItemStatus,
  type KitchenOrder,
  type KitchenOrderItem,
} from "@/hooks/operations/useKitchen";
import { useKitchen } from "@/hooks/operations/useKitchen";

export default function KitchenPage() {
  const params = useParams();
  const branchId = params.id as string;
  const [operationMode, setOperationMode] = useState(false);

  const {
    orders,
    visibleOrders,
    filter,
    setFilter,
    checkingAccess,
    accessDeniedReason,
    message,
    pendingCount,
    preparingCount,
    readyCount,
    pickedUpCount,
    updateItemStatus,
    markWholeOrderReady,
  } = useKitchen(branchId);

  if (checkingAccess) {
    return (
      <OperationLayout operationMode={operationMode}>
        <section style={emptyStyle}>جاري التحقق من صلاحية الباقة...</section>
      </OperationLayout>
    );
  }

  if (accessDeniedReason) {
    return (
      <OperationLayout operationMode={operationMode}>
        <section style={deniedCardStyle}>
          <h1 style={deniedTitleStyle}>غير متاح في الباقة الحالية</h1>
          <p style={deniedTextStyle}>{accessDeniedReason}</p>
        </section>
      </OperationLayout>
    );
  }

  return (
    <OperationLayout operationMode={operationMode}>
      <OperationMode active={operationMode} />

      <section style={topBarStyle}>
        <div>
          <p style={eyebrowStyle}>KDS · تجهيز حسب المنتج</p>
          <h1 style={pageTitleStyle}>شاشة المطبخ</h1>
          {!operationMode ? (
            <p style={subtitleStyle}>كل منتج له حالة مستقلة. لا تغيّر الطلب كامل إلا بعد جاهزية كل المنتجات.</p>
          ) : null}
        </div>

        <div style={topActionsStyle}>
          <OperationButton onClick={() => setOperationMode((current) => !current)}>
            {operationMode ? "الخروج من وضع التشغيل" : "وضع التشغيل"}
          </OperationButton>
        </div>

        <div style={summaryGridStyle}>
          <SummaryBox title="بانتظار" value={pendingCount} />
          <SummaryBox title="تحضير" value={preparingCount} />
          <SummaryBox title="جاهزة" value={readyCount} />
          <SummaryBox title="استلمها النادل" value={pickedUpCount} />
        </div>
      </section>

      <section style={filtersCardStyle}>
        <div style={filtersWrapStyle}>
          {kitchenFilters.map((item) => (
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

      {message ? <div style={errorStyle}>{message}</div> : null}

      {visibleOrders.length === 0 ? (
        <section style={emptyStyle}>لا توجد منتجات في هذا التصنيف</section>
      ) : (
        <section style={ordersGridStyle}>
          {visibleOrders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              originalOrder={orders.find((currentOrder) => currentOrder.id === order.id)}
              onUpdateItemStatus={updateItemStatus}
              onMarkWholeOrderReady={markWholeOrderReady}
            />
          ))}
        </section>
      )}
    </OperationLayout>
  );
}

function KitchenOrderCard({
  order,
  originalOrder,
  onUpdateItemStatus,
  onMarkWholeOrderReady,
}: {
  order: KitchenOrder;
  originalOrder?: KitchenOrder;
  onUpdateItemStatus: (order: KitchenOrder, item: KitchenOrderItem, status: ItemStatus) => void;
  onMarkWholeOrderReady: (order: KitchenOrder) => void;
}) {
  const items = order.order_items || [];
  const totalItems = (originalOrder?.order_items || []).filter(
    (item) => (item.status || "pending") !== "cancelled"
  );
  const readyItems = totalItems.filter((item) =>
    ["ready", "picked_up", "delivered"].includes(item.status || "pending")
  );
  const modeLabel = order.service_mode === "staged" ? "على دفعات" : "مرة واحدة";
  const isWholeOrderReady = totalItems.length > 0 && readyItems.length === totalItems.length;

  return (
    <article style={orderCardStyle}>
      <div style={orderHeaderStyle}>
        <div>
          <p style={tableLabelStyle}>{order.tables?.section_name || "القسم الرئيسي"}</p>
          <h2 style={tableNumberStyle}>طاولة {order.tables?.table_number || "غير محددة"}</h2>
          <p style={orderNumberStyle}>#{order.order_number || "بدون رقم"}</p>
        </div>

        <div style={orderMetaStyle}>
          <span style={serviceModeBadgeStyle}>{modeLabel}</span>
          <span style={timeStyle}>
            {new Date(order.created_at).toLocaleTimeString("ar-SA", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <div style={progressBoxStyle}>
        <span>جاهز {readyItems.length} من {totalItems.length}</span>
        <span>{totalItems.length - readyItems.length} متبقي</span>
      </div>

      <div style={itemsListStyle}>
        {items.map((item) => (
          <KitchenItemCard
            key={item.id}
            order={order}
            item={item}
            onUpdateItemStatus={onUpdateItemStatus}
          />
        ))}
      </div>

      {order.service_mode !== "staged" ? (
        <div style={wholeOrderActionStyle}>
          <button
            onClick={() => onMarkWholeOrderReady(order)}
            disabled={isWholeOrderReady}
            style={{
              ...wholeOrderReadyButtonStyle,
              opacity: isWholeOrderReady ? 0.5 : 1,
              cursor: isWholeOrderReady ? "not-allowed" : "pointer",
            }}
          >
            ✅ جاهز الطلب كامل
          </button>
        </div>
      ) : null}

      {order.notes ? (
        <div style={notesStyle}>
          <span style={notesLabelStyle}>ملاحظات الطلب</span>
          <p style={notesTextStyle}>{order.notes}</p>
        </div>
      ) : null}
    </article>
  );
}

function KitchenItemCard({
  order,
  item,
  onUpdateItemStatus,
}: {
  order: KitchenOrder;
  item: KitchenOrderItem;
  onUpdateItemStatus: (order: KitchenOrder, item: KitchenOrderItem, status: ItemStatus) => void;
}) {
  const itemStatus = item.status || "pending";
  const status = itemStatusConfig[itemStatus];

  return (
    <div style={itemCardStyle}>
      <div style={itemMainStyle}>
        <span style={quantityStyle}>{item.quantity}×</span>

        <div style={{ flex: 1 }}>
          <strong style={productNameStyle}>{item.products?.name || "منتج غير معروف"}</strong>

          {item.notes && item.notes.trim() !== "" ? (
            <div style={itemNoteStyle}>📝 {item.notes}</div>
          ) : null}
        </div>
      </div>

      <div style={itemFooterStyle}>
        <span
          style={{
            ...statusBadgeStyle,
            background: status.bg,
            color: status.color,
            border: `1px solid ${status.border}`,
          }}
        >
          {status.label}
        </span>

        <div style={itemActionsStyle}>
          {order.service_mode === "staged" ? (
            <>
              {itemStatus === "pending" ? (
                <button onClick={() => onUpdateItemStatus(order, item, "preparing")} style={secondaryButtonStyle}>
                  ابدأ
                </button>
              ) : null}

              {itemStatus === "pending" || itemStatus === "preparing" ? (
                <button onClick={() => onUpdateItemStatus(order, item, "ready")} style={primaryButtonStyle}>
                  جاهز
                </button>
              ) : null}

              {itemStatus === "ready" ? <span style={readyHintStyle}>ظهر للنادل</span> : null}
            </>
          ) : itemStatus === "ready" ? (
            <span style={readyHintStyle}>جاهز ضمن الطلب الكامل</span>
          ) : (
            <span style={waitingOnceHintStyle}>ينتظر زر جاهز للطلب كامل</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryBox({ title, value }: { title: string; value: number }) {
  return (
    <div style={summaryBoxStyle}>
      <span style={summaryTitleStyle}>{title}</span>
      <strong style={summaryValueStyle}>{value}</strong>
    </div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...filterButtonStyle,
        border: active ? "1px solid rgba(198,138,61,0.72)" : "1px solid #4A3425",
        background: active ? "rgba(198,138,61,0.16)" : "#2A211C",
        color: active ? "#DEA54B" : "#C8B6A4",
      }}
    >
      {children}
    </button>
  );
}

const topBarStyle: CSSProperties = {
  background: "linear-gradient(135deg, #241B16, #1C1612)",
  border: "1px solid #4A3425",
  borderRadius: "24px",
  padding: "12px",
  boxShadow: "0 22px 70px rgba(0,0,0,0.28)",
  display: "grid",
  gridTemplateColumns: "1.2fr auto 1.4fr",
  alignItems: "center",
  gap: "16px",
};

const eyebrowStyle: CSSProperties = {
  margin: "0 0 6px",
  color: "#DEA54B",
  fontWeight: 950,
  fontSize: "14px",
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "30px",
  fontWeight: 950,
  color: "#FFF8F0",
};

const subtitleStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "13px",
  lineHeight: 1.7,
};

const topActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(70px, 1fr))",
  gap: "8px",
};

const summaryBoxStyle: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #4A3425",
  background: "#2A211C",
  padding: "8px 10px",
  textAlign: "center",
};

const summaryTitleStyle: CSSProperties = {
  display: "block",
  color: "#C8B6A4",
  fontSize: "13px",
  fontWeight: 900,
};

const summaryValueStyle: CSSProperties = {
  display: "block",
  marginTop: "4px",
  color: "#FFF8F0",
  fontSize: "22px",
  fontWeight: 950,
};

const filtersCardStyle: CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "26px",
  padding: "10px",
  boxShadow: "0 16px 48px rgba(0,0,0,0.20)",
};

const filtersWrapStyle: CSSProperties = {
  display: "flex",
  gap: "9px",
  flexWrap: "wrap",
};

const filterButtonStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "9px 15px",
  fontWeight: 950,
  cursor: "pointer",
};

const errorStyle: CSSProperties = {
  border: "1px solid rgba(201,79,79,0.42)",
  background: "rgba(201,79,79,0.14)",
  color: "#F3B0B0",
  borderRadius: "20px",
  padding: "14px",
  fontWeight: 900,
};

const emptyStyle: CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "30px",
  padding: "28px",
  textAlign: "center",
  color: "#C8B6A4",
  fontWeight: 950,
};

const deniedCardStyle: CSSProperties = {
  ...emptyStyle,
  border: "1px solid rgba(201,79,79,0.45)",
  background: "rgba(201,79,79,0.12)",
};

const deniedTitleStyle: CSSProperties = {
  margin: "0 0 12px",
  color: "#FFF8F0",
  fontSize: "24px",
  fontWeight: 950,
};

const deniedTextStyle: CSSProperties = {
  margin: 0,
  color: "#ffb4b4",
  fontWeight: 900,
  lineHeight: 1.8,
};

const ordersGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
};

const orderCardStyle: CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "24px",
  padding: "10px",
  boxShadow: "0 18px 55px rgba(0,0,0,0.24)",
  display: "flex",
  flexDirection: "column",
  minHeight: "285px",
};

const orderHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
  paddingBottom: "10px",
  borderBottom: "1px solid rgba(74,52,37,0.9)",
};

const tableLabelStyle: CSSProperties = {
  margin: 0,
  color: "#C8B6A4",
  fontSize: "13px",
  fontWeight: 900,
};

const tableNumberStyle: CSSProperties = {
  margin: "2px 0 0",
  color: "#FFF8F0",
  fontSize: "26px",
  lineHeight: 1,
  fontWeight: 950,
};

const orderNumberStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#DEA54B",
  fontSize: "13px",
  fontWeight: 950,
};

const orderMetaStyle: CSSProperties = {
  display: "grid",
  justifyItems: "end",
  gap: "8px",
};

const serviceModeBadgeStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: 950,
  whiteSpace: "nowrap",
  fontSize: "13px",
  background: "rgba(198,138,61,0.14)",
  color: "#DEA54B",
  border: "1px solid rgba(198,138,61,0.36)",
};

const timeStyle: CSSProperties = {
  color: "#C8B6A4",
  fontWeight: 900,
  fontSize: "13px",
};

const progressBoxStyle: CSSProperties = {
  marginTop: "8px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  border: "1px solid rgba(198,138,61,0.28)",
  background: "rgba(198,138,61,0.10)",
  color: "#F3C77D",
  borderRadius: "16px",
  padding: "8px",
  fontWeight: 950,
  fontSize: "13px",
};

const itemsListStyle: CSSProperties = {
  display: "grid",
  gap: "7px",
  marginTop: "8px",
  flex: 1,
};

const itemCardStyle: CSSProperties = {
  border: "1px solid rgba(74,52,37,0.95)",
  background: "#2A211C",
  borderRadius: "16px",
  padding: "8px",
  color: "#FFF8F0",
  display: "grid",
  gap: "10px",
};

const itemMainStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
};

const quantityStyle: CSSProperties = {
  minWidth: "36px",
  height: "30px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "15px",
  background: "rgba(198,138,61,0.14)",
  border: "1px solid rgba(198,138,61,0.34)",
  color: "#DEA54B",
  fontWeight: 950,
  fontSize: "15px",
};

const productNameStyle: CSSProperties = {
  color: "#FFF8F0",
  fontSize: "16px",
  lineHeight: 1.4,
  fontWeight: 950,
};

const itemNoteStyle: CSSProperties = {
  marginTop: "6px",
  color: "#F3C77E",
  fontSize: "13px",
  fontWeight: 900,
  lineHeight: 1.6,
};

const itemFooterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
};

const statusBadgeStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "7px 10px",
  fontWeight: 950,
  whiteSpace: "nowrap",
  fontSize: "13px",
};

const itemActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #4A3425",
  borderRadius: "16px",
  padding: "10px 12px",
  background: "#241B16",
  color: "#FFF8F0",
  fontWeight: 950,
  cursor: "pointer",
  fontSize: "13px",
};

const primaryButtonStyle: CSSProperties = {
  border: "0",
  borderRadius: "16px",
  padding: "10px 14px",
  background: "linear-gradient(135deg, #C68A3D, #DEA54B)",
  color: "#16110E",
  fontWeight: 950,
  cursor: "pointer",
  fontSize: "13px",
};

const readyHintStyle: CSSProperties = {
  color: "#9DE7B4",
  fontWeight: 950,
  fontSize: "12px",
};

const waitingOnceHintStyle: CSSProperties = {
  color: "#C8B6A4",
  fontWeight: 900,
  fontSize: "11px",
};

const wholeOrderActionStyle: CSSProperties = {
  marginTop: "9px",
  borderTop: "1px solid rgba(74,52,37,0.9)",
  paddingTop: "9px",
};

const wholeOrderReadyButtonStyle: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(49,130,206,0.55)",
  borderRadius: "16px",
  padding: "12px",
  background: "linear-gradient(135deg, rgba(49,130,206,0.30), rgba(49,130,206,0.16))",
  color: "#DBEEFF",
  fontWeight: 950,
  fontSize: "14px",
};

const notesStyle: CSSProperties = {
  marginTop: "9px",
  border: "1px solid rgba(198,138,61,0.38)",
  background: "rgba(198,138,61,0.11)",
  color: "#F3C77E",
  borderRadius: "16px",
  padding: "8px",
};

const notesLabelStyle: CSSProperties = {
  display: "block",
  color: "#DEA54B",
  fontSize: "12px",
  fontWeight: 950,
  marginBottom: "5px",
};

const notesTextStyle: CSSProperties = {
  margin: 0,
  color: "#FFF8F0",
  fontSize: "14px",
  fontWeight: 900,
  lineHeight: 1.7,
};
