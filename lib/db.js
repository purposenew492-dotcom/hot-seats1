/* HOT SEATS - Supabase Database Layer */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";

async function sb(table, { method = "GET", body, query = "", headers: extra = {} } = {}) {
  const url = SUPABASE_URL + "/rest/v1/" + table + (query ? "?" + query : "");
  const res = await fetch(url, {
    method,
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json", Prefer: method === "POST" ? "return=representation" : method === "PATCH" ? "return=representation" : "", ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) { console.error("Supabase error:", res.status, await res.text()); return method === "GET" ? [] : null; }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// EMPLOYEES
export async function loginEmployee(name) {
  if (!SUPABASE_URL || !name) return null;
  const existing = await sb("employees", { query: "name=eq." + encodeURIComponent(name) + "&limit=1" });
  if (existing?.length > 0) return existing[0];
  const created = await sb("employees", { method: "POST", body: { name, created_at: new Date().toISOString() } });
  return created?.[0] || null;
}

export async function loginEmployeeWithPassword(name, password) {
  if (!SUPABASE_URL || !name || !password) return { error: "Name and password required" };
  const existing = await sb("employees", { query: "name=eq." + encodeURIComponent(name) + "&limit=1" });
  if (existing?.length > 0) {
    if (existing[0].password && existing[0].password !== password) return { error: "Wrong password" };
    if (!existing[0].password) await sb("employees", { method: "PATCH", query: "name=eq." + encodeURIComponent(name), body: { password } });
    return { employee: existing[0] };
  }
  return { error: "Account not found. Please register first." };
}

export async function registerEmployee(name, password, email) {
  if (!SUPABASE_URL || !name || !password) return { error: "Name and password required" };
  const existing = await sb("employees", { query: "name=eq." + encodeURIComponent(name) + "&limit=1" });
  if (existing?.length > 0) return { error: "Name already taken" };
  const created = await sb("employees", { method: "POST", body: { name, password, email: email || null, created_at: new Date().toISOString() } });
  if (created?.[0]) return { employee: created[0] };
  return { error: "Registration failed" };
}

export async function getEmployees() {
  if (!SUPABASE_URL) return [];
  return await sb("employees", { query: "order=name.asc" });
}

// CALL LOGS
export async function getCallLogs() {
  if (!SUPABASE_URL) return {};
  const rows = await sb("call_logs", { query: "order=updated_at.desc" });
  const map = {};
  (rows || []).forEach(r => {
    if (!map[r.event_id]) {
      map[r.event_id] = { status: r.status || "NOT_CALLED", note: r.note || "", note_by: r.note_by || "", employee: r.employee || "", employee_id: r.employee_id || "", timestamp: r.updated_at || r.created_at, revenue_amount: r.revenue_amount || 0, revenue_tickets: r.revenue_tickets || 0 };
    }
  });
  return map;
}

export async function upsertCallLog(eventId, eventName, venue, status, empId, emp, note, noteBy, revAmt, revTix) {
  if (!SUPABASE_URL) return null;
  const existing = await sb("call_logs", { query: "event_id=eq." + encodeURIComponent(eventId) + "&limit=1" });
  if (existing?.length > 0) {
    return await sb("call_logs", { method: "PATCH", query: "event_id=eq." + encodeURIComponent(eventId), body: { status, employee: emp || existing[0].employee, employee_id: empId || existing[0].employee_id, note: note || existing[0].note, note_by: noteBy || existing[0].note_by, revenue_amount: revAmt || existing[0].revenue_amount || 0, revenue_tickets: revTix || existing[0].revenue_tickets || 0, updated_at: new Date().toISOString() } });
  }
  return await sb("call_logs", { method: "POST", body: { event_id: eventId, event_name: eventName || "", venue: venue || "", status, employee: emp || "", employee_id: empId || "", note: note || "", note_by: noteBy || "", revenue_amount: revAmt || 0, revenue_tickets: revTix || 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } });
}

