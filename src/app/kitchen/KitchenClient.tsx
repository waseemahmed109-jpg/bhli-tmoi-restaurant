"use client";

import { useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function KitchenClient({ initialOrders }: { initialOrders: any[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const markCompleted = async (id: number) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== id));
        router.refresh();
      } else {
        alert("Failed to update order status");
      }
    } catch (e) {
      alert("Error updating order status");
    } finally {
      setProcessingId(null);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="kitchen-empty-state">
        <CheckCircle2 size={64} className="success-icon" />
        <h2>All caught up!</h2>
        <p>There are no open orders in the kitchen.</p>
      </div>
    );
  }

  return (
    <div className="ticket-rail">
      {orders.map((order) => {
        const timeDiff = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
        const isUrgent = timeDiff > 15; // 15 mins
        
        return (
          <div key={order.id} className={`ticket-card glass-panel ${isUrgent ? 'urgent' : ''}`}>
            <div className="ticket-header">
              <div className="ticket-id">#{order.id}</div>
              <div className="ticket-time">
                <Clock size={14} />
                <span>{timeDiff}m ago</span>
              </div>
            </div>
            
            <div className="ticket-meta">
              <span className="waiter-badge">{order.waiter.username}</span>
              <span className="time-exact" suppressHydrationWarning>
                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="ticket-items">
              {order.items.map((item: any) => (
                <div key={item.id} className="ticket-item">
                  <span className="item-qty">{item.quantity}x</span>
                  <span className="item-name">{item.name}</span>
                </div>
              ))}
            </div>

            <button 
              className="complete-btn" 
              onClick={() => markCompleted(order.id)}
              disabled={processingId === order.id}
            >
              {processingId === order.id ? "Processing..." : "Mark Ready"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
