"use client";

import { useState, type CSSProperties } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { OperationButton } from "@/components/operations/OperationButton";
import { OperationLayout } from "@/components/operations/OperationLayout";
import { OperationMode } from "@/components/operations/OperationMode";
import { OperationStats } from "@/components/operations/OperationStats";
import { OperationTabs } from "@/components/operations/OperationTabs";
import {
  formatMoney,
  formatTime,
  getPaymentMethodLabel,
  type CashierSession,
  type CashierTab,
  type PaymentMethod,
  useCashier,
} from "@/hooks/operations/useCashier";

export default function CashierPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const branchId = params.id as string;
  const selectedTableId = searchParams.get("tableId");
  const [operationMode, setOperationMode] = useState(false);

  const cashier = useCashier(branchId, selectedTableId);

  return (
    <OperationLayout operationMode={operationMode}>
      <OperationMode active={operationMode} />

      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>المحاسبة اليومية</p>
          <h1 style={heroTitleStyle}>شاشة الكاشير</h1>
          {!operationMode ? (
            <p style={heroTextStyle}>كل يوم بيوم. اختر التاريخ، راجع الفواتير، طبق الخصم، ثم حصّل المبلغ.</p>
          ) : null}
        </div>

        <div style={heroRightStyle}>
          <OperationButton
            tone="gray"
            onClick={() => setOperationMode((current) => !current)}
          >
            {operationMode ? "الخروج من وضع التشغيل" : "وضع التشغيل"}
          </OperationButton>

          <label style={dateLabelStyle}>
            من تاريخ
            <input
              type="date"
              value={cashier.dateFrom}
              onChange={(event) => cashier.setDateFrom(event.target.value)}
              style={dateInputStyle}
            />
          </label>

          <label style={dateLabelStyle}>
            إلى تاريخ
            <input
              type="date"
              value={cashier.dateTo}
              onChange={(event) => cashier.setDateTo(event.target.value)}
              style={dateInputStyle}
            />
          </label>

          <div style={heroAmountStyle}>
            <span style={heroAmountLabelStyle}>المحصل حسب الفترة</span>
            <strong style={heroAmountValueStyle}>{formatMoney(cashier.paidAmount)}</strong>
          </div>
        </div>
      </section>

      <OperationStats
        columns={4}
        stats={[
          { title: "طلبات الفواتير", value: cashier.pendingSessions.length, tone: "gold" },
          { title: "تمت المحاسبة", value: cashier.paidSessions.length, tone: "green" },
          { title: "إجمالي المحصل", value: formatMoney(cashier.paidAmount), tone: "blue" },
          { title: "إجمالي الخصومات", value: formatMoney(cashier.discountAmount), tone: "red" },
        ]}
      />

      <OperationTabs<CashierTab>
        activeTab={cashier.activeTab}
        onChange={cashier.setActiveTab}
        tabs={[
          { key: "pending", label: "طلبات الفواتير", icon: "💳", count: cashier.pendingSessions.length },
          { key: "paid", label: "تمت المحاسبة", icon: "✅", count: cashier.paidSessions.length },
        ]}
      />

      {cashier.message ? <div style={messageStyle}>{cashier.message}</div> : null}

      {cashier.loading ? (
        <section style={emptyStyle}>جاري تحميل بيانات الكاشير...</section>
      ) : cashier.visibleSessions.length === 0 ? (
        <section style={emptyStyle}>لا توجد فواتير في هذا التصنيف لهذا التاريخ.</section>
      ) : (
        <section style={sessionsGridStyle(operationMode)}>
          {cashier.visibleSessions.map((session) => (
            <CashierSessionCard
              key={session.request.id}
              session={session}
              discountValue={cashier.discountInputs[session.request.id] || ""}
              paymentMethod={cashier.paymentMethods[session.request.id] || "cash"}
              transactionRef={cashier.transactionRefs[session.request.id] || ""}
              onDiscountChange={(value) => cashier.setDiscountInput(session.request.id, value)}
              onApplyDiscount={() => cashier.applyDiscount(session)}
              onRemoveDiscount={() => cashier.removeDiscount(session)}
              onPaymentMethodChange={(value) => cashier.setPaymentMethod(session.request.id, value)}
              onTransactionRefChange={(value) => cashier.setTransactionRef(session.request.id, value)}
              onCompletePayment={() => cashier.completePayment(session)}
            />
          ))}
        </section>
      )}
    </OperationLayout>
  );
}

function CashierSessionCard({
  session,
  discountValue,
  paymentMethod,
  transactionRef,
  onDiscountChange,
  onApplyDiscount,
  onRemoveDiscount,
  onPaymentMethodChange,
  onTransactionRefChange,
  onCompletePayment,
}: {
  session: CashierSession;
  discountValue: string;
  paymentMethod: PaymentMethod;
  transactionRef: string;
  onDiscountChange: (value: string) => void;
  onApplyDiscount: () => void;
  onRemoveDiscount: () => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onTransactionRefChange: (value: string) => void;
  onCompletePayment: () => void;
}) {
  const isPending = session.request.status === "pending";

  return (
    <article style={sessionCardStyle}>
      <div style={sessionHeaderStyle}>
        <div>
          <h2 style={tableTitleStyle}>طاولة {session.table_number || "غير محددة"}</h2>
          <p style={mutedTextStyle}>{session.section_name}</p>
          <p style={mutedTextStyle}>
            {isPending ? "طلب الفاتورة" : "وقت المحاسبة"}: {formatTime(session.paidAt || session.request.created_at)}
          </p>
        </div>

        <span style={isPending ? billingBadgeStyle : paidBadgeStyle}>
          {isPending ? "بانتظار المحاسبة" : "تمت المحاسبة"}
        </span>
      </div>

      <div style={ordersWrapStyle}>
        {session.orders.length === 0 ? (
          <div style={itemRowStyle}>لا توجد طلبات مرتبطة بهذه الجلسة.</div>
        ) : (
          session.orders.map((order) => (
            <div key={order.id} style={orderBoxStyle}>
              <div style={orderMiniHeaderStyle}>
                <strong>#{order.order_number || "غير محدد"}</strong>
                <span>{formatMoney(Number(order.total || 0))}</span>
              </div>

              <div style={itemsWrapStyle}>
                {(order.order_items || []).map((item) => {
                  const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
                  return (
                    <div key={item.id} style={itemRowStyle}>
                      <div style={itemInfoStyle}>
                        <span style={itemQuantityStyle}>{item.quantity}×</span>
                        <div>
                          <strong style={itemNameStyle}>{item.products?.name || "منتج غير معروف"}</strong>
                          {item.notes ? <p style={itemNoteStyle}>ملاحظة: {item.notes}</p> : null}
                        </div>
                      </div>
                      <span style={itemPriceStyle}>{formatMoney(itemTotal)}</span>
                    </div>
                  );
                })}
              </div>

              {order.notes ? <div style={notesStyle}>ملاحظات الطلب: {order.notes}</div> : null}
            </div>
          ))
        )}
      </div>

      <div style={totalsBoxStyle}>
        <LineTotal label="الإجمالي قبل الخصم" value={formatMoney(session.subtotal)} />
        <LineTotal label="الخصم" value={`- ${formatMoney(session.discountAmount)}`} />
        <LineTotal label="المطلوب تحصيله" value={formatMoney(session.paidAmount)} strong />
      </div>

      {session.discountCode ? (
        <div style={discountAppliedStyle}>
          كود الخصم: <strong>{session.discountCode}</strong>
          {isPending ? (
            <button onClick={onRemoveDiscount} style={smallDangerButtonStyle}>إزالة</button>
          ) : null}
        </div>
      ) : null}

      {isPending ? (
        <div style={discountBoxStyle}>
          <input
            value={discountValue}
            onChange={(event) => onDiscountChange(event.target.value)}
            placeholder="كود الخصم"
            style={discountInputStyle}
          />
          <button onClick={onApplyDiscount} style={secondaryButtonStyle}>تطبيق الخصم</button>
        </div>
      ) : null}

      {isPending ? (
        <div style={paymentBoxStyle}>
          <label style={paymentLabelStyle}>نوع الدفع</label>
          <select
            value={paymentMethod}
            onChange={(event) => onPaymentMethodChange(event.target.value as PaymentMethod)}
            style={paymentSelectStyle}
          >
            <option value="cash">كاش</option>
            <option value="mada">مدى</option>
            <option value="visa">فيزا</option>
            <option value="installments">أقساط</option>
          </select>

          {paymentMethod !== "cash" ? (
            <input
              value={transactionRef}
              onChange={(event) => onTransactionRefChange(event.target.value)}
              placeholder="رقم العملية"
              style={paymentInputStyle}
            />
          ) : null}
        </div>
      ) : (
        <div style={paymentInfoStyle}>
          <LineTotal label="نوع الدفع" value={getPaymentMethodLabel(session.paymentMethod)} />
          {session.paymentMethod && session.paymentMethod !== "cash" ? (
            <LineTotal label="رقم العملية" value={session.transactionReference || "غير مسجل"} />
          ) : null}
        </div>
      )}

      {isPending ? (
        <OperationButton
          tone="gold"
          fullWidth
          onClick={onCompletePayment}
          disabled={session.orders.length === 0 || session.subtotal <= 0}
          style={{ marginTop: "10px" }}
        >
          تمت المحاسبة وتحويل الطاولة للتنظيف
        </OperationButton>
      ) : null}
    </article>
  );
}

function LineTotal({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={lineTotalStyle}>
      <span>{label}</span>
      <strong style={{ color: strong ? "#DEA54B" : "#FFF8F0" }}>{value}</strong>
    </div>
  );
}

const heroStyle: CSSProperties = {
  background: "linear-gradient(135deg, #241B16, #1C1612)",
  border: "1px solid #4A3425",
  borderRadius: "30px",
  padding: "18px",
  boxShadow: "0 22px 70px rgba(0,0,0,.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
};
const eyebrowStyle: CSSProperties = { margin: "0 0 7px", color: "#DEA54B", fontWeight: 950, fontSize: "13px" };
const heroTitleStyle: CSSProperties = { margin: 0, fontSize: "36px", fontWeight: 950, color: "#FFF8F0", lineHeight: 1 };
const heroTextStyle: CSSProperties = { margin: "10px 0 0", color: "#C8B6A4", fontWeight: 800, fontSize: "14px", lineHeight: 1.7 };
const heroRightStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" };
const dateLabelStyle: CSSProperties = { display: "grid", gap: "7px", color: "#C8B6A4", fontSize: "12px", fontWeight: 950 };
const dateInputStyle: CSSProperties = { border: "1px solid #4A3425", background: "#2A211C", color: "#FFF8F0", borderRadius: "16px", padding: "12px", fontWeight: 900, outline: "none" };
const heroAmountStyle: CSSProperties = { minWidth: "190px", borderRadius: "24px", border: "1px solid rgba(198,138,61,.35)", background: "rgba(198,138,61,.10)", padding: "14px", textAlign: "center" };
const heroAmountLabelStyle: CSSProperties = { display: "block", color: "#C8B6A4", fontSize: "12px", fontWeight: 900 };
const heroAmountValueStyle: CSSProperties = { display: "block", marginTop: "7px", color: "#DEA54B", fontSize: "24px", fontWeight: 950, whiteSpace: "nowrap" };
const emptyStyle: CSSProperties = { background: "#241B16", border: "1px solid #4A3425", borderRadius: "30px", padding: "28px", textAlign: "center", color: "#C8B6A4", fontWeight: 950 };
const messageStyle: CSSProperties = { background: "rgba(198,138,61,.12)", border: "1px solid rgba(198,138,61,.35)", borderRadius: "18px", padding: "14px", color: "#DEA54B", fontWeight: 950 };
const sessionsGridStyle = (_operationMode: boolean): CSSProperties => ({ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px", alignItems: "start" });
const sessionCardStyle: CSSProperties = { background: "#241B16", border: "1px solid #4A3425", borderRadius: "26px", padding: "13px", boxShadow: "0 18px 55px rgba(0,0,0,.24)", height: "620px", display: "flex", flexDirection: "column", overflow: "hidden" };
const sessionHeaderStyle: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", borderBottom: "1px solid #4A3425", paddingBottom: "10px" };
const tableTitleStyle: CSSProperties = { margin: 0, color: "#FFF8F0", fontSize: "25px", fontWeight: 950, lineHeight: 1 };
const mutedTextStyle: CSSProperties = { margin: "6px 0 0", color: "#C8B6A4", fontWeight: 850, fontSize: "12px" };
const billingBadgeStyle: CSSProperties = { borderRadius: "999px", padding: "8px 11px", background: "rgba(198,138,61,.14)", color: "#DEA54B", border: "1px solid rgba(198,138,61,.34)", fontWeight: 950, whiteSpace: "nowrap", fontSize: "12px" };
const paidBadgeStyle: CSSProperties = { ...billingBadgeStyle, background: "rgba(63,163,108,.14)", color: "#9DE7B4", border: "1px solid rgba(63,163,108,.34)" };
const ordersWrapStyle: CSSProperties = { display: "grid", gap: "9px", marginTop: "11px", flex: 1, minHeight: 0, overflowY: "auto" };
const orderBoxStyle: CSSProperties = { border: "1px solid rgba(74,52,37,.95)", background: "#2A211C", borderRadius: "20px", padding: "10px" };
const orderMiniHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "8px", color: "#DEA54B", fontWeight: 950, marginBottom: "9px", fontSize: "13px" };
const itemsWrapStyle: CSSProperties = { display: "grid", gap: "7px" };
const itemRowStyle: CSSProperties = { border: "1px solid rgba(74,52,37,.95)", background: "#241B16", borderRadius: "16px", padding: "9px", color: "#FFF8F0", fontWeight: 850, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" };
const itemInfoStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "8px", minWidth: 0 };
const itemQuantityStyle: CSSProperties = { minWidth: "34px", height: "30px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", background: "rgba(198,138,61,.14)", border: "1px solid rgba(198,138,61,.32)", color: "#DEA54B", fontWeight: 950 };
const itemNameStyle: CSSProperties = { color: "#FFF8F0", fontSize: "13px" };
const itemNoteStyle: CSSProperties = { margin: "4px 0 0", color: "#C8B6A4", fontSize: "11px", fontWeight: 800 };
const itemPriceStyle: CSSProperties = { color: "#DEA54B", fontWeight: 950, fontSize: "12px", whiteSpace: "nowrap" };
const notesStyle: CSSProperties = { marginTop: "8px", border: "1px solid rgba(198,138,61,.34)", background: "rgba(198,138,61,.10)", color: "#F3C77E", borderRadius: "16px", padding: "9px", fontWeight: 900, fontSize: "12px" };
const totalsBoxStyle: CSSProperties = { marginTop: "10px", border: "1px solid rgba(74,52,37,.95)", background: "#2A211C", borderRadius: "18px", padding: "10px", display: "grid", gap: "7px" };
const lineTotalStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", color: "#C8B6A4", fontWeight: 900, fontSize: "13px" };
const discountBoxStyle: CSSProperties = { marginTop: "10px", display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" };
const discountInputStyle: CSSProperties = { border: "1px solid #4A3425", background: "#2A211C", color: "#FFF8F0", borderRadius: "16px", padding: "11px", fontWeight: 900, outline: "none", minWidth: 0 };
const secondaryButtonStyle: CSSProperties = { border: "1px solid rgba(198,138,61,.45)", borderRadius: "16px", padding: "11px", background: "rgba(198,138,61,.12)", color: "#DEA54B", fontWeight: 950, cursor: "pointer", whiteSpace: "nowrap" };
const discountAppliedStyle: CSSProperties = { marginTop: "10px", border: "1px solid rgba(63,163,108,.34)", background: "rgba(63,163,108,.12)", color: "#B9F6CE", borderRadius: "16px", padding: "10px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" };
const smallDangerButtonStyle: CSSProperties = { border: "1px solid rgba(239,68,68,.35)", background: "rgba(239,68,68,.12)", color: "#FCA5A5", borderRadius: "12px", padding: "7px 9px", fontWeight: 900, cursor: "pointer" };
const paymentBoxStyle: CSSProperties = { marginTop: "10px", border: "1px solid rgba(74,52,37,.95)", background: "#2A211C", borderRadius: "18px", padding: "10px", display: "grid", gap: "8px" };
const paymentLabelStyle: CSSProperties = { color: "#C8B6A4", fontWeight: 950, fontSize: "12px" };
const paymentSelectStyle: CSSProperties = { width: "100%", border: "1px solid #4A3425", background: "#241B16", color: "#FFF8F0", borderRadius: "15px", padding: "11px", fontWeight: 900, outline: "none" };
const paymentInputStyle: CSSProperties = { width: "100%", border: "1px solid #4A3425", background: "#241B16", color: "#FFF8F0", borderRadius: "15px", padding: "11px", fontWeight: 900, outline: "none" };
const paymentInfoStyle: CSSProperties = { marginTop: "10px", border: "1px solid rgba(63,163,108,.28)", background: "rgba(63,163,108,.10)", borderRadius: "18px", padding: "10px", display: "grid", gap: "7px" };
