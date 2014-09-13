var Enum = require("enum");
var OpenZWave = require("openzwave");
var logger = require("winston");

var ZWaveManager = function(devicePath) {
    var zwave = void 0;
    var ready = false;
    var nodes = [];

    var CommandClass = new Enum(require("./zwave-commandclass.json"));
    var NotificationCode = new Enum(require("./zwave-notificationcode.json"));

    this.isReady = function() {
        return isReady;
    };

    this.start = function() {
        initializeDriver();
    };

    this.stop = function() {
        if (zwave) {
            zwave.disconnect();
            zwave = void 0;
        }
    };

    function initializeDriver() {
        zwave = new OpenZWave(devicePath, {
            logging: true,
            consoleoutput: false,
            saveconfig: true,
            driverattempts: 0,
            pollinterval: 500,
            suppressrefresh: true,
        });
        zwave.on("connected", onConnected);
        zwave.on("driver ready", onDriverReady);
        zwave.on("driver failed", onDriverFailed);
        zwave.on("node added", onNodeAdded);
        zwave.on("node ready", onNodeReady);
        zwave.on("notification", onNotification);
        zwave.on("scan complete", onScanComplete);
        zwave.on("value added", onValueAdded);
        zwave.on("value changed", onValueChanged);
        zwave.on("value removed", onValueRemoved);
        zwave.connect();
    }

    // *********************************
    // OpenZwave Event Handlers
    // *********************************
    function onConnected() {
        logger.log("verbose", "Connection established to an OpenZWave node")
    }

    function onDriverReady(homeID) {
        logger.log("verbose", "OpenZWave driver is initialized, scanning for nodes...");
    }

    function onDriverFailed() {
        logger.error("Failed to initialize OpenZWave driver");
        if (zwave) {
            zwave.disconnect();
            zwave = void 0;
        }
    }

    function onNodeAdded(nodeID) {
        logger.log("verbose", "A new ZWave node was found, ID=%d", nodeID);
        nodes[nodeID] = {
            manufacturer: void 0,
            manufacturerID: void 0,
            product: void 0,
            productType: void 0,
            productID: void 0,
            type: void 0,
            name: void 0,
            loc: void 0,
            classes: {},
            ready: false,
        }
    }

    function onNodeReady(nodeID, nodeInfo) {
        logger.log("verbose", "ZWave Node (ID=%d) is now ready", nodeID);
        var node = nodes[nodeID];

        // populate node object with discovered node info
        node.manufacturer = nodeInfo.manufacturer;
        node.manufacturerID = nodeInfo.manufacturerid;
        node.product = nodeInfo.product;
        node.productType = nodeInfo.producttype;
        node.productID = nodeInfo.productid;
        node.type = nodeInfo.type;
        node.name = nodeInfo.name;
        node.loc = nodeInfo.loc;
        node.ready = true;

        logger.log("verbose", "  Manufacturer: %s",
            nodeInfo.manufacturer ? nodeInfo.manufacturer : "ID=" + nodeInfo.manufacturerid);
        logger.log("verbose", "  Product: %s",
            nodeInfo.product ? nodeInfo.product :
            "ID=" + nodeInfo.productid + ", Type=" + nodeInfo.producttype);
        logger.log("verbose", "  Name: %s", nodeInfo.name);
        logger.log("verbose", "  Type: %s", nodeInfo.type);
        logger.log("verbose", "  Location: %s", nodeInfo.loc);

        for (var comClass in node.classes) {
            switch (comClass) {
                case CommandClass.SwitchBinary.value:
                case CommandClass.SwitchMultilevel.value:
                    logger.log("verbose", "  Polling: enabled");
                    zwave.enablePoll(nodeID, comClass);
                    break;
                default:
                    logger.log("verbose", "  Polling: disabled");
                    break;
            }

            var values = node.classes[comClass];
            logger.log("verbose", "  Class: %d", comClass);

            for (var idx in values) {
                var value = values[idx];
                logger.log("verbose", "  %s=%s", value.label, value.value);
            }
        }
    }

    function onNotification(nodeID, notif) {
        logger.log("verbose", "ZWave Node (ID=%d) notification received, code=%s", nodeID, NotificationCode.get(notif).toString());
    }

    function onScanComplete() {
        logger.log("verbose", "ZWave node scan is complete");
        ready = true;
    }

    function onValueAdded(nodeID, comClass, value) {
        var node = nodes[nodeID];
        if (!node.classes[comClass]) {
            node.classes[comClass] = {};
        }
        node.classes[comClass][value.index] = value;
    }

    function onValueChanged(nodeID, comClass, value) {
        var node = nodes[nodeID];
        logger.log("verbose", "ZWave Node (ID=%d) changed %s:%s:%s->%s",
            nodeID,
            CommandClass.get(comClass).toString(),
            value.label,
            node.classes[comClass][value.index].value,
            value.value);
        node.classes[comClass][value.index] = value;
    }

    function onValueRemoved(nodeID, comClass, index) {
        var node = nodes[nodeID];
        if (node.classes[comClass] && node.classes[comClass][index]) {
            delete node.classes[comClass][index];
        }
    }
};

module.exports = ZWaveManager;
