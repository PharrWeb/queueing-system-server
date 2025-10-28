const { EventEmitter } = require("events");
const bus = new EventEmitter();
bus.setMaxListeners(1000);
module.exports = bus;