const router = require("express").Router();

router.use("/tickets", require("./routes/tickets.routes"));
router.use("/lanes", require("./routes/lanes.routes"));
router.use("/categories", require("./routes/categories.routes"));
router.use("/sessions", require("./routes/sessions.routes"));
router.use("/tv", require("./routes/tv.routes"));
router.use("/stats", require("./routes/stats.routes"));

if (process.env.NODE_ENV !== "production") {
  router.use("/dev", require("./routes/dev.routes"));
}

module.exports = router;
