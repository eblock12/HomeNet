var fs = require("fs");
var logger = require("winston");

var DeviceManager = function(file) {
    var devices = [];
    var dirty = false;
    var loading = false;
    var saving = false;
    var dead = false;

    var saveCheckTime = 1 * 1000 * 60; // 1 minute

    var saveTimer = setTimeout(doWriteCheck, saveCheckTime);

    if (!file) {
        file = "devices.json";
    }
    loadFile(file);

    this.addDevice = function()
    {
        if (isLoading) {
            throw new Error("Can't addDevice() while loading from file");
        }
        if (dead) {
            throw new Error("Can't addDevice() because the device database is unavailable.");
        }

        devices.push(new Device());
        dirty = true;
    };

    this.getDevices = function() {
        if (dead) {
            throw new Error("Can't getDevices() because the device database is unavailable.");
        }
        return devices;
    }

    this.removeDevice = function(device) {
        if (isLoading) {
            throw new Error("Can't removeDevice() while loading from file");
        }
        if (dead) {
            throw new Error("Can't removeDevice() because the device database is unavailable.");
        }

        var index = devices.indexOf(device);
        if (index !== -1) {
            devices.splice(index, 1);
        }
        dirty = true;
    };

    this.save = function(callback) {
        clearTimeout(saveTimer);
        doWriteCheck(callback);
    };

    function isDirty() {
        if (dirty) {
            return true;
        }
        for (var i = 0; i < devices.length; i++) {
            if (devices[i].isDirty()) {
                return true;
            }
        }
        return false;
    }

    function isLoading() {
        return loading;
    }

    function loadFile() {
        logger.info("Loading devices database from '%s'", file);

        loading = true;
        fs.readFile(file, function (err, data) {
            if (err) {
                if (err.code === "ENOENT") {
                    logger.info("Device file doesn't exist yet, will create a new one");
                    devices = [];
                    dirty = true;
                }
                else {
                    logger.error("Failed to load devices file from '%s'", file, err);
                    dead = true;
                }
            }
            else {
                try
                {
                    unpack(JSON.parse(data));
                    logger.log("verbose", "Finished reading devices database from '%s'", file);
                    dead = false;
                }
                catch (jsonError) {
                    logger.error("Failed to load devices file from '%s'", file, jsonError);
                    dead = true;
                }
            }
            loading = false;
        });
    }

    function saveFile(callback) {
        saving = true;

        logger.log("verbose", "Started writing devices database to '%s'", file);

        fs.writeFile(file, JSON.stringify(pack()), function(err) {
            if (err) {
                logger.error("Failed to save devices file to '%s'", file, err);
            }
            else {
                logger.log("verbose", "Finished writing devices database");
            }
            saving = false;
            if (callback) {
                callback();
            }
        });
    }

    function pack() {
        var devicesPack = [];
        for (var i = 0; i < devices.length; i++) {
            devicesPack.push(devices[i].pack());
        }
        return {
            Devices: devicesPack,
        };
    };

    function unpack(obj) {
        devices = [];
        if (obj.Devices) {
            for (var i = 0; i < obj.Devices.length; i++) {
                var newDevice = new Device();
                newDevice.unpack(obj.Devices[i]);
                devices.push(newDevice);
            }
        }
        dirty = false;
    }

    function setClean() {
        dirty = false;
        for (var i = 0; i < devices.length; i++) {
            devices[i].setClean();
        }
    }

    function doWriteCheck(callback) {
        if (isDirty() && !loading && !saving && !dead) {
            setClean();
            saveFile(callback);
        }
        else if (callback)
        {
            callback();
        }

        saveTimer = setTimeout(doWriteCheck, saveCheckTime);
    }

    var Device = function() {
        var name = "";
        var nodeID = 0; // ZWave Node

        var dirty = false;

        this.getName = function() { return name; };
        this.setName = function(name) {
            if (this.name !== name) {
                this.name = name;
                dirty = true;
            }
        };

        this.getNodeID = function() { return nodeID; };
        this.setNodeID = function(id) {
            if (this.nodeID !== id) {
                this.nodeID = id;
                dirty = true;
            }
        };

        this.isDirty = function() { return dirty; };

        this.setClean = function() { dirty = false; };

        this.pack = function() {
            return {
                Name: this.name,
                NodeID: this.nodeID,
            };
        };

        this.unpack = function(obj) {
            this.name = obj.Name;
            this.nodeID = obj.NodeID;
            dirty = false;
        };
    };
}

module.exports = DeviceManager;
