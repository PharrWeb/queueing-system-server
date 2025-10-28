const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const DATA_PATH = path.join(__dirname, "../mock/data.json");

// Reset to empty but keep lanes/kiosks/users/categories
router.post("/reset", (_req, res) => {
  const db = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  db.tickets = [];
  db.ticketLaneHistory = [];
  db.ticketEvents = [];
  db.selectionSessions = [];
  db.selectionEvents = [];
  db.sequences.ticketSeq = 1;
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
  res.json({ ok: true });
});

// Seed N waiting tickets
router.post("/seed", (req, res) => {
  const n = Number(req.body?.n ?? 10);
  const dbApi = require("../mock/mockDB");
  for (let i = 0; i < n; i++) dbApi.issueTicket({ kiosk_id: 1, category_id: 6 }); // "Other"
  res.json({ ok: true, seeded: n });
});

module.exports = router;
