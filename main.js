var logger = require("./log.js");

// global services
var deviceManager;
var zwaveManager;
var server;

registerSignalHandlers();
initializeDeviceManager();
initializeZWaveManager();
initializeServer();

function initializeDeviceManager() {
    var DeviceManager = require("./device-manager.js");
    deviceManager = new DeviceManager(); // TODO: Load file name from config
}

function initializeZWaveManager() {
    logger.info("Bringing up ZWave...");
    var ZWaveManager = require("./zwave-manager.js");
    zwaveManager = new ZWaveManager("/dev/ttyUSB0"); // TODO: Load device path from config
    zwaveManager.start();
}

function initializeServer() {
    var Server = require("./server.js");
    server = new Server(3000, deviceManager); // TODO: Load port from config
    server.start();
}

function registerSignalHandlers() {
    process.on("SIGTERM", function() {
        logger.log("verbose", "Got SIGTERM");
        shutdown();
    });
    process.on("SIGINT", function() {
        logger.log("verbose", "Got SIGINT");
        shutdown();
    });
}

function shutdown() {
    logger.info("Shutting down...");
    if (server) {
        server.stop();
    }
    if (zwaveManager) {
        zwaveManager.stop();
    }
    if (deviceManager) {
        deviceManager.save(function() {
            process.exit();
        });
    }
}
