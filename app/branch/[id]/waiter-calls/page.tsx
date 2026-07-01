"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { OperationButton } from "@/components/operations/OperationButton";
import { OperationLayout } from "@/components/operations/OperationLayout";
import { OperationMode } from "@/components/operations/OperationMode";
import { OperationStats } from "@/components/operations/OperationStats";
import { OperationTabs } from "@/components/operations/OperationTabs";
import {
  OperationBadge,
  OperationCard,
} from "@/components/operations/OperationCard";
import {
  type ActiveWaiterTab,
  type BillRequest,
  type CleaningTable,
  type ReadyTask,
  type WaiterOperationTask,
  type WaiterCall,
  useWaiter,
} from "@/hooks/operations/useWaiter";
import type { OperationTab } from "@/components/operations/types";

const baseTabs: { key: ActiveWaiterTab; label: string; icon: string }[] = [
  { key: "all", label: "الكل", icon: "⚡" },
  { key: "ready", label: "جاهز للاستلام", icon: "🍽️" },
  { key: "bills", label: "طلبات الفاتورة", icon: "💳" },
  { key: "calls", label: "استدعاء النادل", icon: "🛎️" },
  { key: "cleaning", label: "تنظيف الطاولة", icon: "🧹" },
];

export default function WaiterCallsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [activeTab, setActiveTab] = useState<ActiveWaiterTab>("all");
  const [operationMode, setOperationMode] = useState(false);

  const {
    readyTasks,
    allTasks,
    readyCount,
    pickedUpCount,
    bills,
    calls,
    cleaningTables,
    loading,
    message,
    markItemsPickedUp,
    markItemsDelivered,
    completeCall,
    completeBillRequest,
    finishCleaning,
  } = useWaiter(branchId);

  const tabs = useMemo<OperationTab<ActiveWaiterTab>[]>(
    () =>
      baseTabs.map((tab) => ({
        ...tab,
        count:
          tab.key === "all"
            ? allTasks.length
            : tab.key === "ready"
              ? readyTasks.length
              : tab.key === "bills"
                ? bills.length
                : tab.key === "calls"
                  ? calls.length
                  : cleaningTables.length,
      })),
    [allTasks.length, readyTasks.length, bills.length, calls.length, cleaningTables.length],
  );

  const activeListCount = tabs.find((tab) => tab.key === activeTab)?.count || 0;

  return (
    <OperationLayout operationMode={operationMode}>
      <OperationMode active={operationMode} />

      <section style={topBarStyle(operationMode)}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Waiter · شاشة تشغيل</p>
          <h1 style={titleStyle(operationMode)}>النادل</h1>
          {!operationMode ? (
            <p style={subtitleStyle}>
              استلام الجاهز، الفواتير، الاستدعاءات، وتنظيف الطاولات من مكان
              واحد.
            </p>
          ) : null}
        </div>

        <OperationButton
          tone="gold"
          onClick={() => setOperationMode((current) => !current)}
          style={operationButtonFixStyle}
        >
          {operationMode ? "الخروج من وضع التشغيل" : "وضع التشغيل"}
        </OperationButton>
      </section>

      {!operationMode ? (
        <OperationStats
          columns={5}
          stats={[
            { title: "جاهز", value: readyCount, tone: "green" },
            { title: "مستلم", value: pickedUpCount, tone: "blue" },
            { title: "فواتير", value: bills.length, tone: "gold" },
            { title: "استدعاء", value: calls.length, tone: "red" },
            { title: "تنظيف", value: cleaningTables.length, tone: "gray" },
          ]}
        />
      ) : null}

      <section style={tabsWrapStyle(operationMode)}>
        <OperationTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </section>

      {message ? <div style={errorStyle}>{message}</div> : null}

      {loading ? (
        <section style={emptyStyle}>جاري تحميل شاشة النادل...</section>
      ) : null}

      {!loading && activeListCount === 0 ? (
        <section style={emptyStyle}>لا توجد عناصر حالياً في هذا القسم.</section>
      ) : null}

      {!loading && activeTab === "all" ? (
        <section style={gridStyle(operationMode)}>
          {allTasks.map((task) => (
            <WaiterUnifiedTaskCard
              key={task.id}
              task={task}
              operationMode={operationMode}
              onReadyPickUp={(readyTask) => markItemsPickedUp(readyTask)}
              onReadyDeliver={(readyTask) => markItemsDelivered(readyTask)}
              onBill={(bill) => completeBillRequest(bill)}
              onCall={(call) => completeCall(call.id)}
              onCleaning={(table) => finishCleaning(table)}
            />
          ))}
        </section>
      ) : null}

      {!loading && activeTab === "ready" ? (
        <section style={gridStyle(operationMode)}>
          {readyTasks.map((task) => (
            <ReadyTaskCard
              key={task.id}
              task={task}
              operationMode={operationMode}
              onPickUp={() => markItemsPickedUp(task)}
              onDeliver={() => markItemsDelivered(task)}
            />
          ))}
        </section>
      ) : null}

      {!loading && activeTab === "bills" ? (
        <section style={gridStyle(operationMode)}>
          {bills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              onAction={() => completeBillRequest(bill)}
            />
          ))}
        </section>
      ) : null}

      {!loading && activeTab === "calls" ? (
        <section style={gridStyle(operationMode)}>
          {calls.map((call) => (
            <CallCard
              key={call.id}
              call={call}
              onAction={() => completeCall(call.id)}
            />
          ))}
        </section>
      ) : null}

      {!loading && activeTab === "cleaning" ? (
        <section style={gridStyle(operationMode)}>
          {cleaningTables.map((table) => (
            <CleaningCard
              key={table.id}
              table={table}
              onAction={() => finishCleaning(table)}
            />
          ))}
        </section>
      ) : null}
    </OperationLayout>
  );
}

function WaiterUnifiedTaskCard({
  task,
  operationMode,
  onReadyPickUp,
  onReadyDeliver,
  onBill,
  onCall,
  onCleaning,
}: {
  task: WaiterOperationTask;
  operationMode: boolean;
  onReadyPickUp: (task: ReadyTask) => void;
  onReadyDeliver: (task: ReadyTask) => void;
  onBill: (bill: BillRequest) => void;
  onCall: (call: WaiterCall) => void;
  onCleaning: (table: CleaningTable) => void;
}) {
  if (task.type === "ready") {
    return (
      <ReadyTaskCard
        task={task.readyTask}
        operationMode={operationMode}
        onPickUp={() => onReadyPickUp(task.readyTask)}
        onDeliver={() => onReadyDeliver(task.readyTask)}
      />
    );
  }

  if (task.type === "bills") {
    return (
      <BillCard
        bill={task.bill}
        onAction={() => onBill(task.bill)}
        operationMode={operationMode}
      />
    );
  }

  if (task.type === "calls") {
    return (
      <CallCard
        call={task.call}
        onAction={() => onCall(task.call)}
        operationMode={operationMode}
      />
    );
  }

  return (
    <CleaningCard
      table={task.table}
      onAction={() => onCleaning(task.table)}
      operationMode={operationMode}
    />
  );
}

function ReadyTaskCard({
  task,
  operationMode,
  onPickUp,
  onDeliver,
}: {
  task: ReadyTask;
  operationMode: boolean;
  onPickUp: () => void;
  onDeliver: () => void;
}) {
  const isPickedUp = task.status === "picked_up";

  return (
    <OperationCard style={taskCardStyle(operationMode)}>
      <CardHeader
        badge={task.mode === "once" ? "مرة واحدة" : "دفعات"}
        badgeStyle={modeBadgeStyle(task.mode)}
        title={`طاولة ${task.table?.table_number || "غير محددة"}`}
        section={task.table?.section_name || "القسم الرئيسي"}
        meta={
          <StatusMeta
            isPickedUp={isPickedUp}
            time={task.readyAt || task.createdAt}
          />
        }
        operationMode={operationMode}
      />

      <div style={orderInfoStyle(operationMode)}>
        <strong>{task.title}</strong>
        <span>{task.subtitle}</span>
        <span>رقم الطلب: {task.orderNumber || "غير محدد"}</span>
        <span>
          الانتظار: {getWaitingMinutes(task.readyAt || task.createdAt)} د
        </span>
      </div>

      <div style={itemsListStyle(operationMode)}>
        {task.items.map((item) => (
          <div key={item.id} style={itemRowStyle}>
            <span style={qtyStyle}>{item.quantity}×</span>
            <div>
              <strong>{item.products?.name || "منتج غير معروف"}</strong>
              {item.notes ? <p style={noteStyle}>📝 {item.notes}</p> : null}
            </div>
          </div>
        ))}
      </div>

      <OperationButton
        tone={isPickedUp ? "green" : "gold"}
        fullWidth
        onClick={isPickedUp ? onDeliver : onPickUp}
      >
        {isPickedUp ? "تم التسليم للطاولة" : "استلام من المطبخ"}
      </OperationButton>
    </OperationCard>
  );
}

function BillCard({
  bill,
  onAction,
  operationMode = false,
}: {
  bill: BillRequest;
  onAction: () => void;
  operationMode?: boolean;
}) {
  return (
    <SimpleTaskCard
      icon="💳"
      badge="طلب فاتورة"
      title={`طاولة ${bill.tables?.table_number || "غير محددة"}`}
      section={bill.tables?.section_name || "القسم الرئيسي"}
      time={bill.created_at}
      note="العميل طلب الفاتورة. النادل يبلغ الكاشير فقط، والكاشير هو من ينهي المحاسبة."
      actionLabel="تم إبلاغ الكاشير"
      onAction={onAction}
      operationMode={operationMode}
    />
  );
}

function CallCard({
  call,
  onAction,
  operationMode = false,
}: {
  call: WaiterCall;
  onAction: () => void;
  operationMode?: boolean;
}) {
  return (
    <SimpleTaskCard
      icon="🛎️"
      badge="استدعاء نادل"
      title={`طاولة ${call.tables?.table_number || "غير محددة"}`}
      section={call.tables?.section_name || "القسم الرئيسي"}
      time={call.created_at}
      note="العميل يحتاج مساعدة من الموظف."
      actionLabel="تمت الخدمة"
      onAction={onAction}
      operationMode={operationMode}
    />
  );
}

function CleaningCard({
  table,
  onAction,
  operationMode = false,
}: {
  table: CleaningTable;
  onAction: () => void;
  operationMode?: boolean;
}) {
  return (
    <SimpleTaskCard
      icon="🧹"
      badge="تنظيف الطاولة"
      title={`طاولة ${table.table_number}`}
      section={table.section_name || "القسم الرئيسي"}
      time={table.last_activity_at || new Date().toISOString()}
      note="نظّف الطاولة ثم اجعلها متاحة للعميل التالي."
      actionLabel="تم التنظيف والطاولة متاحة"
      onAction={onAction}
      operationMode={operationMode}
    />
  );
}

function SimpleTaskCard({
  icon,
  badge,
  title,
  section,
  time,
  note,
  actionLabel,
  onAction,
  operationMode = false,
}: {
  icon: string;
  badge: string;
  title: string;
  section: string;
  time: string;
  note: string;
  actionLabel: string;
  onAction: () => void;
  operationMode?: boolean;
}) {
  return (
    <OperationCard style={taskCardStyle(operationMode)}>
      <CardHeader
        badge={`${icon} ${badge}`}
        badgeStyle={simpleBadgeStyle}
        title={title}
        section={section}
        meta={<span style={timeStyle}>{formatTime(time)}</span>}
        operationMode={operationMode}
      />

      <div style={noticeStyle}>{note}</div>
      <p style={mutedTextStyle}>منذ {getWaitingMinutes(time)} دقيقة</p>
      <OperationButton tone="green" fullWidth onClick={onAction}>
        {actionLabel}
      </OperationButton>
    </OperationCard>
  );
}

function CardHeader({
  badge,
  badgeStyle,
  title,
  section,
  meta,
  operationMode,
}: {
  badge: string;
  badgeStyle: CSSProperties;
  title: string;
  section: string;
  meta: React.ReactNode;
  operationMode: boolean;
}) {
  return (
    <div style={cardHeaderStyle}>
      <div>
        <OperationBadge style={badgeStyle}>{badge}</OperationBadge>
        <h2 style={tableTitleStyle(operationMode)}>{title}</h2>
        <p style={mutedTextStyle}>{section}</p>
      </div>
      <div style={rightMetaStyle}>{meta}</div>
    </div>
  );
}

function StatusMeta({
  isPickedUp,
  time,
}: {
  isPickedUp: boolean;
  time: string | null;
}) {
  return (
    <>
      <OperationBadge style={statusBadgeStyle(isPickedUp)}>
        {isPickedUp ? "مستلم" : "جاهز"}
      </OperationBadge>
      <span style={timeStyle}>{formatTime(time)}</span>
    </>
  );
}

function getWaitingMinutes(date: string | null) {
  if (!date) return 0;
  return Math.max(
    1,
    Math.floor((Date.now() - new Date(date).getTime()) / 60000),
  );
}

function formatTime(date: string | null) {
  if (!date) return "غير محدد";
  return new Date(date).toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const topBarStyle = (operationMode: boolean): CSSProperties => ({
  border: "1px solid #4A3425",
  borderRadius: operationMode ? "22px" : "28px",
  background: "linear-gradient(135deg, #241B16, #16110E)",
  padding: operationMode ? "12px" : "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  boxShadow: "0 18px 55px rgba(0,0,0,.28)",
  position: operationMode ? "sticky" : "static",
  top: 0,
  zIndex: 20,
});

const eyebrowStyle: CSSProperties = {
  margin: "0 0 6px",
  color: "#DEA54B",
  fontWeight: 950,
  fontSize: "13px",
};
const titleStyle = (operationMode: boolean): CSSProperties => ({
  margin: 0,
  fontSize: operationMode ? "34px" : "36px",
  fontWeight: 950,
  lineHeight: 1,
});
const subtitleStyle: CSSProperties = {
  margin: "10px 0 0",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "14px",
};
const operationButtonFixStyle: CSSProperties = {
  border: "1px solid rgba(198,138,61,.62)",
  background: "rgba(198,138,61,.14)",
  color: "#DEA54B",
};

const tabsWrapStyle = (operationMode: boolean): CSSProperties => ({
  position: operationMode ? "sticky" : "static",
  top: operationMode ? "74px" : "auto",
  zIndex: 19,
});

const gridStyle = (operationMode: boolean): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: operationMode
    ? "repeat(4, minmax(0, 1fr))"
    : "repeat(3, minmax(0, 1fr))",
  gap: operationMode ? "10px" : "14px",
});

const taskCardStyle = (operationMode: boolean): CSSProperties => ({
  background: "linear-gradient(145deg, #241B16, #1D1612)",
  borderRadius: operationMode ? "22px" : "26px",
  padding: operationMode ? "11px" : "13px",
  minHeight: "auto",
  gap: operationMode ? "8px" : "10px",
});

const cardHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  borderBottom: "1px solid #4A3425",
  paddingBottom: "10px",
};

const tableTitleStyle = (operationMode: boolean): CSSProperties => ({
  margin: "8px 0 0",
  fontSize: operationMode ? "26px" : "30px",
  fontWeight: 950,
  lineHeight: 1,
});

const mutedTextStyle: CSSProperties = {
  margin: "7px 0 0",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "13px",
};
const rightMetaStyle: CSSProperties = {
  display: "grid",
  justifyItems: "end",
  gap: "7px",
};
const timeStyle: CSSProperties = {
  color: "#C8B6A4",
  fontWeight: 900,
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const modeBadgeStyle = (mode: "once" | "staged"): CSSProperties => ({
  background: mode === "once" ? "rgba(59,130,246,.16)" : "rgba(139,92,246,.18)",
  color: mode === "once" ? "#93C5FD" : "#C4B5FD",
  border:
    mode === "once"
      ? "1px solid rgba(59,130,246,.34)"
      : "1px solid rgba(139,92,246,.38)",
});

const simpleBadgeStyle: CSSProperties = {
  background: "rgba(198,138,61,.14)",
  color: "#DEA54B",
  border: "1px solid rgba(198,138,61,.34)",
};

const statusBadgeStyle = (isPickedUp: boolean): CSSProperties => ({
  background: isPickedUp ? "rgba(59,130,246,.14)" : "rgba(63,163,108,.16)",
  color: isPickedUp ? "#93C5FD" : "#9DE7B4",
  border: isPickedUp
    ? "1px solid rgba(59,130,246,.34)"
    : "1px solid rgba(63,163,108,.38)",
});

const orderInfoStyle = (operationMode: boolean): CSSProperties => ({
  border: "1px solid rgba(74,52,37,.9)",
  background: "#2A211C",
  borderRadius: "18px",
  padding: operationMode ? "8px" : "10px",
  display: "grid",
  gap: "5px",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: operationMode ? "12px" : "13px",
});

const itemsListStyle = (operationMode: boolean): CSSProperties => ({
  display: "grid",
  gap: "7px",
  maxHeight: operationMode ? "155px" : "180px",
  overflowY: "auto",
});

const itemRowStyle: CSSProperties = {
  border: "1px solid #4A3425",
  borderRadius: "17px",
  background: "rgba(255,248,240,.045)",
  padding: "9px",
  display: "flex",
  gap: "9px",
  alignItems: "flex-start",
};

const qtyStyle: CSSProperties = {
  minWidth: "36px",
  borderRadius: "14px",
  background: "rgba(198,138,61,.16)",
  color: "#DEA54B",
  textAlign: "center",
  padding: "5px",
  fontWeight: 950,
};

const noteStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#F3C77D",
  fontWeight: 850,
  fontSize: "12px",
};
const noticeStyle: CSSProperties = {
  border: "1px solid rgba(198,138,61,.28)",
  background: "rgba(198,138,61,.10)",
  color: "#F3C77D",
  borderRadius: "18px",
  padding: "12px",
  fontWeight: 900,
  lineHeight: 1.7,
};
const errorStyle: CSSProperties = {
  border: "1px solid rgba(239,68,68,.35)",
  background: "rgba(239,68,68,.14)",
  color: "#FCA5A5",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 900,
};
const emptyStyle: CSSProperties = {
  border: "1px solid #4A3425",
  background: "#241B16",
  color: "#C8B6A4",
  borderRadius: "24px",
  padding: "24px",
  textAlign: "center",
  fontWeight: 950,
};
