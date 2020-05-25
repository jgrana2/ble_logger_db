//Script to acquire BLE data from monitoring device using a USB BLE dongle on
// Jetson Nano, and store it on a Mongo DB

var noble = require('noble');
var mongo = require('mongodb');
// var Binary = require('mongodb').Binary;

// Delay
const { promisify } = require('util')
const sleep = promisify(setTimeout)

// ECG Service UUID
var ecg_uuid = "805b";

//Connect to database
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
MongoClient.connect(url, {useUnifiedTopology: true}, function(err, db) {
  if (err) throw err;
  db.db("devices").createCollection("device1", function(err, res) {
    if (err) throw err;
    console.log("Collection created!");
  });

  //New peripheral discovered event handler
  function onDiscovery(peripheral){
    // peripheral.rssi                             - signal strength
    // peripheral.address                          - MAC address
    // peripheral.advertisement.localName          - device's name
    // peripheral.advertisement.manufacturerData   - manufacturer-specific data
    // peripheral.advertisement.serviceData        - normal advertisement service data

    //Print peripheral name
    console.log(peripheral.address, JSON.stringify(peripheral.advertisement.localName), "dB");

    //Check device name
    if (peripheral.advertisement.localName === "IoT Holter"){
      console.log("Holter detected");

      //Connect to peripheral
      peripheral.connect(error => {
        console.log('Connected to', peripheral.id);
        peripheral.on('disconnect', function() {
          process.exit(0);
        });

        //Find service of interest
        peripheral.discoverServices([ecg_uuid], function(error, services) {
          console.log('Found ECG service:', services[0].uuid);

          //Discover characteristics
          services[0].discoverCharacteristics([], function(err, characteristics) {
            characteristics.forEach(function(characteristic) {
              console.log('Found characteristic:', characteristic.uuid);

              //Subscribe to notification
              characteristic.subscribe(function(error){
                if (error) {
                  console.log('Characteristic read error');
                }
                console.log("Notifications on");
              });

              //Receive notification data
              characteristic.on('data', function(data, isNotification) {
                // console.log(data.toString('hex'));

                //Parse samples
                var samples_per_document = 21;
                var samples = new Uint32Array(samples_per_document);
                for (var i = 0; i < data.length/Uint32Array.BYTES_PER_ELEMENT; i++) {
                  samples[i] = data.readUInt32LE(i*Uint32Array.BYTES_PER_ELEMENT);
                }

                //Make document
                var doc = {};
                doc.uuid = characteristic.uuid;
                doc.ts = new Date();
                doc.samples = samples;
                console.log(doc);

                //Insert document into DB
                db.db("devices").collection("device1").insertOne(doc, function(err, res){
                  if (err) throw err;
                  // console.log("Document inserted");
                });
              });
            });
          });
        });
      });
    }
  }

  //Start scanning when controller is on
  noble.on('stateChange',  function(state) {
    console.log("Controller state changed to " + state);
    if (state!="poweredOn") return;
    console.log("Starting scan...");
    noble.startScanning();
    sleep(2000).then(() => {
      noble.stopScanning();
    })
  });
  noble.on('discover', onDiscovery);
  noble.on('scanStart', function() { console.log("Scanning started."); });
  noble.on('scanStop', function() { console.log("Scanning stopped.");});
});
