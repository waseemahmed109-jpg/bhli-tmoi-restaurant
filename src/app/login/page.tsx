"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { KeyRound, User } from "lucide-react";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid username or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/images/logo.jpg" alt="TMOI Logo" className="login-logo" />
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Please sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <User className="input-icon" size={20} />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="login-input"
              autoComplete="username"
            />
          </div>
          
          <div className="input-group">
            <KeyRound className="input-icon" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-btn hover-lift" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          <p>TMOI Restaurant POS v2.0</p>
        </div>
      </div>
    </div>
  );
}
