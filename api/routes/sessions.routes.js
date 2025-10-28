const router = require("express").Router();
const db = require("../mock/mockDB");

router.post("/begin", (req, res) => {
  try {
    const { kioskId } = req.body || {};
    const sessionId = db.beginSession(Number(kioskId));
    res.status(201).json({ sessionId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/step", (req, res) => {
  try {
    const { sessionId, categoryId, level } = req.body || {};
    const id = db.recordSelectionStep(Number(sessionId), Number(categoryId), Number(level));
    res.status(201).json({ selectionEventId: id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/complete", (req, res) => {
  try {
    const { sessionId, ticketId } = req.body || {};
    db.completeSession(Number(sessionId), ticketId ? Number(ticketId) : null);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;