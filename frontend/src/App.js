import { useState, useRef, useEffect } from "react";
import "./App.css";

const API_URL = "http://localhost:8000";

const USERS = {
  free_user: { label: "Free User", badge: "FREE", color: "#94a3b8" },
  premium_user: { label: "Premium User", badge: "PRO", color: "#f59e0b" },
};

export default function App() {
  const [userId, setUserId] = useState("free_user");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your AI assistant powered by Gemini. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState({ queries_used: 0, query_limit: 10, plan: "free" });
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  
  useEffect(() => {
    fetch(`${API_URL}/user/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setUsage({
          queries_used: data.queries_today,
          query_limit: data.query_limit,
          plan: data.plan,
        });
        setMessages([
          {
            role: "assistant",
            content: `Switched to ${USERS[userId].label} account. You have ${data.query_limit - data.queries_today} queries remaining today.`,
          },
        ]);
        setError("");
      })
      .catch(() => setError("Could not connect to backend. Is it running?"));
  }, [userId]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    setError("");

    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Build conversation history 
    const history = newMessages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      content: m.content,
    }));

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          message: input,
          conversation_history: history,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Something went wrong.");
        setLoading(false);
        return;
      }

      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      setUsage({
        queries_used: data.queries_used,
        query_limit: data.query_limit,
        plan: data.plan,
      });
    } catch {
      setError("Cannot reach the backend. Make sure it's running on port 8000.");
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Chat cleared! How can I help you?" }]);
    setError("");
  };

  const usagePct = Math.min((usage.queries_used / usage.query_limit) * 100, 100);
  const user = USERS[userId];

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="logo">
            <span className="logo-icon">✦</span>
            <span className="logo-text">GemChat</span>
          </div>
          <p className="logo-sub">AI Assistant SaaS</p>
        </div>

        {/* Account Switcher */}
        <div className="section-label">Account</div>
        <div className="account-switcher">
          {Object.entries(USERS).map(([id, info]) => (
            <button
              key={id}
              className={`account-btn ${userId === id ? "active" : ""}`}
              onClick={() => setUserId(id)}
            >
              <span className="account-name">{info.label}</span>
              <span className="badge" style={{ background: info.color }}>
                {info.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Usage */}
        <div className="section-label">Daily Usage</div>
        <div className="usage-card">
          <div className="usage-numbers">
            <span>{usage.queries_used}</span>
            <span className="usage-sep">/</span>
            <span>{usage.query_limit === 999999 ? "∞" : usage.query_limit}</span>
            <span className="usage-unit">queries</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${usage.query_limit === 999999 ? 10 : usagePct}%`,
                background: usagePct > 80 ? "#ef4444" : "#6366f1",
              }}
            />
          </div>
          <p className="usage-plan">
            Plan: <strong>{usage.plan === "premium" ? "⭐ Premium" : "Free"}</strong>
          </p>
          {usage.plan === "free" && (
            <button className="upgrade-btn" onClick={() => setUserId("premium_user")}>
              Upgrade to Premium →
            </button>
          )}
        </div>

        {/* Plans */}
        <div className="section-label">Plans</div>
        <div className="plans">
          <div className="plan-card">
            <div className="plan-name">Free</div>
            <div className="plan-price">$0<span>/mo</span></div>
            <div className="plan-feature">10 queries/day</div>
            <div className="plan-feature">Gemini Flash model</div>
          </div>
          <div className="plan-card plan-pro">
            <div className="plan-name">Premium ⭐</div>
            <div className="plan-price">$9<span>/mo</span></div>
            <div className="plan-feature">Unlimited queries</div>
            <div className="plan-feature">Priority access</div>
          </div>
        </div>

        <button className="clear-btn" onClick={clearChat}>
          🗑 Clear Chat
        </button>
      </aside>

      {/* Main Chat */}
      <main className="chat-area">
        <header className="chat-header">
          <div>
            <h1 className="chat-title">AI Chat</h1>
            <p className="chat-sub">Powered by Google Gemini</p>
          </div>
          <div className="header-badge" style={{ background: user.color }}>
            {user.badge}
          </div>
        </header>

        {/* Messages */}
        <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="msg-avatar">
                {msg.role === "assistant" ? "✦" : "U"}
              </div>
              <div className="msg-bubble">
                <p>{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="msg-avatar">✦</div>
              <div className="msg-bubble typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          {error && (
            <div className="error-banner">
              ⚠️ {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="input-area">
          <textarea
            className="chat-input"
            placeholder="Type your message... (Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            {loading ? "..." : "Send ↑"}
          </button>
        </div>
      </main>
    </div>
  );
}
