const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
// middleware
app.use(express.json());
app.use(cors());
// Routes Path
const requisition = require("./routes/api");
// Routes
app.use("/", requisition);
// Port location
let port = process.env.PORT;
if (port == null || port == "") {
  port = 5000;
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
