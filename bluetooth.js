
const SERVICE_UUID = 'bfa00000-247d-6e1c-448c-223dfa0bd00c'; // Replace with your actual service UUID
const CHARACTERISTIC_UUID = 'bfa00001-247d-6e1c-448c-223dfa0bd00c'; // Replace with your actual characteristic UUID


// Function to start the Bluetooth functionality
function start() {
    // Check if the browser supports Web Bluetooth API
    if ('bluetooth' in navigator) {
        console.log('Web Bluetooth API is supported.');
        // Call function to scan for devices
        scanForDevices();
    } else {
        console.error('Web Bluetooth API is not supported.');
    }
}

// Function to scan for nearby Bluetooth devices
function scanForDevices() {
    // Request Bluetooth device(s)
    navigator.bluetooth.requestDevice({
        acceptAllDevices: true, // Scan for all nearby Bluetooth devices
        optionalServices: [SERVICE_UUID] // Add the UUID of the service you want to access
    })
        .then(device => {
            console.log('Found device:', device.name);
            // Call function to connect to the device and send DMX data
            connectToDevice(device);
        })
        .catch(error => {
            console.error('Error scanning for devices:', error);
            if (error instanceof DOMException && error.name === 'NotFoundError') {
                console.log('Scanning for devices canceled by the user.');
            } else {
                // Handle other scanning errors
                console.error('Scanning error:', error);
            }
        });
}

// Function to connect to the selected Bluetooth device
function connectToDevice(device) {
    // Connect to the device
    device.gatt.connect()
        .then(server => {
            console.log('Connected to device:', device.name);
            // Call function to send DMX data
            sendDMXData(server);
        })
        .catch(error => {
            console.error('Error connecting to device:', error);
        });
}

// Function to send DMX data to the connected device
function sendDMXData(server) {
    // Generate random DMX data within the size limit
    const dmxData = new Uint8Array(512);
    for (let i = 0; i < dmxData.length; i++) {
        dmxData[i] = Math.floor(Math.random() * 256);
    }

    // Ensure server and Bluetooth characteristic are available
    if (!server || !SERVICE_UUID || !CHARACTERISTIC_UUID) {
        console.error('Server or characteristic UUIDs are not available.');
        return;
    }

    // Convert data to Uint8Array
    const dataArray = new Uint8Array(512 * 3); // Each slot change requires 3 bytes

    // Encode DMX data according to the provided format
    let byteIndex = 0;
    for (let i = 0; i < dmxData.length; i++) {
        const slotNumber = i + 1; // Slot number starts from 1
        const slotValue = dmxData[i];

        // Header: Number of slots in the data field (4 bits) + Slot number - 1 (12 bits)
        const header = ((4 << 12) | (slotNumber - 1)) & 0xffff; // 16-bit header

        // Add header to the data array (little-endian format)
        dataArray[byteIndex++] = header & 0xff; // Least significant byte
        dataArray[byteIndex++] = (header >> 8) & 0xff; // Most significant byte

        // Add slot value to the data array
        dataArray[byteIndex++] = slotValue & 0xff; // Least significant byte
    }

    // Get the service and characteristic for sending DMX data
    server.getPrimaryService(SERVICE_UUID)
        .then(service => service.getCharacteristic(CHARACTERISTIC_UUID))
        .then(characteristic => {
            // Write data to the characteristic
            return characteristic.writeValue(dataArray.slice(0, 512)); // Limit to 512 bytes
        })
        .then(() => {
            console.log('DMX data sent successfully.');
        })
        .catch(error => {
            console.error('Error sending DMX data:', error);
        });
}

// Define a global variable to store the previous snapshot
let previousSnapshot = null;

// Function to continuously update DMX data
async function updateDMXDataLoop() {
    while (true) {
        // 1. Take snapshot of universe
        const currentSnapshot = takeSnapshotOfUniverse();

        // 2. Compare to previous snapshot
        const changes = compareSnapshots(previousSnapshot, currentSnapshot);

        // 3. Compile list of all changes
        const changeList = compileChanges(changes);

        // 4. Write changes to Bluetooth device
        for (const change of changeList) {
            const buffer = createBuffer(change);
            await writeBufferToCharacteristic(buffer);
        }

        // 5. Wait for all writes to finish
        await waitForWritesToFinish();

        // Update previous snapshot for next iteration
        previousSnapshot = currentSnapshot;
    }
}

// Function to start the continuous update loop
function startContinuousUpdate() {
    // Start the loop
    updateDMXDataLoop()
        .then(() => {
            console.log('Continuous update loop started.');
        })
        .catch(error => {
            console.error('Error starting continuous update loop:', error);
        });
}



// Call the start function when the page is loaded
// start();
