"use client";

import { useState } from "react";
import { Plus, Minus, Trash2, Send } from "lucide-react";

type MenuItem = {
  id: number;
  name: string;
  category: string | null;
  rate: number;
};

type CartItem = MenuItem & {
  quantity: number;
};

export default function OrderPadClient({ 
  categories, 
  session 
}: { 
  categories: Record<string, MenuItem[]>,
  session: any
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(Object.keys(categories)[0] || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.rate * item.quantity), 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    
    // Will implement API call later
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      });
      
      if (res.ok) {
        setCart([]);
        alert("Order placed successfully!");
      } else {
        alert("Failed to place order.");
      }
    } catch (e) {
      alert("Error placing order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="order-pad-layout">
      {/* Menu Section */}
      <div className="menu-section glass-panel">
        <div className="category-tabs">
          {Object.keys(categories).map(cat => (
            <button 
              key={cat} 
              className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className="menu-items-grid">
          {categories[activeCategory]?.map(item => (
            <button 
              key={item.id} 
              className="menu-item-btn hover-lift"
              onClick={() => addToCart(item)}
            >
              <span className="item-name">{item.name}</span>
              <span className="item-price">₹{item.rate.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="cart-section glass-panel">
        <div className="cart-header">
          <h2>Current Order</h2>
          <span className="cart-waiter">{session.user.name}</span>
        </div>
        
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">Select items to start order</div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-price">₹{(item.rate * item.quantity).toFixed(2)}</span>
                </div>
                <div className="cart-item-controls">
                  <button onClick={() => updateQuantity(item.id, -1)} className="qty-btn"><Minus size={16} /></button>
                  <span className="qty-val">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="qty-btn"><Plus size={16} /></button>
                  <button onClick={() => removeFromCart(item.id)} className="remove-btn"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-total">
            <span>Total:</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
          <button 
            className="submit-order-btn hover-lift" 
            disabled={cart.length === 0 || isSubmitting}
            onClick={submitOrder}
          >
            {isSubmitting ? "Sending..." : "Send to Kitchen"}
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
