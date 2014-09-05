var logger = require("winston");
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { level: "verbose", colorize: true });
module.exports = logger;
