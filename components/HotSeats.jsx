"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  loginEmployeeWithPassword, registerEmployee, getEmployees,
  getCallLogs, upsertCallLog, updateCallNote, updateCallRevenue,
  getPhoneCache, cachePhone, getReminders, addReminder,
  getEmployeeStats, saveEvents, getSavedEvents, getEmployeeProfile
} from "../lib/db";

/* ── timezone helpers ── */
const TZ_MAP = { E: "America/New_York", C: "America/Chicago", M: "America/Denver", P: "America/Los_Angeles" };
function getTZ(addr) {
  if (!addr) return "E";
  const a = addr.toLowerCase();
  if (/\b(ca|wa|or|nv|az)\b/.test(a) || /los angeles|san francisco|seattle|portland|vegas|phoenix/.test(a)) return "P";
  if (/\b(co|mt|ut|nm|wy)\b/.test(a) || /denver|salt lake/.test(a)) return "M";
  if (/\b(il|tx|mn|mo|wi|tn|la|ok|ks|ne|ia|ms|ar|al)\b/.test(a) || /chicago|dallas|houston|nashville|austin|memphis/.test(a)) return "C";
  return "E";
}
function getLocalTime(dateStr, timeStr, addr) {
  try {
    const tz = TZ_MAP[getTZ(addr)];
    const d = new Date(dateStr + " " + timeStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }) + " (" + getTZ(addr) + ")";
  } catch { return timeStr; }
}
function getCallBadge(status) {
  const m = { NOT_CALLED: "🔵", HIT: "🟢", NO: "🔴", FOLLOW_UP: "🟡", SOLD_OUT: "⚫", DIDNT_ANSWER: "🟠", CALLING: "📞", DISS: "💀" };
  return m[status] || "🔵";
}

/* ── status config ── */
const STATUSES = [
  { key: "NOT_CALLED", label: "Not Called", color: "#3b82f6" },
  { key: "HIT", label: "Hit! ✅", color: "#22c55e" },
  { key: "NO", label: "No", color: "#ef4444" },
  { key: "FOLLOW_UP", label: "Follow Up", color: "#eab308" },
  { key: "SOLD_OUT", label: "Sold Out", color: "#6b7280" },
  { key: "DIDNT_ANSWER", label: "Didn't Answer", color: "#f97316" },
  { key: "CALLING", label: "Calling...", color: "#8b5cf6" },
  { key: "DISS", label: "Disconnected", color: "#374151" }
];
const DEAD = ["NO", "SOLD_OUT", "DISS"];

/* ── category config ── */
const CAT_CONFIG = {
  Sports: { sg: "sports", tm: "KZFzniwnSyZfZ7v7nE" },
  Concerts: { sg: "concert", tm: "KZFzniwnSyZfZ7v7nJ" },
  Theatre: { sg: "theater", tm: "KZFzniwnSyZfZ7v7na" },
  Family: { sg: "family", tm: "KZFzniwnSyZfZ7v7n1" },
  Festivals: { sg: "festival", tm: "" },
  Comedy: { sg: "comedy", tm: "" }
};
const TABS = Object.keys(CAT_CONFIG);

const TOP_CITIES = [
  "New York", "Los Angeles", "Chicago", "Houston", "Dallas", "Atlanta",
  "Miami", "Phoenix", "Denver", "Seattle", "Boston", "Nashville",
  "Las Vegas", "San Francisco", "Philadelphia", "Charlotte", "Tampa",
  "Minneapolis", "Detroit", "San Diego"
];

/* ── demo events ── */
const DE = {
  Sports: [
    { id: "demo-s1", name: "Lakers vs Celtics", date: "2026-04-01", dd: "Wed", time: "7:30 PM", venue: "Crypto.com Arena", addr: "1111 S Figueroa St, Los Angeles, CA", cat: "Sports", subcat: "NBA", popularity: 95, source: "demo" },
    { id: "demo-s2", name: "Yankees vs Red Sox", date: "2026-04-05", dd: "Sun", time: "1:05 PM", venue: "Yankee Stadium", addr: "1 E 161st St, Bronx, NY", cat: "Sports", subcat: "MLB", popularity: 90, source: "demo" }
  ],
  Concerts: [
    { id: "demo-c1", name: "Taylor Swift - Eras Tour", date: "2026-05-15", dd: "Fri", time: "7:00 PM", venue: "SoFi Stadium", addr: "1001 Stadium Dr, Inglewood, CA", cat: "Concerts", subcat: "Pop", popularity: 99, source: "demo" },
    { id: "demo-c2", name: "Morgan Wallen", date: "2026-04-20", dd: "Sat", time: "8:00 PM", venue: "Nissan Stadium", addr: "1 Titans Way, Nashville, TN", cat: "Concerts", subcat: "Country", popularity: 92, source: "demo" }
  ],
  Theatre: [
    { id: "demo-t1", name: "Hamilton", date: "2026-04-10", dd: "Thu", time: "7:00 PM", venue: "Richard Rodgers Theatre", addr: "226 W 46th St, New York, NY", cat: "Theatre", subcat: "Musical", popularity: 97, source: "demo" }
  ]
};
const ALL_DEMO = [...(DE.Sports || []), ...(DE.Concerts || []), ...(DE.Theatre || [])];

/* ── phone lookup helper ── */
async function gLookup(venue, city) {
  try {
    const res = await fetch(`/api/phone-lookup?venue=${encodeURIComponent(venue)}&city=${encodeURIComponent(city || "")}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/* ── alerts generator ── */
function generateAlerts(events, callLogs) {
  const alerts = [];
  const now = new Date();
  (events || []).forEach(ev => {
    const log = callLogs[ev.id];
    if (!log || log.status === "NOT_CALLED") {
      try {
        const evDate = new Date(ev.date);
        const diff = (evDate - now) / (1000 * 60 * 60 * 24);
        if (diff > 0 && diff <= 3) alerts.push({ type: "urgent", msg: `🔥 "${ev.name}" is in ${Math.ceil(diff)} day(s) - not called yet!`, id: ev.id });
        else if (diff > 3 && diff <= 7) alerts.push({ type: "warning", msg: `⏰ "${ev.name}" is coming up (${ev.date}) - needs a call`, id: ev.id });
      } catch {}
    }
    if (log?.status === "FOLLOW_UP") {
      alerts.push({ type: "followup", msg: `🟡 Follow up needed: "${ev.name}"`, id: ev.id });
    }
  });
  return alerts.slice(0, 10);
}

/* ── grouping helpers ── */
function groupEvents(events) {
  const g = {};
  events.forEach(ev => {
    const d = ev.date || "Unknown";
    if (!g[d]) g[d] = [];
    g[d].push(ev);
  });
  return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
}
function groupByMonth(events) {
  const g = {};
  events.forEach(ev => {
    try {
      const d = new Date(ev.date);
      const k = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      if (!g[k]) g[k] = [];
      g[k].push(ev);
    } catch {}
  });
  return Object.entries(g);
}

/* ── CSV export ── */
function exportCSV(events, callLogs) {
  const rows = [["Event", "Date", "Venue", "Status", "Phone", "Note", "Revenue", "Tickets"]];
  events.forEach(ev => {
    const log = callLogs[ev.id] || {};
    rows.push([ev.name, ev.date, ev.venue, log.status || "NOT_CALLED", ev.ph || "", log.note || "", log.revenue_amount || 0, log.revenue_tickets || 0]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "hot-seats-export.csv"; a.click();
}

/* ── SVG Icons ── */
function PhoneIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>; }
function CopyIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>; }
function CheckIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>; }
function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function UserIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function LogoutIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }

/* ── Calendar mini component ── */
function Cal({ events, onDateClick }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventDates = new Set(events.map(e => e.date));
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div style={{ background: "#1a1a2e", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }} style={calBtn}>◀</button>
        <span style={{ color: "#fff", fontWeight: 700 }}>{new Date(year, month).toLocaleString("en-US", { month: "long", year: "numeric" })}</span>
        <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }} style={calBtn}>▶</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center" }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} style={{ color: "#888", fontSize: 11, padding: 4 }}>{d}</div>)}
        {days.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const hasEv = eventDates.has(ds);
          const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
          return (
            <div key={i} onClick={() => hasEv && onDateClick?.(ds)}
              style={{ padding: 6, borderRadius: 6, fontSize: 12, cursor: hasEv ? "pointer" : "default",
                background: isToday ? "#ff6b35" : hasEv ? "#2a2a4a" : "transparent",
                color: hasEv ? "#ff6b35" : isToday ? "#fff" : "#ccc", fontWeight: hasEv || isToday ? 700 : 400,
                border: hasEv ? "1px solid #ff6b35" : "1px solid transparent" }}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}
const calBtn = { background: "none", border: "none", color: "#ff6b35", fontSize: 18, cursor: "pointer" };

/* ── Event Card component ── */
function EC({ ev, log, onStatus, onNote, onPhone, onRevenue, phoneLoading }) {
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(log?.note || "");
  const [showRev, setShowRev] = useState(false);
  const [revAmt, setRevAmt] = useState(log?.revenue_amount || "");
  const [revTix, setRevTix] = useState(log?.revenue_tickets || "");
  const [copied, setCopied] = useState("");
  const isDead = DEAD.includes(log?.status);

  const copyPhone = (phone, label) => {
    navigator.clipboard.writeText(phone);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div style={{ background: isDead ? "#1a1a1a" : "#1e1e3a", borderRadius: 12, padding: 16, marginBottom: 12, borderLeft: `4px solid ${STATUSES.find(s => s.key === (log?.status || "NOT_CALLED"))?.color || "#3b82f6"}`, opacity: isDead ? 0.5 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{getCallBadge(log?.status || "NOT_CALLED")} {ev.name}</div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>{ev.cat}{ev.subcat ? ` / ${ev.subcat}` : ""}</div>
        </div>
        {ev.popularity > 0 && <div style={{ background: "#ff6b35", color: "#fff", borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>🔥 {ev.popularity}</div>}
      </div>

      <div style={{ fontSize: 13, color: "#ccc", marginBottom: 8 }}>
        <div>📅 {ev.dd ? `${ev.dd}, ` : ""}{ev.date}</div>
        {ev.time && <div>⏰ {ev.addr ? getLocalTime(ev.date, ev.time, ev.addr) : ev.time}</div>}
        <div>📍 {ev.venue}{ev.addr ? ` — ${ev.addr}` : ""}</div>
      </div>

      {/* Phone numbers */}
      <div style={{ marginBottom: 8 }}>
        {ev.ph ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <a href={`tel:${ev.ph}`} style={{ color: "#4ade80", textDecoration: "none", fontSize: 14 }}>
              📞 Box Office: {ev.ph}
            </a>
            <span style={{ fontSize: 10, color: "#22c55e" }}>✓ Google</span>
            <button onClick={() => copyPhone(ev.ph, "box")} style={copyBtnStyle}>
              {copied === "box" ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        ) : (
          <button onClick={() => onPhone(ev)} disabled={phoneLoading}
            style={{ background: "#2a2a4a", border: "1px solid #444", borderRadius: 8, color: "#ff6b35", padding: "6px 12px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <PhoneIcon /> {phoneLoading ? "Looking up..." : "Find Phone Numbers"}
          </button>
        )}
        {ev.alt && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href={`tel:${ev.alt}`} style={{ color: "#60a5fa", textDecoration: "none", fontSize: 14 }}>
              📞 {ev.altL || "Venue Main Line"}: {ev.alt}
            </a>
            <button onClick={() => copyPhone(ev.alt, "alt")} style={copyBtnStyle}>
              {copied === "alt" ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        )}
      </div>

      {/* Status buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => onStatus(ev, s.key)}
            style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: (log?.status || "NOT_CALLED") === s.key ? `2px solid ${s.color}` : "1px solid #444", background: (log?.status || "NOT_CALLED") === s.key ? s.color + "33" : "#2a2a4a", color: (log?.status || "NOT_CALLED") === s.key ? s.color : "#999" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Note & Revenue toggles */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setShowNotes(!showNotes)} style={toggleBtn}>📝 {log?.note ? "View Note" : "Add Note"}</button>
        <button onClick={() => setShowRev(!showRev)} style={toggleBtn}>💰 Revenue</button>
      </div>

      {showNotes && (
        <div style={{ marginTop: 8 }}>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add notes about this call..."
            style={{ width: "100%", background: "#0d0d1a", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: 8, fontSize: 13, minHeight: 60, resize: "vertical" }} />
          <button onClick={() => { onNote(ev, noteText); setShowNotes(false); }}
            style={{ marginTop: 4, padding: "6px 16px", background: "#ff6b35", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save Note</button>
          {log?.note && <div style={{ marginTop: 4, fontSize: 12, color: "#aaa" }}>📝 {log.note} {log.note_by ? `— ${log.note_by}` : ""}</div>}
        </div>
      )}

      {showRev && (
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" placeholder="$ Amount" value={revAmt} onChange={e => setRevAmt(e.target.value)}
            style={inputStyle} />
          <input type="number" placeholder="# Tickets" value={revTix} onChange={e => setRevTix(e.target.value)}
            style={inputStyle} />
          <button onClick={() => { onRevenue(ev, revAmt, revTix); setShowRev(false); }}
            style={{ padding: "6px 16px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save</button>
        </div>
      )}

      {(log?.revenue_amount > 0 || log?.revenue_tickets > 0) && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#4ade80" }}>💰 ${Number(log.revenue_amount).toLocaleString()} | 🎫 {log.revenue_tickets} tickets</div>
      )}
    </div>
  );
}

const copyBtnStyle = { background: "none", border: "none", cursor: "pointer", color: "#888", padding: 2 };
const toggleBtn = { padding: "4px 10px", background: "#2a2a4a", border: "1px solid #444", borderRadius: 8, color: "#ccc", fontSize: 12, cursor: "pointer" };
const inputStyle = { width: 100, background: "#0d0d1a", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "6px 8px", fontSize: 13 };

/* ── API fetch functions ── */
async function fetchSeatGeek(cat, city, page = 1) {
  try {
    const res = await fetch(`/api/seatgeek?type=${cat}&city=${encodeURIComponent(city || "")}&page=${page}`);
        const data = await res.json();
    if (!res.ok) return [];
        return (data.events || []).map(e => ({ ...e, cat: e.cat || cat, source: e.source || "seatgeek" }));
  } catch { return []; }
}

async function fetchTicketmaster(tmId, city, page = 0) {
  if (!tmId) return [];
  try {
    const res = await fetch(`/api/ticketmaster?classificationId=${tmId}&city=${encodeURIComponent(city || "")}&page=${page}`);
        const data = await res.json();
    if (!res.ok) return [];
        return (data.events || []).map(e => ({ ...e, source: e.source || "ticketmaster" }));
  } catch { return []; }
}

async function fetchAllSources(cat, city) {
  const cfg = CAT_CONFIG[cat];
  if (!cfg) return [];
  const [sg, tm] = await Promise.all([
    fetchSeatGeek(cfg.sg, city),
    fetchTicketmaster(cfg.tm, city)
  ]);
  // dedupe by name+date
  const seen = new Set();
  const all = [];
  [...sg, ...tm].forEach(ev => {
    const key = (ev.name + "|" + ev.date).toLowerCase();
    if (!seen.has(key)) { seen.add(key); all.push({ ...ev, cat }); }
  });
  return all.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}


/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function HotSeats() {
  // Auth state
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [authName, setAuthName] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [splash, setSplash] = useState(true);

  // App state
  const [view, setView] = useState("home"); // home | profile | leaderboard
  const [tab, setTab] = useState("Sports");
  const [subView, setSubView] = useState("list"); // list | calendar | cities | monthly
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  // Data state
  const [events, setEvents] = useState([]);
  const [callLogs, setCallLogs] = useState({});
  const [phoneCache, setPhoneCache] = useState({});
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({});
  const [profile, setProfile] = useState(null);
  const [savedEvents, setSavedEvents] = useState([]);

  // Loading
  const [loading, setLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState("");
  const [loadedCats, setLoadedCats] = useState({});
  const eventsRef = useRef([]);

  // Splash timer
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // Check stored session
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hs_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.id && u?.name) { setUser(u); setSplash(false); }
      }
    } catch {}
  }, []);

  // Load data when user logs in
  useEffect(() => {
    if (!user) return;
    localStorage.setItem("hs_user", JSON.stringify(user));
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const [logs, phones, emps, st] = await Promise.all([
        getCallLogs(), getPhoneCache(), getEmployees(), getEmployeeStats()
      ]);
      setCallLogs(logs || {});
      setPhoneCache(phones || {});
      setEmployees(emps || []);
      setStats(st || {});

      // Load saved events for this user
      if (user?.id) {
        const saved = await getSavedEvents(user.id);
        if (saved?.length) {
          setSavedEvents(saved);
          // Merge saved event phone data
          const merged = saved.map(ev => {
            const vk = (ev.venue || "").toLowerCase().trim();
            const cached = phones[vk];
            return { ...ev, ph: ev.ph || cached?.phone || "", alt: ev.alt || cached?.alt_phone || "", altL: ev.altL || cached?.alt_phone_label || "" };
          });
          setEvents(prev => {
            const existing = new Set(prev.map(e => e.id));
            const newOnes = merged.filter(e => !existing.has(e.id));
            return [...prev, ...newOnes];
          });
        }
      }
    } catch (err) { console.error("Load data error:", err); }
  }

  // Login handler
  async function handleLogin() {
    if (!authName.trim() || !authPass.trim()) { setAuthError("Enter name and password"); return; }
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await loginEmployeeWithPassword(authName.trim(), authPass.trim());
      if (result?.error) { setAuthError(result.error); }
      else if (result?.employee) { setUser(result.employee); }
      else { setAuthError("Login failed"); }
    } catch (err) { setAuthError("Connection error"); }
    setAuthLoading(false);
  }

  // Register handler
  async function handleRegister() {
    if (!authName.trim() || !authPass.trim()) { setAuthError("Enter name and password"); return; }
    if (authPass.length < 4) { setAuthError("Password must be at least 4 characters"); return; }
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await registerEmployee(authName.trim(), authPass.trim(), authEmail.trim());
      if (result?.error) { setAuthError(result.error); }
      else if (result?.employee) { setUser(result.employee); }
      else { setAuthError("Registration failed"); }
    } catch (err) { setAuthError("Connection error"); }
    setAuthLoading(false);
  }

  // Logout
  function handleLogout() {
    setUser(null);
    setEvents([]);
    setCallLogs({});
    setProfile(null);
    setSavedEvents([]);
    setLoadedCats({});
    localStorage.removeItem("hs_user");
    setAuthName("");
    setAuthPass("");
    setAuthEmail("");
    setAuthError("");
  }

  // Load category events
  async function loadCategory(cat, city) {
    const key = cat + "|" + (city || "all");
    if (loadedCats[key]) return;
    setLoading(true);
    try {
      const fetched = await fetchAllSources(cat, city);
      // Merge with phone cache
      const withPhones = fetched.map(ev => {
        const vk = (ev.venue || "").toLowerCase().trim();
        const cached = phoneCache[vk];
        return { ...ev, ph: cached?.phone || "", alt: cached?.alt_phone || "", altL: cached?.alt_phone_label || "" };
      });
      setEvents(prev => {
        const existing = new Set(prev.map(e => e.id));
        const newOnes = withPhones.filter(e => !existing.has(e.id));
        const merged = [...prev, ...newOnes];
        eventsRef.current = merged;
        return merged;
      });
      setLoadedCats(prev => ({ ...prev, [key]: true }));

      // Save events to DB
      if (user?.id && withPhones.length) {
        saveEvents(withPhones, user.id, user.name).catch(console.error);
      }
    } catch (err) { console.error("Load category error:", err); }
    setLoading(false);
  }

  // Auto-load current tab
  useEffect(() => {
    if (user && view === "home") {
      loadCategory(tab, cityFilter);
    }
  }, [tab, user, view, cityFilter]);

  // Status update
  async function doStatus(ev, status) {
    setCallLogs(prev => ({ ...prev, [ev.id]: { ...prev[ev.id], status, employee: user?.name, employee_id: user?.id, timestamp: new Date().toISOString() } }));
    await upsertCallLog(ev.id, ev.name, ev.venue, status, user?.id, user?.name, "", "", 0, 0);
  }

  // Note update
  async function doNote(ev, note) {
    setCallLogs(prev => ({ ...prev, [ev.id]: { ...prev[ev.id], note, note_by: user?.name } }));
    await updateCallNote(ev.id, note, user?.name);
  }

  // Phone lookup
  async function doPhone(ev) {
    setPhoneLoading(ev.id);
    const vk = (ev.venue || "").toLowerCase().trim();
    const city = ev.addr ? ev.addr.split(",").slice(-2, -1)[0]?.trim() : "";
    const result = await gLookup(ev.venue, city);
    if (result) {
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, ph: result.phone || "", alt: result.alt_phone || "", altL: result.alt_phone_label || "" } : e));
      setPhoneCache(prev => ({ ...prev, [vk]: { phone: result.phone, alt_phone: result.alt_phone, alt_phone_label: result.alt_phone_label, name: result.name } }));
      await cachePhone(vk, result, ev.venue);
    }
    setPhoneLoading("");
  }

  // Revenue update
  async function doRevenue(ev, amt, tix) {
    const a = Number(amt) || 0;
    const t = Number(tix) || 0;
    setCallLogs(prev => ({ ...prev, [ev.id]: { ...prev[ev.id], revenue_amount: a, revenue_tickets: t } }));
    await updateCallRevenue(ev.id, a, t);
  }

  // Load profile
  async function loadProfile() {
    if (!user?.id) return;
    setView("profile");
    try {
      const p = await getEmployeeProfile(user.id);
      setProfile(p);
    } catch (err) { console.error("Profile error:", err); }
  }

  // Filter events
  function getFilteredEvents() {
    let filtered = events.filter(ev => {
      if (view === "home" && tab !== "All" && ev.cat && ev.cat !== tab) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(ev.name || "").toLowerCase().includes(s) && !(ev.venue || "").toLowerCase().includes(s) && !(ev.addr || "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
    return filtered;
  }

  // Compute stats for stats bar
  const myStats = stats[user?.name] || { calls: 0, hits: 0, revenue: 0, tickets: 0 };
  const hitRate = myStats.calls > 0 ? Math.round(myStats.hits / myStats.calls * 100) : 0;
  const alerts = generateAlerts(events, callLogs);
  const filtered = getFilteredEvents();

  /* ── SPLASH SCREEN ── */
  if (splash) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔥</div>
        <h1 style={{ color: "#ff6b35", fontSize: 36, fontWeight: 800, margin: 0 }}>HOT SEATS</h1>
        <p style={{ color: "#888", fontSize: 14, marginTop: 8 }}>Ticket Intelligence Platform</p>
      </div>
    );
  }

  /* ── LOGIN / REGISTER ── */
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#1e1e3a", borderRadius: 16, padding: 32, width: 360, maxWidth: "90vw" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 48 }}>🔥</div>
            <h1 style={{ color: "#ff6b35", fontSize: 28, fontWeight: 800, margin: "8px 0 4px" }}>HOT SEATS</h1>
            <p style={{ color: "#888", fontSize: 13, margin: 0 }}>{authMode === "login" ? "Sign in to your account" : "Create a new account"}</p>
          </div>

          <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
            <button onClick={() => { setAuthMode("login"); setAuthError(""); }} style={{ flex: 1, padding: "10px 0", background: authMode === "login" ? "#ff6b35" : "#2a2a4a", color: authMode === "login" ? "#fff" : "#888", border: "none", borderRadius: "8px 0 0 8px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Sign In</button>
            <button onClick={() => { setAuthMode("register"); setAuthError(""); }} style={{ flex: 1, padding: "10px 0", background: authMode === "register" ? "#ff6b35" : "#2a2a4a", color: authMode === "register" ? "#fff" : "#888", border: "none", borderRadius: "0 8px 8px 0", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Register</button>
          </div>

          <input type="text" placeholder="Your name" value={authName} onChange={e => setAuthName(e.target.value)}
            style={authInput} onKeyDown={e => e.key === "Enter" && (authMode === "login" ? handleLogin() : handleRegister())} />

          {authMode === "register" && (
            <input type="email" placeholder="Email (optional)" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
              style={authInput} />
          )}

          <input type="password" placeholder="Password" value={authPass} onChange={e => setAuthPass(e.target.value)}
            style={authInput} onKeyDown={e => e.key === "Enter" && (authMode === "login" ? handleLogin() : handleRegister())} />

          {authError && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{authError}</div>}

          <button onClick={authMode === "login" ? handleLogin : handleRegister} disabled={authLoading}
            style={{ width: "100%", padding: "12px 0", background: authLoading ? "#666" : "#ff6b35", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 16 }}>
            {authLoading ? "..." : authMode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    );
  }

  /* ── PROFILE VIEW ── */
  if (view === "profile") {
    return (
      <div style={appContainer}>
        {/* Header */}
        <div style={headerStyle}>
          <button onClick={() => setView("home")} style={backBtn}>← Back</button>
          <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>My Profile</h2>
          <button onClick={handleLogout} style={backBtn}><LogoutIcon /> Logout</button>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: 36, background: "#ff6b35", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 28, color: "#fff", fontWeight: 800 }}>
              {(user.name || "?")[0].toUpperCase()}
            </div>
            <h3 style={{ color: "#fff", margin: "0 0 4px" }}>{user.name}</h3>
            {user.email && <p style={{ color: "#888", fontSize: 13, margin: 0 }}>{user.email}</p>}
          </div>

          {/* Stats cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Calls", value: profile?.stats?.calls || myStats.calls || 0, icon: "📞" },
              { label: "Hits", value: profile?.stats?.hits || myStats.hits || 0, icon: "✅" },
              { label: "Hit Rate", value: (profile?.stats?.rate || hitRate) + "%", icon: "📊" },
              { label: "Revenue", value: "$" + Number(profile?.stats?.revenue || myStats.revenue || 0).toLocaleString(), icon: "💰" },
              { label: "Tickets Sold", value: profile?.stats?.tickets || myStats.tickets || 0, icon: "🎫" },
              { label: "Saved Events", value: profile?.savedEvents || savedEvents.length || 0, icon: "📋" }
            ].map(s => (
              <div key={s.label} style={{ background: "#1e1e3a", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 24 }}>{s.icon}</div>
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "4px 0" }}>{s.value}</div>
                <div style={{ color: "#888", fontSize: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent call history */}
          <h4 style={{ color: "#ff6b35", margin: "16px 0 8px" }}>Recent Call History</h4>
          {(profile?.callHistory || []).slice(0, 20).map((c, i) => (
            <div key={i} style={{ background: "#1a1a2e", borderRadius: 8, padding: 10, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{getCallBadge(c.status)} {c.eventName || c.eventId}</div>
                <div style={{ color: "#888", fontSize: 11 }}>{c.venue} • {new Date(c.timestamp).toLocaleDateString()}</div>
              </div>
              {c.revenue > 0 && <div style={{ color: "#4ade80", fontSize: 12, fontWeight: 700 }}>${Number(c.revenue).toLocaleString()}</div>}
            </div>
          ))}
          {(!profile?.callHistory || profile.callHistory.length === 0) && (
            <div style={{ color: "#666", fontSize: 13, textAlign: "center", padding: 20 }}>No call history yet. Start making calls!</div>
          )}
        </div>
      </div>
    );
  }

  /* ── LEADERBOARD VIEW ── */
  if (view === "leaderboard") {
    const sorted = Object.entries(stats).sort((a, b) => (b[1].revenue || 0) - (a[1].revenue || 0));
    return (
      <div style={appContainer}>
        <div style={headerStyle}>
          <button onClick={() => setView("home")} style={backBtn}>← Back</button>
          <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>🏆 Leaderboard</h2>
          <div style={{ width: 60 }} />
        </div>
        <div style={{ padding: 16 }}>
          {sorted.map(([name, s], i) => (
            <div key={name} style={{ background: i === 0 ? "#2a2a1a" : "#1e1e3a", borderRadius: 12, padding: 14, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: i < 3 ? `4px solid ${["#ffd700", "#c0c0c0", "#cd7f32"][i]}` : "4px solid #333" }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`} {name}</div>
                <div style={{ color: "#888", fontSize: 12 }}>{s.calls} calls • {s.hits} hits • {s.calls > 0 ? Math.round(s.hits / s.calls * 100) : 0}% rate</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 16 }}>${Number(s.revenue || 0).toLocaleString()}</div>
                <div style={{ color: "#888", fontSize: 11 }}>{s.tickets || 0} tickets</div>
              </div>
            </div>
          ))}
          {sorted.length === 0 && <div style={{ color: "#666", textAlign: "center", padding: 30 }}>No stats yet</div>}
        </div>
      </div>
    );
  }

  /* ── MAIN APP VIEW ── */
  return (
    <div style={appContainer}>
      {/* Nav header */}
      <div style={{ background: "#0d0d1a", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #222", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🔥</span>
          <span style={{ color: "#ff6b35", fontWeight: 800, fontSize: 18 }}>HOT SEATS</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadProfile} style={navIconBtn} title="Profile"><UserIcon /></button>
          <button onClick={() => setView("leaderboard")} style={navIconBtn} title="Leaderboard">🏆</button>
          <button onClick={() => exportCSV(filtered, callLogs)} style={navIconBtn} title="Export">📊</button>
          <button onClick={handleLogout} style={navIconBtn} title="Logout"><LogoutIcon /></button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ background: "#1a1a2e", padding: "8px 16px", display: "flex", justifyContent: "space-around", borderBottom: "1px solid #222" }}>
        <div style={{ textAlign: "center" }}><div style={{ color: "#3b82f6", fontWeight: 800, fontSize: 18 }}>{myStats.calls}</div><div style={{ color: "#888", fontSize: 10 }}>Calls</div></div>
        <div style={{ textAlign: "center" }}><div style={{ color: "#22c55e", fontWeight: 800, fontSize: 18 }}>{myStats.hits}</div><div style={{ color: "#888", fontSize: 10 }}>Hits</div></div>
        <div style={{ textAlign: "center" }}><div style={{ color: "#eab308", fontWeight: 800, fontSize: 18 }}>{hitRate}%</div><div style={{ color: "#888", fontSize: 10 }}>Rate</div></div>
        <div style={{ textAlign: "center" }}><div style={{ color: "#4ade80", fontWeight: 800, fontSize: 18 }}>${Number(myStats.revenue || 0).toLocaleString()}</div><div style={{ color: "#888", fontSize: 10 }}>Revenue</div></div>
        <div style={{ textAlign: "center" }}><div style={{ color: "#f97316", fontWeight: 800, fontSize: 18 }}>{myStats.tickets || 0}</div><div style={{ color: "#888", fontSize: 10 }}>Tickets</div></div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 16px", position: "relative" }}>
        <div style={{ position: "absolute", left: 28, top: 24, color: "#666" }}><SearchIcon /></div>
        <input type="text" placeholder="Search events, venues..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 12px 10px 40px", background: "#1e1e3a", border: "1px solid #333", borderRadius: 10, color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ padding: "0 16px 8px" }}>
          {alerts.slice(0, 3).map((a, i) => (
            <div key={i} style={{ background: a.type === "urgent" ? "#3b1111" : a.type === "followup" ? "#3b3b11" : "#1e1e3a", borderRadius: 8, padding: "8px 12px", marginBottom: 4, fontSize: 12, color: a.type === "urgent" ? "#fca5a5" : a.type === "followup" ? "#fde047" : "#ccc" }}>
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", overflowX: "auto", padding: "0 12px 8px", gap: 6, scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setSubView("list"); }}
            style={{ padding: "8px 16px", borderRadius: 20, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
              background: tab === t ? "#ff6b35" : "#2a2a4a", color: tab === t ? "#fff" : "#999" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Sub-view toggles */}
      <div style={{ display: "flex", gap: 4, padding: "0 16px 8px" }}>
        {[
          { key: "list", label: "📋 List" },
          { key: "calendar", label: "📅 Calendar" },
          { key: "cities", label: "🏙️ Cities" },
          { key: "monthly", label: "📆 Monthly" }
        ].map(sv => (
          <button key={sv.key} onClick={() => setSubView(sv.key)}
            style={{ padding: "6px 12px", borderRadius: 8, border: "none", fontSize: 12, cursor: "pointer",
              background: subView === sv.key ? "#ff6b35" : "#1e1e3a", color: subView === sv.key ? "#fff" : "#888" }}>
            {sv.label}
          </button>
        ))}
      </div>

      {/* City filter for Cities sub-view */}
      {subView === "cities" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 16px 12px" }}>
          <button onClick={() => setCityFilter("")} style={{ ...cityBtn, background: !cityFilter ? "#ff6b35" : "#2a2a4a", color: !cityFilter ? "#fff" : "#999" }}>All</button>
          {TOP_CITIES.map(c => (
            <button key={c} onClick={() => setCityFilter(c)} style={{ ...cityBtn, background: cityFilter === c ? "#ff6b35" : "#2a2a4a", color: cityFilter === c ? "#fff" : "#999" }}>{c}</button>
          ))}
        </div>
      )}

      {/* Calendar sub-view */}
      {subView === "calendar" && <div style={{ padding: "0 16px" }}><Cal events={filtered} onDateClick={d => { setSearch(d); setSubView("list"); }} /></div>}

      {/* Monthly sub-view */}
      {subView === "monthly" && (
        <div style={{ padding: "0 16px" }}>
          {groupByMonth(filtered).map(([month, evs]) => (
            <div key={month}>
              <h3 style={{ color: "#ff6b35", fontSize: 16, margin: "12px 0 8px", borderBottom: "1px solid #333", paddingBottom: 4 }}>{month} ({evs.length})</h3>
              {evs.slice(0, 10).map(ev => (
                <EC key={ev.id} ev={ev} log={callLogs[ev.id]} onStatus={doStatus} onNote={doNote} onPhone={doPhone} onRevenue={doRevenue} phoneLoading={phoneLoading === ev.id} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Main event list */}
      {(subView === "list" || subView === "cities") && (
        <div style={{ padding: "0 16px 80px" }}>
          {loading && <div style={{ textAlign: "center", color: "#ff6b35", padding: 20 }}>Loading events...</div>}

          {/* Home tab with quick start */}
          {filtered.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: 30, color: "#666" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <p>No events found. Events will load automatically!</p>
            </div>
          )}

          {/* Grouped by date */}
          {groupEvents(filtered).map(([date, evs]) => (
            <div key={date}>
              <div style={{ color: "#ff6b35", fontSize: 13, fontWeight: 700, margin: "12px 0 6px", padding: "4px 0", borderBottom: "1px solid #222" }}>
                {date} ({evs.length} events)
              </div>
              {evs.map(ev => (
                <EC key={ev.id} ev={ev} log={callLogs[ev.id]} onStatus={doStatus} onNote={doNote} onPhone={doPhone} onRevenue={doRevenue} phoneLoading={phoneLoading === ev.id} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* User greeting footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0d0d1a", borderTop: "1px solid #222", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100 }}>
        <span style={{ color: "#888", fontSize: 12 }}>👤 {user.name}</span>
        <span style={{ color: "#444", fontSize: 11 }}>Hot Seats v2.0</span>
      </div>
    </div>
  );
}

/* ── Style constants ── */
const authInput = { width: "100%", padding: "12px 14px", background: "#0d0d1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 14, marginBottom: 12, boxSizing: "border-box" };
const appContainer = { minHeight: "100vh", background: "#0d0d1a", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const headerStyle = { background: "#0d0d1a", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #222" };
const backBtn = { background: "none", border: "none", color: "#ff6b35", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 };
const navIconBtn = { background: "none", border: "none", color: "#999", cursor: "pointer", padding: 4, fontSize: 16, display: "flex", alignItems: "center" };
const cityBtn = { padding: "6px 12px", borderRadius: 16, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" };
