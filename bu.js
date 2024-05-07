// Constants for BLE service and characteristic UUIDs
const SERVICE_UUID = 'bfa00000-247d-6e1c-448c-223dfa0bd00c';
const CHARACTERISTIC_UUID = 'bfa00001-247d-6e1c-448c-223dfa0bd00c';
const MAX_TRANSMISSION_UNIT = 20; // Typically 20 bytes for BLE 4.2

// Global state
let isConnected = false;
let device;
let characteristic;

let slider1;
let slider2;
let slider3;
let slider4;
let slider5;
let slider6;
let slider7;
let slider8;

// Function to initialize a DMX changes array and set all slot values to 255
function initializeDMXChanges(slots) {
    const changeSize = 3; // Each change is 3 bytes: 2 for slot number, 1 for value
    const changes = new Uint8Array(changeSize * slots.length);

    for (let i = 0; i < slots.length; i++) {
        const slotNumber = slots[i][0]; // Only take the slot number

        // Encode the slot number in little-endian (2 bytes)
        changes[i * changeSize] = slotNumber & 0xFF; // LSB
        changes[i * changeSize + 1] = (slotNumber >> 8) & 0xFF; // MSB

        // Set the value to 255 (1 byte)
        changes[i * changeSize + 2] = 255;
    }

    console.log('Prepared DMX data:', Array.from(changes));
    return changes;
}

// Function to scan for devices and connect to the first one found
async function scanForDevices() {
    try {
        device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [SERVICE_UUID]
        });
        console.log('Found device:', device.name);
        await connectToDevice(device);
    } catch (error) {
        console.error('Scanning error:', error);
    }
}

// Function to connect to the selected device
async function connectToDevice(selectedDevice) {
    try {
        const server = await selectedDevice.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
        isConnected = true;
        console.log('Connected to device:', selectedDevice.name);

        // Example slot changes
        const slotsToChange = [
            [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
            [5, 0], [6, 0], [7, 0], [8, 0], [9, 0]
        ];

        // Send initialized DMX changes once connected
        const dmxChanges = initializeDMXChanges(slotsToChange);
        await sendDMXDataInChunks(dmxChanges);
    } catch (error) {
        console.error('Connection error:', error);
    }
}

// Function to send data in chunks to the BLE characteristic
async function sendDMXDataInChunks(dmxData) {
    if (!characteristic) {
        console.error('Characteristic is not set.');
        return;
    }

    try {
        let offset = 0;
        while (offset < dmxData.length) {
            const chunkSize = Math.min(MAX_TRANSMISSION_UNIT, dmxData.length - offset);
            const chunk = dmxData.slice(offset, offset + chunkSize);
            console.log('Writing DMX data chunk:', Array.from(chunk));
            await characteristic.writeValue(chunk);
            offset += chunkSize;
        }
        console.log('DMX data successfully written to all slots in chunks.');
    } catch (error) {
        console.error('Error writing DMX data in chunks:', error);
    }
}

async function sendDMXData() {
    if (!isConnected) {
        await reconnect();
    }
    const dmxData = new Uint8Array(3);
    dmxData[0] = 0;
    dmxData[1] = 1;
    dmxData[2] = 255;
    await characteristic.writeValue(dmxData);
}


// Reconnect if disconnected previously
async function reconnect() {
    if (!device) {
        console.error('Device is not set.');
        return;
    }

    try {
        await connectToDevice(device);
    } catch (error) {
        console.error('Reconnection error:', error);
    }
}

// function to take slider value and send it to slot 1 of the device 

async function sendSliderValue() {
    if (!isConnected) {
        await reconnect();

    }

    let numberOfSlots = 0x00;
    let slotNumber = numberOfSlots - 1;



    // combine the slotAndNumberOfSlots and slotValue into a byte buffer
    const buffer = new ArrayBuffer(10);
    const view = new DataView(buffer);
    view.setUint8(0, slotNumber);
    view.setUint8(1, numberOfSlots);
    view.setUint8(2, document.getElementById('myRange1').value);
    view.setUint8(3, document.getElementById('myRange2').value);
    view.setUint8(4, document.getElementById('myRange3').value);
    view.setUint8(5, 0);
    view.setUint8(6, 0);
    view.setUint8(7, 0);
    view.setUint8(8, 0);
    view.setUint8(9, 0);
    


    // write the buffer to the characteristic
    console.log(numberOfSlots, slotNumber, buffer);
    await characteristic.writeValue(buffer);

}


// Add event listeners for the scan button
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.button').addEventListener('click', scanForDevices);
    // get slier value
    document.querySelector('.slider1').addEventListener('input', (event) => {
        const value = event.target.value;
        // set global variable slider1 to value
        slider1 = value;
        sendSliderValue();
    });
    document.querySelector('.slider2').addEventListener('input', (event) => {
        const value = event.target.value;
        // set global variable slider1 to value
        slider2 = value;
        sendSliderValue();
    });
    document.querySelector('.slider3').addEventListener('input', (event) => {
        const value = event.target.value;
        // set global variable slider1 to value
        slider3 = value;
        sendSliderValue();

    });

    const colorPicker = document.getElementById('colorPicker');
    const colorDisplay = document.getElementById('colorDisplay');

   
});
