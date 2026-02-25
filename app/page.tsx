"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { quarterToYearQuarter } from "@/lib/sim/model";
import { supabaseBrowser } from "@/lib/supabase/client";
import { GameState, QuarterSnapshot } from "@/lib/types";

type DecisionForm = {
  price: number;
  new_engineers: number;
  new_sales_staff: number;
  salary_pct: number;
};

type SessionState = {
  accessToken: string;
  email: string;
};

const defaultDecision: DecisionForm = {
  price: 1000,
  new_engineers: 0,
  new_sales_staff: 0,
  salary_pct: 100
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value
  );
}

function quarterLabel(quarter: number): string {
  const { year, quarterInYear } = quarterToYearQuarter(quarter);
  return `Y${year} Q${quarterInYear}`;
}

function DeskSection({
  label,
  occupied,
  kind
}: {
  label: string;
  occupied: number;
  kind: "eng" | "sales";
}) {
  const capacity = Math.max(10, Math.ceil((occupied + 5) / 5) * 5);
  return (
    <div className="card">
      <h3>{label}</h3>
      <p className="muted">{occupied} seats used</p>
      <div className="desk-grid" style={{ marginTop: 10 }}>
        {Array.from({ length: capacity }).map((_, i) => (
          <div key={`${label}-${i}`} className={`desk ${i < occupied ? kind : ""}`} />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<SessionState | null>(null);
  const [status, setStatus] = useState("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<QuarterSnapshot[]>([]);
  const [decision, setDecision] = useState<DecisionForm>(defaultDecision);
  const [loading, setLoading] = useState(false);
  const [isFetchingState, setIsFetchingState] = useState(false);

  const supabaseMissing = !supabaseBrowser;

  useEffect(() => {
    if (!supabaseBrowser) return;
    supabaseBrowser.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      const currentEmail = data.session?.user?.email;
      if (token && currentEmail) {
        setSession({ accessToken: token, email: currentEmail });
      }
    });

    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange((_event, nextSession) => {
      const token = nextSession?.access_token;
      const currentEmail = nextSession?.user?.email;
      if (token && currentEmail) {
        setSession({ accessToken: token, email: currentEmail });
      } else {
        setSession(null);
        setGameState(null);
        setHistory([]);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.accessToken) return;
    void refreshState(session.accessToken);
  }, [session?.accessToken]);

  async function refreshState(token: string) {
    setIsFetchingState(true);
    try {
      const res = await fetch("/api/game-state", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Unable to load state.");
        return;
      }
      setStatus("");
      setGameState(data.gameState);
      setHistory(data.history);
    } catch {
      setStatus("Unable to load state. Check server logs and Supabase configuration.");
    } finally {
      setIsFetchingState(false);
    }
  }

  async function onAuthSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabaseBrowser) return;
    setStatus("");
    setLoading(true);
    const { error } =
      authMode === "login"
        ? await supabaseBrowser.auth.signInWithPassword({ email, password })
        : await supabaseBrowser.auth.signUp({ email, password });
    setLoading(false);
    setStatus(error ? error.message : authMode === "signup" ? "Account created. Check your email if confirmation is enabled." : "");
  }

  async function onAdvance() {
    if (!session) return;
    setStatus("");
    setLoading(true);
    const res = await fetch("/api/advance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify(decision)
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus(data.error ?? "Failed to advance.");
      return;
    }
    setGameState(data.gameState);
    setHistory(data.history);
  }

  async function onSignOut() {
    if (!supabaseBrowser) return;
    await supabaseBrowser.auth.signOut();
  }

  const latestQuarter = useMemo(() => {
    if (!gameState) return "";
    return quarterLabel(gameState.quarter);
  }, [gameState]);

  return (
    <main className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h1>Startup Simulation</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Single-player turn-based simulation. Each click advances one quarter.
        </p>
      </div>

      {supabaseMissing ? (
        <div className="card notice notice-danger">
          Supabase env vars are missing. Add values in `.env.local` from `.env.example`.
        </div>
      ) : null}

      {!session ? (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <button className={authMode === "login" ? "btn-primary" : "btn-secondary"} onClick={() => setAuthMode("login")}>
              Login
            </button>
            <button className={authMode === "signup" ? "btn-primary" : "btn-secondary"} onClick={() => setAuthMode("signup")}>
              Sign Up
            </button>
          </div>
          <form className="grid" onSubmit={onAuthSubmit}>
            <label>
              <p className="muted" style={{ marginBottom: 4 }}>
                Email
              </p>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              <p className="muted" style={{ marginBottom: 4 }}>
                Password
              </p>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </label>
            <button className="btn-primary" disabled={loading || supabaseMissing} type="submit">
              {loading ? "Please wait..." : authMode === "login" ? "Login" : "Create account"}
            </button>
          </form>
          {status ? <p style={{ marginTop: 10 }}>{status}</p> : null}
        </div>
      ) : (
        <>
          <div className="row">
            <div className="card" style={{ flex: 1 }}>
              <p className="muted">Signed in as</p>
              <p style={{ fontWeight: 700 }}>{session.email}</p>
            </div>
            <button className="btn-danger" onClick={onSignOut}>
              Sign out
            </button>
          </div>

          {gameState ? (
            <>
              {gameState.is_over ? (
                <div className={`card notice ${gameState.is_won ? "notice-win" : "notice-danger"}`}>
                  {gameState.is_won
                    ? `You won at ${latestQuarter}. Total revenue: ${currency(gameState.total_revenue)}`
                    : `Game over at ${latestQuarter}. Cash reached ${currency(gameState.cash)}.`}
                </div>
              ) : null}

              <div className="card grid">
                <h2>Quarterly Decision Panel ({latestQuarter})</h2>
                <div className="grid metrics">
                  <label>
                    <p className="muted">Unit price ($)</p>
                    <input
                      type="number"
                      min={1}
                      value={decision.price}
                      onChange={(e) => setDecision((d) => ({ ...d, price: Number(e.target.value) }))}
                    />
                  </label>
                  <label>
                    <p className="muted">New engineers</p>
                    <input
                      type="number"
                      min={0}
                      value={decision.new_engineers}
                      onChange={(e) => setDecision((d) => ({ ...d, new_engineers: Number(e.target.value) }))}
                    />
                  </label>
                  <label>
                    <p className="muted">New sales staff</p>
                    <input
                      type="number"
                      min={0}
                      value={decision.new_sales_staff}
                      onChange={(e) => setDecision((d) => ({ ...d, new_sales_staff: Number(e.target.value) }))}
                    />
                  </label>
                  <label>
                    <p className="muted">Salary % of industry</p>
                    <input
                      type="number"
                      min={50}
                      max={200}
                      value={decision.salary_pct}
                      onChange={(e) => setDecision((d) => ({ ...d, salary_pct: Number(e.target.value) }))}
                    />
                  </label>
                </div>
                <button className="btn-primary" onClick={onAdvance} disabled={loading || gameState.is_over}>
                  {loading ? "Advancing..." : "Advance Quarter"}
                </button>
                {status ? <p>{status}</p> : null}
              </div>

              <div className="grid metrics">
                <div className="card">
                  <p className="muted">Cash on hand</p>
                  <p className="metric-value">{currency(gameState.cash)}</p>
                </div>
                <div className="card">
                  <p className="muted">Revenue (last quarter)</p>
                  <p className="metric-value">{currency(gameState.last_revenue)}</p>
                </div>
                <div className="card">
                  <p className="muted">Net income (last quarter)</p>
                  <p className="metric-value">{currency(gameState.last_net_income)}</p>
                </div>
                <div className="card">
                  <p className="muted">Headcount</p>
                  <p className="metric-value">
                    {gameState.engineers + gameState.sales_staff} ({gameState.engineers} eng / {gameState.sales_staff} sales)
                  </p>
                </div>
              </div>

              <div className="card grid">
                <h2>Last 4 Quarters</h2>
                {history.map((h) => (
                  <div key={h.quarter} className="grid" style={{ gap: 4 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <p>
                        Y{h.year} Q{h.quarter_in_year}
                      </p>
                      <p className="muted">
                        Revenue {currency(h.revenue)} | Net {currency(h.net_income)}
                      </p>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${Math.min(100, Math.max(4, (h.cash / 3_000_000) * 100))}%` }} />
                    </div>
                    <p className="muted">Cash {currency(h.cash)}</p>
                  </div>
                ))}
              </div>

              <div className="card grid">
                <h2>Office Visualization</h2>
                <div className="office">
                  <DeskSection label="Engineering" occupied={gameState.engineers} kind="eng" />
                  <DeskSection label="Sales & Admin" occupied={gameState.sales_staff} kind="sales" />
                </div>
              </div>
            </>
          ) : (
            <div className="card grid" style={{ gap: 8 }}>
              <p>{isFetchingState ? "Loading game state..." : "Game state unavailable."}</p>
              {status ? <p className="notice notice-danger">{status}</p> : null}
              <p className="muted">
                Most common fix: run <code>supabase/schema.sql</code> in your Supabase SQL editor.
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
