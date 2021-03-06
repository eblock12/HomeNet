var Enum = require("enum");
var fs = require("fs");
var logger = require("winston");

var CommandClass = new Enum(require("./zwave-commandclass.json"));

var DeviceManager = function(file, zwave) {
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

    this.addDevice = function(name, nodeID)
    {
        validateWriteState();

        var newDevice = new Device();
        if (name) {
            newDevice.setName(name);
        }
        if (nodeID) {
            newDevice.setNodeID(nodeID);
        };
        devices.push(newDevice);
        dirty = true;
        return newDevice;
    };

    this.getDevices = function() {
        validateReadState();
        return devices;
    };

    this.getDeviceByID = function(id) {
        validateReadState();
        for (var i = 0; i < devices.length; i++) {
            if (devices[i].getID() == id) {
                return devices[i];
            }
        }
        return void 0;
    };

    this.getNodesDebug = function() {
        return zwave.getNodes();
    };

    this.removeDevice = function(device) {
        validateWriteState();

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
                    dead = false;
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

    function validateReadState() {
        if (dead) {
            throw new Error("Device database is unavailable.");
        }
    }

    function validateWriteState() {
        validateReadState();
        if (loading) {
            throw new Error("Device database is currently loading.");
        }
    }

    var Device = function() {
        var _name = "";
        var _nodeID = 0; // ZWave Node
        var _id = newID();

        var _dirty = false;

        this.getID = function() { return _id; };

        this.getValue = function(name) {
            var values = zwave.getNodeValues(this.getNodeID());
            return values[name];
        };

        this.setValue = function(name, value) {
            return zwave.setNodeValue(this.getNodeID(), name, value);
        };

        this.getValues = function() {
            return zwave.getNodeValues(this.getNodeID());
        };

        this.getName = function() { return _name; };
        this.setName = function(name) {
            if (_name !== name) {
                _name = name;
                _dirty = true;
            }
        };

        this.getNodeID = function() { return _nodeID; };
        this.setNodeID = function(id) {
            if (_nodeID !== id) {
                _nodeID = id;
                _dirty = true;
            }
        };

        this.isDirty = function() { return _dirty; };

        this.setClean = function() { _dirty = false; };

        this.pack = function() {
            return {
                ID: _id,
                Name: _name,
                NodeID: _nodeID,
            };
        };

        this.unpack = function(obj) {
            if (obj.ID) {
                _id = obj.ID;
            }
            else {
                _id = newID();
            }
            _name = obj.Name;
            _nodeID = obj.NodeID;
            _dirty = false;
        };

        function newID() {
            var id = 0;

            for (var i = 0; i < devices.length; i++) {
                id = Math.max(devices[i].getID(), id);
            }

            return (id + 1);
        }
    };
}

module.exports = DeviceManager;
