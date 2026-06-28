"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type OrderStatus = "new" | "preparing" | "ready" | "delivered";

type Product = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  stock_quantity: number | null;
};

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  notes: string | null;
  product_id: string | null;
  products: {
    id: string;
    name: string;
    price: number;
  } | null;
};

type Order = {
  id: string;
  order_number: string | null;
  status: OrderStatus;
  total: number;
  notes: string | null;
  created_at: string;
  table_id: string | null;
  tables: {
    table_number: number;
    section_name: string | null;
  } | null;
  order_items?: OrderItem[];
};

type EditableOrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  notes: string;
  isNew?: boolean;
};

const theme = {
  background: "#16110E",
  card: "#241B16",
  secondaryCard: "#2A211C",
  border: "#4A3425",
  primaryGold: "#C68A3D",
  hoverGold: "#DEA54B",
  primaryText: "#FFF8F0",
  secondaryText: "#C8B6A4",
  danger: "#C94F4F",
  success: "#3FA36C",
};

const statusConfig: Record<
  OrderStatus,
  {
    label: string;
    bg: string;
    color: string;
    border: string;
  }
> = {
  new: {
    label: "طلب جديد",
    bg: "rgba(198,138,61,0.16)",
    color: theme.hoverGold,
    border: "rgba(198,138,61,0.42)",
  },
  preparing: {
    label: "جاري التحضير",
    bg: "rgba(222,165,75,0.13)",
    color: "#F3C77D",
    border: "rgba(222,165,75,0.36)",
  },
  ready: {
    label: "جاهز",
    bg: "rgba(63,163,108,0.14)",
    color: "#86D2A7",
    border: "rgba(63,163,108,0.34)",
  },
  delivered: {
    label: "تم التسليم",
    bg: "rgba(200,182,164,0.11)",
    color: theme.secondaryText,
    border: "rgba(200,182,164,0.24)",
  },
};

const filters: { label: string; value: "all" | OrderStatus }[] = [
  { label: "الكل", value: "all" },
  { label: "الجديدة", value: "new" },
  { label: "قيد التحضير", value: "preparing" },
  { label: "الجاهزة", value: "ready" },
  { label: "المسلمة", value: "delivered" },
];

export default function OrdersPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [message, setMessage] = useState("");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editableItems, setEditableItems] = useState<EditableOrderItem[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firstLoadRef = useRef(true);

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

  const newCount = orders.filter((order) => order.status === "new").length;
  const preparingCount = orders.filter(
    (order) => order.status === "preparing"
  ).length;
  const readyCount = orders.filter((order) => order.status === "ready").length;
  const deliveredCount = orders.filter(
    (order) => order.status === "delivered"
  ).length;

  async function loadProducts() {
    const { data } = await supabase
      .from("products")
      .select("id, name, price, active, stock_quantity")
      .eq("branch_id", branchId)
      .eq("active", true)
      .order("name", { ascending: true });

    setProducts((data || []) as Product[]);
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total,
        notes,
        created_at,
        table_id,
        tables (
          table_number,
          section_name
        ),
        order_items (
          id,
          quantity,
          price,
          notes,
          product_id,
          products (
            id,
            name,
            price
          )
        )
      `)
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setOrders([]);
      return;
    }

    setOrders((data ?? []) as unknown as Order[]);
  }

  async function addAuditLog(orderId: string, action: string, details?: string) {
    await supabase.from("order_audit_logs").insert({
      order_id: orderId,
      branch_id: branchId,
      action,
      details: details || null,
    });
  }

  async function updateStatus(orderId: string, status: OrderStatus) {
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await addAuditLog(
      orderId,
      status === "preparing" ? "order_approved" : "status_changed",
      `تم تغيير حالة الطلب إلى ${statusConfig[status].label}`
    );

    await loadOrders();
  }

  async function approveOrder(order: Order) {
    if (order.status !== "new") {
      setMessage("لا يمكن اعتماد الطلب بعد دخوله مرحلة التحضير.");
      return;
    }

    await updateStatus(order.id, "preparing");
  }

  function openEditModal(order: Order) {
    if (order.status !== "new") {
      setMessage("يمكن تعديل الطلبات الجديدة فقط قبل اعتمادها.");
      return;
    }

    setMessage("");
    setEditingOrder(order);
    setEditableItems(
      (order.order_items || []).map((item) => ({
        id: item.id,
        product_id: item.product_id || item.products?.id || null,
        product_name: item.products?.name || "منتج غير معروف",
        quantity: Number(item.quantity || 1),
        price: Number(item.price || item.products?.price || 0),
        notes: item.notes || "",
      }))
    );
  }

  function closeEditModal() {
    setEditingOrder(null);
    setEditableItems([]);
    setSavingEdit(false);
  }

  function updateEditableItem(
    itemId: string,
    updates: Partial<EditableOrderItem>
  ) {
    setEditableItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  }

  function removeEditableItem(itemId: string) {
    setEditableItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId)
    );
  }

  function addEditableProduct(productId: string) {
    if (!productId) return;

    const product = products.find((item) => item.id === productId);

    if (!product) return;

    const existingItem = editableItems.find(
      (item) => item.product_id === product.id && item.isNew
    );

    if (existingItem) {
      updateEditableItem(existingItem.id, {
        quantity: existingItem.quantity + 1,
      });
      return;
    }

    setEditableItems((currentItems) => [
      ...currentItems,
      {
        id: `new-${crypto.randomUUID()}`,
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: Number(product.price || 0),
        notes: "",
        isNew: true,
      },
    ]);
  }

  async function saveOrderEdits() {
    if (!editingOrder) return;

    setMessage("");

    if (editingOrder.status !== "new") {
      setMessage("يمكن تعديل الطلبات الجديدة فقط.");
      return;
    }

    if (editableItems.length === 0) {
      setMessage("لا يمكن حفظ طلب بدون منتجات.");
      return;
    }

    const invalidItem = editableItems.find((item) => item.quantity <= 0);

    if (invalidItem) {
      setMessage("كل منتج يجب أن تكون كميته 1 أو أكثر.");
      return;
    }

    setSavingEdit(true);

    const originalItems = editingOrder.order_items || [];
    const originalItemsMap = new Map(originalItems.map((item) => [item.id, item]));
    const editableExistingIds = editableItems
      .filter((item) => !item.isNew)
      .map((item) => item.id);

    const removedItems = originalItems.filter(
      (item) => !editableExistingIds.includes(item.id)
    );

    for (const removedItem of removedItems) {
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", removedItem.id);

      if (error) {
        setSavingEdit(false);
        setMessage(error.message);
        return;
      }

      await addAuditLog(
        editingOrder.id,
        "item_removed",
        `تم حذف ${removedItem.products?.name || "منتج غير معروف"}`
      );
    }

    for (const item of editableItems) {
      if (item.isNew) {
        const { error } = await supabase.from("order_items").insert({
          order_id: editingOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes.trim() || null,
        });

        if (error) {
          setSavingEdit(false);
          setMessage(error.message);
          return;
        }

        await addAuditLog(
          editingOrder.id,
          "item_added",
          `تم إضافة ${item.product_name} × ${item.quantity}`
        );

        continue;
      }

      const originalItem = originalItemsMap.get(item.id);
      const originalQuantity = Number(originalItem?.quantity || 0);
      const originalNotes = originalItem?.notes || "";

      const { error } = await supabase
        .from("order_items")
        .update({
          quantity: item.quantity,
          price: item.price,
          notes: item.notes.trim() || null,
        })
        .eq("id", item.id);

      if (error) {
        setSavingEdit(false);
        setMessage(error.message);
        return;
      }

      if (originalQuantity !== item.quantity) {
        await addAuditLog(
          editingOrder.id,
          "quantity_changed",
          `تم تعديل كمية ${item.product_name} من ${originalQuantity} إلى ${item.quantity}`
        );
      }

      if (originalNotes !== item.notes) {
        await addAuditLog(
          editingOrder.id,
          "note_changed",
          `تم تعديل ملاحظة ${item.product_name}`
        );
      }
    }

    const newTotal = editableItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const { error: orderError } = await supabase
      .from("orders")
      .update({
        total: newTotal,
      })
      .eq("id", editingOrder.id);

    if (orderError) {
      setSavingEdit(false);
      setMessage(orderError.message);
      return;
    }

    await addAuditLog(
      editingOrder.id,
      "order_edited",
      `تم حفظ تعديل الطلب. الإجمالي الجديد ${newTotal.toFixed(2)} ريال`
    );

    setSavingEdit(false);
    closeEditModal();
    await loadOrders();
  }

  useEffect(() => {
    audioRef.current = new Audio("/sounds/new-order.mp3");

    loadProducts();
    loadOrders();

    const channel = supabase
      .channel(`orders-realtime-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          if (!firstLoadRef.current) {
            audioRef.current?.play().catch(() => {});
          }

          loadOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          loadOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      loadOrders();
    }, 3000);

    const timer = setTimeout(() => {
      firstLoadRef.current = false;
    }, 1500);

    return () => {
      clearTimeout(timer);
      window.clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  const editTotal = editableItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Orders</p>
          <h1 style={heroTitleStyle}>الطلبات</h1>
          <p style={heroTextStyle}>
            راجع الطلبات الجديدة، عدّلها عند الحاجة، ثم اعتمدها لإرسالها إلى المطبخ.
          </p>
        </div>
      </section>

      <section style={statsGridStyle}>
        <StatCard title="كل الطلبات" value={orders.length} />
        <StatCard title="الجديدة" value={newCount} />
        <StatCard title="قيد التحضير" value={preparingCount} />
        <StatCard title="الجاهزة" value={readyCount} />
        <StatCard title="المسلمة" value={deliveredCount} />
      </section>

      <section style={filterCardStyle}>
        <div>
          <h2 style={sectionTitleStyle}>تصفية الطلبات</h2>
          <p style={sectionSubtitleStyle}>
            الطلب الجديد فقط يمكن تعديله قبل اعتماده وإرساله للمطبخ.
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

      {message ? <div style={errorStyle}>{message}</div> : null}

      {filteredOrders.length === 0 ? (
        <section style={emptyStyle}>لا توجد طلبات في هذا التصنيف</section>
      ) : (
        <section style={ordersGridStyle}>
          {filteredOrders.map((order) => {
            const status = statusConfig[order.status];

            return (
              <article key={order.id} style={orderCardStyle}>
                <div style={orderHeaderStyle}>
                  <div>
                    <h2 style={tableTitleStyle}>
                      طاولة {order.tables?.table_number || "غير محددة"}
                    </h2>

                    <p style={mutedTextStyle}>
                      {order.tables?.section_name || "القسم الرئيسي"}
                    </p>

                    <p style={mutedTextStyle}>
                      رقم الطلب: {order.order_number || "غير محدد"}
                    </p>

                    <p style={mutedTextStyle}>
                      الوقت:{" "}
                      {new Date(order.created_at).toLocaleTimeString("ar-SA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <span
                    style={{
                      borderRadius: "999px",
                      padding: "10px 14px",
                      background: status.bg,
                      color: status.color,
                      border: `1px solid ${status.border}`,
                      fontWeight: 950,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {status.label}
                  </span>
                </div>

                <div style={{ display: "grid", gap: "10px", marginTop: "18px" }}>
                  {(order.order_items || []).length > 0 ? (
                    (order.order_items || []).map((item) => (
                      <div key={item.id} style={itemRowStyle}>
                        <div>
                          <strong
                            style={{
                              color: theme.primaryText,
                              fontSize: "16px",
                            }}
                          >
                            {item.products?.name || "منتج غير معروف"}
                          </strong>

                          <p style={{ ...mutedTextStyle, marginTop: "6px" }}>
                            الكمية: {item.quantity}
                          </p>

                          {item.notes ? (
                            <p style={itemNoteStyle}>📝 {item.notes}</p>
                          ) : null}
                        </div>

                        <span style={itemPriceStyle}>
                          {(
                            Number(item.price || 0) *
                            Number(item.quantity || 0)
                          ).toFixed(2)}{" "}
                          ريال
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={itemRowStyle}>
                      لا توجد منتجات مرتبطة بهذا الطلب
                    </div>
                  )}
                </div>

                {order.notes ? (
                  <div style={notesStyle}>ملاحظات: {order.notes}</div>
                ) : null}

                <div style={totalBoxStyle}>
                  <span>الإجمالي</span>
                  <strong>{Number(order.total || 0).toFixed(2)} ريال</strong>
                </div>

                {order.status === "new" ? (
                  <div style={newOrderActionsStyle}>
                    <button
                      onClick={() => openEditModal(order)}
                      style={secondaryButtonStyle}
                    >
                      ✏️ تعديل الطلب
                    </button>

                    <button
                      onClick={() => approveOrder(order)}
                      style={primaryButtonStyle}
                    >
                      ✅ اعتماد الطلب
                    </button>
                  </div>
                ) : (
                  <div style={statusActionsStyle}>
                    <StatusAction
                      label="جاري التحضير"
                      onClick={() => updateStatus(order.id, "preparing")}
                      active={order.status === "preparing"}
                    />

                    <StatusAction
                      label="جاهز"
                      onClick={() => updateStatus(order.id, "ready")}
                      active={order.status === "ready"}
                    />

                    <StatusAction
                      label="تم التسليم"
                      onClick={() => updateStatus(order.id, "delivered")}
                      active={order.status === "delivered"}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {editingOrder ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={modalTitleStyle}>تعديل الطلب</h2>
                <p style={sectionSubtitleStyle}>
                  رقم الطلب: {editingOrder.order_number || "غير محدد"} · طاولة{" "}
                  {editingOrder.tables?.table_number || "غير محددة"}
                </p>
              </div>

              <button onClick={closeEditModal} style={modalCloseButtonStyle}>
                إغلاق
              </button>
            </div>

            <div style={editableItemsListStyle}>
              {editableItems.map((item) => (
                <div key={item.id} style={editableItemStyle}>
                  <div>
                    <strong style={{ color: theme.primaryText }}>
                      {item.product_name}
                    </strong>
                    <p style={{ ...mutedTextStyle, marginTop: "6px" }}>
                      السعر: {Number(item.price || 0).toFixed(2)} ريال
                    </p>
                  </div>

                  <div style={quantityEditorStyle}>
                    <button
                      onClick={() =>
                        updateEditableItem(item.id, {
                          quantity: Math.max(item.quantity - 1, 1),
                        })
                      }
                      style={quantityButtonStyle}
                    >
                      -
                    </button>

                    <strong style={quantityValueStyle}>{item.quantity}</strong>

                    <button
                      onClick={() =>
                        updateEditableItem(item.id, {
                          quantity: item.quantity + 1,
                        })
                      }
                      style={quantityButtonStyle}
                    >
                      +
                    </button>
                  </div>

                  <textarea
                    value={item.notes}
                    onChange={(event) =>
                      updateEditableItem(item.id, {
                        notes: event.target.value,
                      })
                    }
                    placeholder="ملاحظة المنتج"
                    style={textareaStyle}
                  />

                  <button
                    onClick={() => removeEditableItem(item.id)}
                    style={dangerButtonStyle}
                  >
                    حذف المنتج
                  </button>
                </div>
              ))}
            </div>

            <div style={addProductBoxStyle}>
              <select
                defaultValue=""
                onChange={(event) => {
                  addEditableProduct(event.target.value);
                  event.currentTarget.value = "";
                }}
                style={selectStyle}
              >
                <option value="" disabled>
                  + إضافة منتج
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {Number(product.price || 0).toFixed(2)} ريال
                  </option>
                ))}
              </select>
            </div>

            <div style={modalFooterStyle}>
              <div style={totalBoxStyle}>
                <span>الإجمالي الجديد</span>
                <strong>{editTotal.toFixed(2)} ريال</strong>
              </div>

              <button
                onClick={saveOrderEdits}
                disabled={savingEdit}
                style={{
                  ...primaryButtonStyle,
                  width: "100%",
                  opacity: savingEdit ? 0.65 : 1,
                }}
              >
                {savingEdit ? "جاري الحفظ..." : "حفظ التعديلات"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
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
          ? `1px solid ${theme.primaryGold}`
          : `1px solid ${theme.border}`,
        background: active ? "rgba(198,138,61,0.18)" : theme.secondaryCard,
        color: active ? theme.hoverGold : theme.secondaryText,
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

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={statCardStyle}>
      <p style={{ margin: 0, color: theme.secondaryText, fontWeight: 950 }}>
        {title}
      </p>

      <strong
        style={{
          display: "block",
          marginTop: "10px",
          color: theme.primaryText,
          fontWeight: 950,
          fontSize: "36px",
          lineHeight: 1,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function StatusAction({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active
          ? `1px solid ${theme.primaryGold}`
          : `1px solid ${theme.border}`,
        background: active ? "rgba(198,138,61,0.18)" : "rgba(255,248,240,0.045)",
        color: active ? theme.hoverGold : theme.secondaryText,
        borderRadius: "16px",
        padding: "12px",
        fontWeight: 950,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  color: theme.primaryText,
  display: "grid",
  gap: "18px",
};

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #241B16 0%, #1C1511 58%, #16110E 100%)",
  border: `1px solid ${theme.border}`,
  borderRadius: "30px",
  padding: "24px",
  boxShadow: "0 22px 70px rgba(0,0,0,0.32)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: theme.hoverGold,
  fontWeight: 950,
  fontSize: "15px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "42px",
  fontWeight: 950,
  color: theme.primaryText,
  lineHeight: 1,
};

const heroTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: theme.secondaryText,
  fontWeight: 800,
  fontSize: "16px",
  lineHeight: 1.8,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "14px",
};

const statCardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #241B16 0%, #2A211C 100%)",
  border: `1px solid ${theme.border}`,
  borderRadius: "28px",
  padding: "18px",
  boxShadow: "0 16px 42px rgba(0,0,0,0.24)",
};

const filterCardStyle: React.CSSProperties = {
  background: theme.card,
  border: `1px solid ${theme.border}`,
  borderRadius: "30px",
  padding: "18px",
  boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 950,
  color: theme.primaryText,
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: theme.secondaryText,
  fontWeight: 800,
  fontSize: "14px",
  lineHeight: 1.8,
};

const errorStyle: React.CSSProperties = {
  border: "1px solid rgba(201,79,79,0.42)",
  background: "rgba(201,79,79,0.14)",
  color: "#F3B0B0",
  borderRadius: "20px",
  padding: "14px",
  fontWeight: 900,
};

const emptyStyle: React.CSSProperties = {
  background: theme.card,
  border: `1px solid ${theme.border}`,
  borderRadius: "30px",
  padding: "34px",
  textAlign: "center",
  color: theme.secondaryText,
  fontWeight: 950,
};

const ordersGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
};

const orderCardStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, #241B16 0%, #1D1612 100%)",
  border: `1px solid ${theme.border}`,
  borderRadius: "30px",
  padding: "18px",
  boxShadow: "0 20px 58px rgba(0,0,0,0.28)",
};

const orderHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
};

const tableTitleStyle: React.CSSProperties = {
  margin: 0,
  color: theme.primaryText,
  fontSize: "28px",
  fontWeight: 950,
};

const mutedTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: theme.secondaryText,
  fontWeight: 850,
  fontSize: "13px",
};

const itemRowStyle: React.CSSProperties = {
  border: `1px solid ${theme.border}`,
  background: theme.secondaryCard,
  borderRadius: "20px",
  padding: "13px",
  color: theme.secondaryText,
  fontWeight: 850,
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
};

const itemPriceStyle: React.CSSProperties = {
  color: theme.hoverGold,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const itemNoteStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#F3C77D",
  fontWeight: 900,
  fontSize: "13px",
  lineHeight: 1.6,
};

const notesStyle: React.CSSProperties = {
  marginTop: "14px",
  border: "1px solid rgba(198,138,61,0.34)",
  background: "rgba(198,138,61,0.12)",
  color: "#F3C77D",
  borderRadius: "20px",
  padding: "13px",
  fontWeight: 900,
};

const totalBoxStyle: React.CSSProperties = {
  marginTop: "16px",
  borderTop: `1px solid ${theme.border}`,
  paddingTop: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  color: theme.primaryText,
  fontWeight: 950,
  fontSize: "20px",
};

const statusActionsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "16px",
};

const newOrderActionsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "16px",
};

const primaryButtonStyle: React.CSSProperties = {
  border: "0",
  borderRadius: "18px",
  padding: "14px",
  background: "linear-gradient(135deg, #C68A3D, #DEA54B)",
  color: "#16110E",
  fontWeight: 950,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${theme.border}`,
  borderRadius: "18px",
  padding: "14px",
  background: theme.secondaryCard,
  color: theme.primaryText,
  fontWeight: 950,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(201,79,79,0.42)",
  borderRadius: "16px",
  padding: "12px",
  background: "rgba(201,79,79,0.14)",
  color: "#F3B0B0",
  fontWeight: 950,
  cursor: "pointer",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(0,0,0,0.70)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const modalCardStyle: React.CSSProperties = {
  width: "min(900px, 100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  background: theme.card,
  border: `1px solid ${theme.border}`,
  borderRadius: "30px",
  padding: "22px",
  boxShadow: "0 28px 90px rgba(0,0,0,0.48)",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  borderBottom: `1px solid ${theme.border}`,
  paddingBottom: "16px",
};

const modalTitleStyle: React.CSSProperties = {
  margin: 0,
  color: theme.primaryText,
  fontSize: "30px",
  fontWeight: 950,
};

const modalCloseButtonStyle: React.CSSProperties = {
  border: `1px solid ${theme.border}`,
  borderRadius: "16px",
  padding: "11px 14px",
  background: theme.secondaryCard,
  color: theme.secondaryText,
  fontWeight: 950,
  cursor: "pointer",
};

const editableItemsListStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "18px",
};

const editableItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr auto 1.4fr auto",
  gap: "12px",
  alignItems: "center",
  border: `1px solid ${theme.border}`,
  background: theme.secondaryCard,
  borderRadius: "22px",
  padding: "14px",
};

const quantityEditorStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const quantityButtonStyle: React.CSSProperties = {
  width: "38px",
  height: "38px",
  border: `1px solid ${theme.border}`,
  borderRadius: "14px",
  background: theme.card,
  color: theme.primaryText,
  fontWeight: 950,
  cursor: "pointer",
};

const quantityValueStyle: React.CSSProperties = {
  minWidth: "34px",
  textAlign: "center",
  color: theme.primaryText,
  fontSize: "18px",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "54px",
  border: `1px solid ${theme.border}`,
  borderRadius: "16px",
  background: theme.card,
  color: theme.primaryText,
  padding: "12px",
  outline: "none",
  fontWeight: 850,
  resize: "vertical",
};

const addProductBoxStyle: React.CSSProperties = {
  marginTop: "16px",
  border: `1px solid ${theme.border}`,
  background: theme.secondaryCard,
  borderRadius: "22px",
  padding: "14px",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${theme.border}`,
  borderRadius: "16px",
  background: theme.card,
  color: theme.primaryText,
  padding: "14px",
  outline: "none",
  fontWeight: 900,
};

const modalFooterStyle: React.CSSProperties = {
  marginTop: "16px",
  display: "grid",
  gap: "14px",
};
