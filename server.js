var util = require("util");
var express = require("express");
var bodyParser = require("body-parser");
var https = require("https");
var logger = require("./log.js");

var Server = function(port, deviceManager) {
    var app = express();
    var server;

    this.start = function() {
        app.set("trust proxy", "loopback");
        app.disable("x-powered-by");

        server = app.listen(port, function() {
            logger.info("Listening for HTTP on port %d...", server.address().port);
        });
    };

    this.stop = function() {
        if (server) {
            server.close();
            server = void 0;
        }
    };

    // install JSON body parser middleware
    app.use(bodyParser.json());

    // ***********************
    // Implement API routes
    // ***********************
    app.get("/api/test", function(req,res) {
        res.send("Hello, world!");
    });

    app.get("/api/devices/:id", function(req, res) {
        var id = Number(req.params.id);
        var device = deviceManager.getDeviceByID(id);
        if (device) {
            res.json(device);
        }
        else {
            res.status(404).send("Device not found");
        }
    });

    app.get("/api/devices", function(req, res) {
        var devices = deviceManager.getDevices();
        res.json(devices);
    });

    app.post("/api/devices", function(req, res) {
        if (req.body && req.body.name && req.body.nodeID) {
            var device = deviceManager.addDevice(req.body.name, req.body.nodeID)
            res.status(201);
            res.end();
        } 
        else {
            res.status(400).send("Request is bad. Details: " + util.inspect(errors));
        }
    });

    function getDeviceByID(id) {
        deviceManager.getDeviceByID()
    }
};

module.exports = Server;
