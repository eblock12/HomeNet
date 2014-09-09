var ZWaveManager = require("./zwave-manager.js");
var DeviceManager = require("./device-manager.js");
var logger = require("./log.js");

// initialize the Devices Manager
var devices = new DeviceManager(); // TODO: Load file name from config

// bring up ZWave Manager
logger.info("Bringing up ZWave...");
var zwave = new ZWaveManager("/dev/ttyUSB0"); // TODO: Load device path from config
zwave.start();

// register terminate signal handler
process.on("SIGTERM", function() {
    logger.log("verbose", "Got SIGTERM");
    shutdown();
});
process.on("SIGINT", function() {
    logger.log("verbose", "Got SIGINT");
    shutdown();
});

function shutdown() {
    logger.info("Shutting down...");
    zwave.stop();
    devices.save(function() {
        process.exit();
    });
}
