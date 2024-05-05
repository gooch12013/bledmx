// This JavaScript file contains code to communicate with a Bluetooth device
// using the Web Bluetooth API. The code is organized in the following way:

// 1. Declare UUIDs for the Bluetooth service and characteristic
//    that we want to access.
const SERVICE_UUID = 'bfa00000-247d-6e1c-448c-223dfa0bd00c'; // UUID of the service that we want to access
const CHARACTERISTIC_UUID = 'bfa00001-247d-6e1c-448c-223dfa0bd00c'; // UUID of the characteristic within the service that we want to access

// 2. Declare global variables to keep track of the state of the
//    Bluetooth connection and the connected device.
let isConnected = false; // Is the device currently connected to the Bluetooth server?
let device; // The connected device

// 3. Define constants for the maximum transmission unit (MTU) and
//    the total number of slots in the DMX data.
const MAX_TRANSMISSION_UNIT = 247; // Maximum size of the data transfer in bytes
const TOTAL_SLOTS = 512; // Total number of slots in the DMX data

// 4. Define constants for the target value and command ID that we
//    will use when sending DMX data.
const TARGET_VALUE = 255; // Target value for each DMX slot
const COMMAND_ID = 0x04; // Command ID for sending DMX data (0x04 = write to slots)
const START_SLOT = 0x00; // Start slot (0x00 = first slot)

// 5. Function to scan for nearby Bluetooth devices and connect to the selected device
//    when a device is selected.
async function scanForDevices() {
    // Try to request a Bluetooth device from the user.
    try {
        // Request Bluetooth device with the specified parameters.
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true, // Scan for all nearby Bluetooth devices
            optionalServices: [SERVICE_UUID] // Add the UUID of the service we want to access
        });

        // Log the name of the found device.
        console.log('Found device:', device.name);

        // Call function to connect to the device and send DMX data.
        await connectToDevice(device);

    // Catch error if user cancels the device selection dialog.
    } catch (error) {
        if (error instanceof DOMException && error.name === 'NotFoundError') {
            console.log('Scanning for devices canceled by the user.');
        } else {
            console.error('Scanning error:', error);
        }
    }
}

// 6. Function to connect to the selected Bluetooth device.
async function connectToDevice(device) {
    // Check if the device is null.
    if (device === null) {
        throw new Error('Device is null.');
    }

    // Connect to the device's GATT server and get the primary service.
    const server = await device.gatt.connect();
    if (server === null) {
        throw new Error('Server is null.');
    } else {
        console.log('Connected to device:', device.name);
        const service = await server.getPrimaryService(SERVICE_UUID);

        // Get the characteristic within the service that we want to access.
        const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        // Call function to send DMX data using the characteristic.
        await sendDMXData(characteristic);
    }
}

// 7. Function to send DMX data to the connected device.
async function sendDMXData(characteristic) {
    // Create a Uint8Array to store the DMX data.
    const dmxData = new Uint8Array(TOTAL_SLOTS);

    // Set each slot in the DMX data to the target value.
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        dmxData[i] = TARGET_VALUE;
    }

    // Write the DMX data to the characteristic.
    await characteristic.writeValue(dmxData);

    // Log a success message.
    console.log('DMX data sent successfully.');
}

// 8. Event listener to start scanning for devices when the start button
//    is clicked. The event listener is added when the page is loaded.
document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('.button');
    let characteristic; // Define characteristic variable here
    
    // Add event listener to the start button to call the scanForDevices function
    // when the button is clicked.
    document.querySelector('.button').addEventListener('click', scanForDevices);

    // Event listener for the "min" button to set all slots to 0 when clicked.
    document.querySelector('.min').addEventListener('click', () => {
        if (isConnected) { // Check if device is connected
            const dmxData = new Uint8Array(TOTAL_SLOTS); // Create a Uint8Array to store the DMX data

            // Set each slot in the DMX data to 0.
            for (let i = 0; i < TOTAL_SLOTS; i++) {
                dmxData[i] = 0;
            }

            // Write the DMX data to the characteristic.
            characteristic.writeValue(dmxData);
        }
    });
});

// 9. Event listener for the start button.


