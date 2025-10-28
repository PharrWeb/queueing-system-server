const router = require("express").Router();
const db = require("../mock/mockDB");
const bus = require("../mock/events");

// Poll endpoints
router.get("/now", (_req, res) => res.json(db.currentlyServing()));
router.get("/queue", (_req, res) => res.json(db.currentQueue()));

// Live stream for displays
router.get("/sse", (req, res) => {
  res.set({
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
    "Connection": "keep-alive",
  });
  res.flushHeaders?.();

  const send = (type, payload) => {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Kickoff snapshot
  send("init", { serving: db.currentlyServing(), queue: db.currentQueue() });

  // Subscribe to events
  const handler = evt => send(evt.type, evt.data);
  bus.on("event", handler);

  req.on("close", () => {
    bus.off("event", handler);
  });
});

module.exports = router;
