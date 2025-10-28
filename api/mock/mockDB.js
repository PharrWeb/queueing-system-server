const fs = require("fs");
const path = require("path");
const bus = require("./events");

const DATA_PATH = path.join(__dirname, "data.json");
const TMP_PATH = path.join(__dirname, "data.tmp");

// Helpers
const now = () => new Date().toISOString();
const ACTIVE_STATUSES = new Set(["waiting", "called", "serving"]);

function load() {
  if (!fs.existsSync(DATA_PATH)) {
    const seed = {
      sequences: { ticketSeq: 1 },
      lanes: [
        { id: 1, code: "L1", name: "Lane 1", is_open: true, is_deleted: false, created_at: now(), updated_at: now() },
        { id: 2, code: "L2", name: "Lane 2", is_open: true, is_deleted: false, created_at: now(), updated_at: now() }
      ],
      kiosks: [{ id: 1, code: "K1", location: "Lobby", is_active: true, created_at: now() }],
      users: [{ id: 1, username: "alice", role: "employee", display_name: "Alice", is_active: true }],
      employeeLaneAssignments: [],
      categories: [
        { id: 1, parent_id: null, name: "Licensing", is_selectable: false, is_active: true, is_visible: true, sort_order: 1, prefix_letter: "A" },
        { id: 2, parent_id: 1,    name: "Driver License", is_selectable: false, is_active: true, is_visible: true, sort_order: 1, prefix_letter: "A" },
        { id: 3, parent_id: 2,    name: "Renewal", is_selectable: true, is_active: true, is_visible: true, sort_order: 1, prefix_letter: "A" },
        { id: 4, parent_id: null, name: "Permits",   is_selectable: false, is_active: true, is_visible: true, sort_order: 2, prefix_letter: "B" },
        { id: 5, parent_id: 4,    name: "Building",  is_selectable: true,  is_active: true, is_visible: true, sort_order: 1, prefix_letter: "B" },
        { id: 6, parent_id: null, name: "Other",     is_selectable: true,  is_active: true, is_visible: true, sort_order: 99, prefix_letter: "Z" }
      ],
      tickets: [],
      ticketLaneHistory: [],
      ticketEvents: [],
      selectionSessions: [],
      selectionEvents: []
    };
    fs.writeFileSync(DATA_PATH, JSON.stringify(seed, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

function save(db) {
  const buf = Buffer.from(JSON.stringify(db, null, 2));
  const fd = fs.openSync(TMP_PATH, "w");
  try {
    fs.writeSync(fd, buf, 0, buf.length, 0);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(TMP_PATH, DATA_PATH);
}

// Sequence -> A–Z + 00–99
function mapSeqToCode(seq) {
  const letterIndex = Math.floor((seq - 1) / 100) % 26; // 0..25
  const prefix = String.fromCharCode(65 + letterIndex); // 'A'..'Z'
  const num = (seq - 1) % 100;                          // 0..99
  const code = `${prefix}${num.toString().padStart(2, "0")}`;
  return { prefix, num, code };
}

function nextTicketCode(db) {
  // retry up to 300 to avoid active collisions
  for (let tries = 0; tries < 300; tries++) {
    const seq = db.sequences.ticketSeq++;
    const { prefix, num, code } = mapSeqToCode(seq);
    const conflict = db.tickets.some(
      t => t.prefix === prefix && t.seq_num === num && ACTIVE_STATUSES.has(t.status)
    );
    if (!conflict) return { prefix, num, code };
  }
  throw new Error("Unable to allocate a unique active ticket code after many attempts.");
}

// Public API
const dbApi = {
  getDb: () => load(),

  // Categories
  listCategoriesFlat() {
    const db = load();
    return db.categories.filter(c => c.is_active && c.is_visible).sort((a,b)=>a.sort_order-b.sort_order);
  },

  // Selection sessions & steps
  beginSession(kiosk_id) {
    const db = load();
    const id = (db.selectionSessions.at(-1)?.id || 0) + 1;
    db.selectionSessions.push({ id, kiosk_id, started_at: now(), completed_at: null, ticket_id: null });
    save(db);
    return id;
  },
  recordSelectionStep(session_id, category_id, level) {
    const db = load();
    const id = (db.selectionEvents.at(-1)?.id || 0) + 1;
    db.selectionEvents.push({ id, session_id, category_id, level, selected_at: now() });
    save(db);
    return id;
  },
  completeSession(session_id, ticket_id = null) {
    const db = load();
    const s = db.selectionSessions.find(s => s.id === session_id);
    if (s) {
      s.completed_at = now();
      if (ticket_id) s.ticket_id = ticket_id;
      save(db);
    }
  },

  // Tickets
  issueTicket({ kiosk_id, category_id }) {
    const db = load();
    const { prefix, num, code } = nextTicketCode(db);
    const id = (db.tickets.at(-1)?.id || 0) + 1;
    const ticket = {
      id, prefix, seq_num: num, code,
      issued_at: now(), status: "waiting", lane_id: null,
      kiosk_id: kiosk_id ?? null, category_id: category_id ?? null,
      service_start_at: null, service_end_at: null, closed_at: null
    };
    db.tickets.push(ticket);
    const evId = (db.ticketEvents.at(-1)?.id || 0) + 1;
    db.ticketEvents.push({ id: evId, ticket_id: id, event_type: "issued", category_id, lane_id: null, meta: null, occurred_at: now() });
    save(db);
    bus.emit("event", { type: "ticket-issued", data: ticket });   // <--- NEW
    return ticket;
  },

  callNextTicket(lane_id) {
    const db = load();
    const lane = db.lanes.find(l => l.id === lane_id);
    if (!lane || !lane.is_open) throw new Error("Lane is closed.");
    const next = db.tickets.filter(t => t.status === "waiting").sort((a,b)=>new Date(a.issued_at)-new Date(b.issued_at))[0];
    if (!next) return null;

    next.status = "called";
    next.lane_id = lane_id;

    const histId = (db.ticketLaneHistory.at(-1)?.id || 0) + 1;
    db.ticketLaneHistory.push({ id: histId, ticket_id: next.id, lane_id, assigned_at: now(), unassigned_at: null });

    const evId = (db.ticketEvents.at(-1)?.id || 0) + 1;
    db.ticketEvents.push({ id: evId, ticket_id: next.id, event_type: "called", lane_id, category_id: next.category_id, meta: null, occurred_at: now() });
    save(db);
    bus.emit("event", { type: "ticket-called", data: next });     // <--- NEW
    return next;
  },

  startService(ticket_id, lane_id) {
    const db = load();
    const t = db.tickets.find(t => t.id === ticket_id);
    if (!t) throw new Error("Ticket not found.");
    t.status = "serving";
    t.lane_id = lane_id ?? t.lane_id;
    if (!t.service_start_at) t.service_start_at = now();

    const evId = (db.ticketEvents.at(-1)?.id || 0) + 1;
    db.ticketEvents.push({ id: evId, ticket_id, event_type: "service_start", lane_id: t.lane_id, category_id: t.category_id, meta: null, occurred_at: now() });
    save(db);
    bus.emit("event", { type: "service-start", data: t });        // <--- NEW
    return t;
  },

  completeTicket(ticket_id, outcome) {
    const db = load();
    if (!["completed","no_show","cancelled"].includes(outcome)) throw new Error("Invalid outcome.");
    const t = db.tickets.find(t => t.id === ticket_id);
    if (!t) throw new Error("Ticket not found.");
    t.status = outcome;
    if (outcome === "completed" && !t.service_end_at) t.service_end_at = now();
    t.closed_at = now();

    const openHist = db.ticketLaneHistory.find(h => h.ticket_id === ticket_id && h.unassigned_at == null);
    if (openHist) openHist.unassigned_at = now();

    const evId = (db.ticketEvents.at(-1)?.id || 0) + 1;
    db.ticketEvents.push({ id: evId, ticket_id, event_type: outcome, lane_id: t.lane_id, category_id: t.category_id, meta: null, occurred_at: now() });
    save(db);
    bus.emit("event", { type: `ticket-${outcome}`, data: t });    // <--- NEW
    return t;
  },

  reassignTicket(ticket_id, new_lane_id) {
    const db = load();
    const t = db.tickets.find(t => t.id === ticket_id);
    if (!t) throw new Error("Ticket not found.");
    const old_lane = t.lane_id;
    t.lane_id = new_lane_id;

    const openHist = db.ticketLaneHistory.find(h => h.ticket_id === ticket_id && h.unassigned_at == null);
    if (openHist) openHist.unassigned_at = now();
    const histId = (db.ticketLaneHistory.at(-1)?.id || 0) + 1;
    db.ticketLaneHistory.push({ id: histId, ticket_id, lane_id: new_lane_id, assigned_at: now(), unassigned_at: null });

    const evId = (db.ticketEvents.at(-1)?.id || 0) + 1;
    const meta = { from_lane: old_lane, to_lane: new_lane_id };
    db.ticketEvents.push({ id: evId, ticket_id, event_type: "reassigned_lane", lane_id: new_lane_id, category_id: t.category_id, meta, occurred_at: now() });
    save(db);
    bus.emit("event", { type: "ticket-reassigned", data: { ticketId: ticket_id, from: old_lane, to: new_lane_id } }); // <--- NEW
    return t;
  },

  // Lanes & assignments
  setLaneOpenState(lane_id, is_open) {
    const db = load();
    const l = db.lanes.find(l => l.id === lane_id);
    if (!l) throw new Error("Lane not found.");
    l.is_open = !!is_open;
    l.updated_at = now();
    save(db);
    return l;
  },

  assignEmployeeToLane(user_id, lane_id) {
    const db = load();
    // release any current assignment for user or lane
    db.employeeLaneAssignments.forEach(a => {
      if ((a.user_id === user_id || a.lane_id === lane_id) && a.released_at == null) a.released_at = now();
    });
    const id = (db.employeeLaneAssignments.at(-1)?.id || 0) + 1;
    const rec = { id, user_id, lane_id, assigned_at: now(), released_at: null };
    db.employeeLaneAssignments.push(rec);
    save(db);
    return rec;
  },

  // Views
  currentlyServing() {
    const db = load();
    return db.tickets
      .filter(t => t.status === "called" || t.status === "serving")
      .sort((a,b)=>{
        const aPrio = a.status === "called" ? 0 : 1;
        const bPrio = b.status === "called" ? 0 : 1;
        if (aPrio !== bPrio) return aPrio - bPrio;
        return (new Date(b.service_start_at||0) - new Date(a.service_start_at||0)) ||
               (new Date(b.issued_at) - new Date(a.issued_at));
      })
      .map(t => ({
        ticket_id: t.id, code: t.code, status: t.status, lane_id: t.lane_id,
        lane_code: (load().lanes.find(l => l.id === t.lane_id)?.code) || null,
        issued_at: t.issued_at, service_start_at: t.service_start_at
      }));
  },

  currentQueue() {
    const db = load();
    return db.tickets
      .filter(t => t.status === "waiting")
      .sort((a,b)=> new Date(a.issued_at) - new Date(b.issued_at))
      .map(t => ({ ticket_id: t.id, code: t.code, status: t.status, issued_at: t.issued_at, category_id: t.category_id, lane_id: t.lane_id }));
  },

  // Simple stats
  statsSummary() {
    const db = load();
    const totalIssued = db.ticketEvents.filter(e=>e.event_type==="issued").length;
    const byCategory = {};
    db.tickets.forEach(t => {
      if (!t.category_id) return;
      byCategory[t.category_id] = (byCategory[t.category_id]||0) + 1;
    });
    return { totalIssued, byCategory };
  }
};

module.exports = dbApi;
