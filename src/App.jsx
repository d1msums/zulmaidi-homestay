import React, { useState, useMemo, useEffect } from "react";

const SUPABASE_URL = "https://plmexafttequlhbpassf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbWV4YWZ0dGVxdWxoYnBhc3NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDM2ODgsImV4cCI6MjEwMzgxOTY4OH0.OwCojIzdLlMtkODKdKh2R7bg1A_3QYc5Pz8gh-s9r68";

const REST_URL = `${SUPABASE_URL}/rest/v1/bookings`;
const REST_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function fetchBookings() {
  try {
    const res = await fetch(`${REST_URL}?select=*&order=created_at.desc`, {
      headers: REST_HEADERS,
    });
    if (!res.ok) return { data: null, error: await res.text() };
    return { data: await res.json(), error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

async function insertBooking(payload) {
  try {
    const res = await fetch(REST_URL, {
      method: "POST",
      headers: { ...REST_HEADERS, Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { error: await res.text() };
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

async function updateBookingStatus(id, status) {
  try {
    const res = await fetch(`${REST_URL}?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...REST_HEADERS, Prefer: "return=representation" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return { error: await res.text() };
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

// ---- Design tokens ----
// Coastal kampung feel for Paka, Terengganu: sandy paper base, deep sea-teal accent,
// warm charcoal text. Serif display (evokes traditional homestay warmth) + clean sans body.
const COLORS = {
  sand: "#F1E9D8",
  sandDeep: "#E4D8BE",
  teal: "#1F5C58",
  tealDeep: "#153F3C",
  charcoal: "#2B2620",
  rust: "#B5551F",
  white: "#FFFBF3",
};

const WEEKDAY_PRICE = 180;
const WEEKEND_PRICE = 220;
const UNIT_NAME = "Zulmaidi Homestay";
const UNIT_LOCATION = "Paka, Dungun, Terengganu";
const CHECK_IN_TIME = "2:00 PM";
const CHECK_OUT_TIME = "12:00 PM";

const ADMIN_PASSWORD = "zulmaidi2026"; // change this to whatever your dad will remember

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 5 || day === 6; // Fri/Sat nights priced as weekend
}

function buildMonth(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export default function App() {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", guests: 2, notes: "" });
  const [bookings, setBookings] = useState([]);
  const [view, setView] = useState("public"); // "public" | "adminLogin" | "admin"
  const [confirmMsg, setConfirmMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminError, setAdminError] = useState("");

  async function loadBookings() {
    setLoading(true);
    setLoadError("");
    const { data, error } = await fetchBookings();
    if (!error && data) {
      setBookings(
        data.map((row) => ({
          id: row.id,
          guestName: row.guest_name,
          phone: row.phone,
          guests: row.guests,
          notes: row.notes,
          checkIn: row.check_in,
          checkOut: row.check_out,
          nights: row.nights,
          total: row.total,
          status: row.status,
        }))
      );
    } else if (error) {
      setLoadError(error);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadBookings();
  }, []);

  // Derive booked date strings from every existing booking's date range
  const bookedDates = useMemo(() => {
    const set = new Set();
    bookings.forEach((b) => {
      if (b.status === "Cancelled") return;
      let d = parseLocalDate(b.checkIn);
      const end = parseLocalDate(b.checkOut);
      while (d < end) {
        set.add(fmtDate(d));
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      }
    });
    return set;
  }, [bookings]);

  const cells = buildMonth(viewYear, viewMonth);

  function nightsBetween(a, b) {
    if (!a || !b) return 0;
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  }

  function priceForNight(date) {
    return isWeekend(date) ? WEEKEND_PRICE : WEEKDAY_PRICE;
  }

  function totalPrice() {
    if (!checkIn || !checkOut) return 0;
    let total = 0;
    let d = new Date(checkIn);
    while (d < checkOut) {
      total += priceForNight(d);
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }
    return total;
  }

  function handleDayClick(date) {
    if (!date) return;
    if (date < today) return;
    const key = fmtDate(date);
    if (bookedDates.has(key)) return;

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut(null);
    } else if (date > checkIn) {
      setCheckOut(date);
    } else {
      setCheckIn(date);
      setCheckOut(null);
    }
  }

  function isInRange(date) {
    if (!date || !checkIn) return false;
    if (checkOut) return date >= checkIn && date < checkOut;
    return fmtDate(date) === fmtDate(checkIn);
  }

  async function submitBooking(e) {
    e.preventDefault();
    if (!checkIn || !checkOut) {
      setConfirmMsg("Pick your check-in and check-out dates first.");
      return;
    }
    if (!form.name || !form.phone) {
      setConfirmMsg("Please fill in your name and phone number.");
      return;
    }

    const nights = nightsBetween(checkIn, checkOut);
    const total = totalPrice();

    setConfirmMsg("Sending your request...");

    const { error } = await insertBooking({
      guest_name: form.name,
      phone: form.phone,
      guests: form.guests,
      notes: form.notes,
      check_in: fmtDate(checkIn),
      check_out: fmtDate(checkOut),
      nights,
      total,
      status: "Pending confirmation",
    });

    if (error) {
      setConfirmMsg("Something went wrong sending your request. Please try again.");
      return;
    }

    await loadBookings();

    setConfirmMsg(
      `Request sent! ${nights} night(s), RM${total} total. ${UNIT_NAME.split(" ")[0]} will confirm via WhatsApp shortly.`
    );
    setCheckIn(null);
    setCheckOut(null);
    setForm({ name: "", phone: "", guests: 2, notes: "" });
  }

  function handleAdminLogin(e) {
    e.preventDefault();
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setView("admin");
      setAdminError("");
      setAdminPasswordInput("");
    } else {
      setAdminError("Wrong password.");
    }
  }

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  async function confirmBooking(id) {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "Confirming..." } : b))
    );
    const { error } = await updateBookingStatus(id, "Confirmed");
    if (error) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "Pending confirmation" } : b))
      );
      return;
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "Confirmed" } : b))
    );
  }

  async function cancelBooking(id) {
    const prevStatus = bookings.find((b) => b.id === id)?.status;
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "Cancelling..." } : b))
    );
    const { error } = await updateBookingStatus(id, "Cancelled");
    if (error) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: prevStatus } : b))
      );
      return;
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "Cancelled" } : b))
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.sand, color: COLORS.charcoal, fontFamily: "'Georgia', 'Iowan Old Style', serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        .sans { font-family: 'Helvetica Neue', Arial, sans-serif; }
        .day-cell { transition: background 0.15s ease; }
        .day-cell:hover:not(.disabled):not(.booked) { background: ${COLORS.sandDeep}; cursor: pointer; }
        button { cursor: pointer; }
        input, textarea { font-family: inherit; }
      `}</style>

      {/* Nav */}
      <div className="sans" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 28px", borderBottom: `1px solid ${COLORS.sandDeep}` }}>
        <div style={{ fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 700, color: COLORS.tealDeep }}>{UNIT_NAME}</div>
      </div>

      {view === "public" ? (
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 80px" }}>
          {/* Hero */}
          <div style={{ marginBottom: 40 }}>
            <div className="sans" style={{ color: COLORS.rust, fontSize: 14, marginBottom: 6 }}>{UNIT_LOCATION}</div>
            <h1 style={{ fontSize: 40, lineHeight: 1.15, margin: "0 0 12px", color: COLORS.tealDeep }}>
              A quiet coastal stay in Paka
            </h1>
            <p className="sans" style={{ fontSize: 16, lineHeight: 1.6, color: COLORS.charcoal, maxWidth: 560 }}>
              One comfortable home, a short drive from the beach and Paka town. Air-conditioned rooms,
              full kitchen, and free parking — ideal for families passing through Terengganu's east coast.
            </p>
            <div className="sans" style={{ display: "flex", gap: 24, marginTop: 20, fontSize: 14 }}>
              <div><strong style={{ color: COLORS.tealDeep }}>RM{WEEKDAY_PRICE}</strong> / weeknight</div>
              <div><strong style={{ color: COLORS.tealDeep }}>RM{WEEKEND_PRICE}</strong> / Fri &amp; Sat night</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {/* Calendar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <button onClick={() => changeMonth(-1)} className="sans" style={{ border: "none", background: "none", fontSize: 18, color: COLORS.teal }}>&larr;</button>
                <div className="sans" style={{ fontWeight: 600 }}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
                <button onClick={() => changeMonth(1)} className="sans" style={{ border: "none", background: "none", fontSize: 18, color: COLORS.teal }}>&rarr;</button>
              </div>
              <div className="sans" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 12, color: COLORS.charcoal, marginBottom: 6, textAlign: "center" }}>
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="sans" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {cells.map((date, i) => {
                  const disabled = !date || date < today;
                  const key = date ? fmtDate(date) : `empty-${i}`;
                  const booked = date && bookedDates.has(fmtDate(date));
                  const selected = date && isInRange(date);
                  return (
                    <div
                      key={key}
                      onClick={() => handleDayClick(date)}
                      className={`day-cell ${disabled ? "disabled" : ""} ${booked ? "booked" : ""}`}
                      style={{
                        aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: 6, fontSize: 13,
                        background: selected ? COLORS.teal : booked ? "#DDD3BC" : "transparent",
                        color: selected ? COLORS.white : disabled ? "#B8AF9C" : booked ? "#9C917A" : COLORS.charcoal,
                        textDecoration: booked ? "line-through" : "none",
                        opacity: disabled && date ? 0.4 : 1,
                      }}
                    >
                      {date ? date.getDate() : ""}
                    </div>
                  );
                })}
              </div>
              <div className="sans" style={{ fontSize: 12, color: COLORS.charcoal, marginTop: 10, opacity: 0.75 }}>
                Tap a check-in date, then a check-out date. Faded dates are booked or past.
              </div>
            </div>

            {/* Booking form */}
            <form onSubmit={submitBooking} className="sans" style={{ background: COLORS.white, border: `1px solid ${COLORS.sandDeep}`, borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 13, marginBottom: 14, color: COLORS.tealDeep, fontWeight: 600 }}>
                {checkIn && checkOut
                  ? `${fmtDate(checkIn)} (${CHECK_IN_TIME}) \u2192 ${fmtDate(checkOut)} (${CHECK_OUT_TIME}) \u00b7 ${nightsBetween(checkIn, checkOut)} night(s) \u00b7 RM${totalPrice()}`
                  : checkIn
                  ? `Check-in ${fmtDate(checkIn)} \u2014 now pick check-out`
                  : "Select your dates on the calendar"}
              </div>

              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Full name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", marginBottom: 12, borderRadius: 6, border: `1px solid ${COLORS.sandDeep}` }}
              />

              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Phone / WhatsApp number</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. 012-3456789"
                style={{ width: "100%", padding: "8px 10px", marginBottom: 12, borderRadius: 6, border: `1px solid ${COLORS.sandDeep}` }}
              />

              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Guests</label>
              <input
                type="number" min={1} max={10}
                value={form.guests}
                onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 10px", marginBottom: 12, borderRadius: 6, border: `1px solid ${COLORS.sandDeep}` }}
              />

              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                style={{ width: "100%", padding: "8px 10px", marginBottom: 14, borderRadius: 6, border: `1px solid ${COLORS.sandDeep}` }}
              />

              <button type="submit" style={{ width: "100%", padding: "10px 0", borderRadius: 6, border: "none", background: COLORS.teal, color: COLORS.white, fontSize: 14, fontWeight: 600 }}>
                Request booking
              </button>

              {confirmMsg && (
                <div style={{ marginTop: 12, fontSize: 13, color: COLORS.tealDeep }}>{confirmMsg}</div>
              )}
            </form>
          </div>

          <div className="sans" style={{ textAlign: "center", marginTop: 48 }}>
            <button
              onClick={() => setView("adminLogin")}
              style={{ border: "none", background: "none", color: COLORS.charcoal, opacity: 0.4, fontSize: 12 }}
            >
              Homestay owner login
            </button>
          </div>
        </div>
      ) : view === "adminLogin" ? (
        <div className="sans" style={{ maxWidth: 360, margin: "0 auto", padding: "80px 24px" }}>
          <h2 style={{ fontFamily: "'Georgia', serif", color: COLORS.tealDeep, marginBottom: 16 }}>Owner login</h2>
          <form onSubmit={handleAdminLogin}>
            <input
              type="password"
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              placeholder="Password"
              style={{ width: "100%", padding: "8px 10px", marginBottom: 12, borderRadius: 6, border: `1px solid ${COLORS.sandDeep}` }}
            />
            <button type="submit" style={{ width: "100%", padding: "10px 0", borderRadius: 6, border: "none", background: COLORS.teal, color: COLORS.white, fontSize: 14, fontWeight: 600 }}>
              Log in
            </button>
            {adminError && <div style={{ marginTop: 10, fontSize: 13, color: COLORS.rust }}>{adminError}</div>}
          </form>
          <button
            onClick={() => setView("public")}
            style={{ marginTop: 16, border: "none", background: "none", color: COLORS.charcoal, opacity: 0.5, fontSize: 13 }}
          >
            ← Back to booking page
          </button>
        </div>
      ) : (
        <div className="sans" style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h2 style={{ fontFamily: "'Georgia', serif", color: COLORS.tealDeep, margin: 0 }}>Bookings</h2>
            <button
              onClick={() => setView("public")}
              style={{ border: "none", background: "none", color: COLORS.charcoal, opacity: 0.5, fontSize: 13 }}
            >
              ← Back to public page
            </button>
          </div>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 20 }}>
            {loading
              ? "Loading bookings..."
              : loadError
              ? `Couldn't load bookings: ${loadError}`
              : bookings.length === 0
              ? "No bookings yet."
              : `${bookings.length} booking request(s)`}
          </div>
          {bookings.map((b) => (
            <div key={b.id} style={{ background: COLORS.white, border: `1px solid ${COLORS.sandDeep}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{b.guestName}</strong>
                <span style={{ fontSize: 12, color: b.status === "Confirmed" ? COLORS.teal : b.status === "Cancelled" ? "#9C917A" : COLORS.rust }}>
                  {b.status}
                </span>
              </div>
              <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
                {b.checkIn} ({CHECK_IN_TIME}) → {b.checkOut} ({CHECK_OUT_TIME}) · {b.nights} night(s) · RM{b.total}<br />
                {b.guests} guest(s) · {b.phone}
                {b.notes && <><br />Note: {b.notes}</>}
              </div>
              {b.status === "Pending confirmation" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => confirmBooking(b.id)}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: COLORS.teal, color: COLORS.white, fontSize: 13 }}
                  >
                    Mark as confirmed
                  </button>
                  <button
                    onClick={() => cancelBooking(b.id)}
                    style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${COLORS.rust}`, background: "transparent", color: COLORS.rust, fontSize: 13 }}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {b.status === "Confirmed" && (
                <button
                  onClick={() => cancelBooking(b.id)}
                  style={{ marginTop: 12, padding: "6px 14px", borderRadius: 6, border: `1px solid ${COLORS.rust}`, background: "transparent", color: COLORS.rust, fontSize: 13 }}
                >
                  Cancel booking
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
