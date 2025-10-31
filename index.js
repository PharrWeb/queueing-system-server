const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
// middleware
app.use(require("cors")({ origin: [process.env.PROD_CLIENT_URL, process.env.DEV_CLIENT_URL], default: process.env.PROD_CLIENT_URL, credentials: false }));
app.use(express.json({ limit: "256kb" }));
// Routes Path
const api = require("./api/api");
// Routes
app.use("/", api);
// Port location
let port = process.env.PORT;
if (port == null || port == "") {
  port = 5002;
}

app.get("/", (req, res) => {
  try {
    res.status(200).send(`Hello World! From Queue server`);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Listening to port

app.listen(port, () => {
  console.log(`SERVER IS RUNNING ON PORT ${port}`);
});
