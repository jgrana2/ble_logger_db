This script runs on Node.js v8 and uses the noble and RethinkDB libraries. It is designed to run on an IoT gateway and has been tested on a Jetson Nano board with a generic Bluetooth 4.0 USB dongle connected to a custom-designed BLE ECG machine.

HOW IT WORKS

The ECG BLE machine sends continuous notifications with ECG signal data, which is acquired by the gateway running this script. The script then takes the ECH signal data and stores it in a RethinkDB table. A server can then subscribe to the RethinkDB change feeds and receive the data in almost real-time.
