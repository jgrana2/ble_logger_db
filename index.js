//Script to acquire BLE data from Holter using a USB BLE dongle on Jetson Nano

var noble = require('noble');

// Delay
const { promisify } = require('util')
const sleep = promisify(setTimeout)

// ECG Service UUID
var ecg_uuid = "805b";

function onDiscovery(peripheral) {
  // peripheral.rssi                             - signal strength
  // peripheral.address                          - MAC address
  // peripheral.advertisement.localName          - device's name
  // peripheral.advertisement.manufacturerData   - manufacturer-specific data
  // peripheral.advertisement.serviceData        - normal advertisement service data

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

              characteristic.on('data', function(data, isNotification) {
                console.log(characteristic.uuid, data.toString('hex'));
              });
            });
          });
        
      });
    });

    //Print peripheral name
    console.log(
      peripheral.address,
      JSON.stringify(peripheral.advertisement.localName),
    );
  }
}

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
