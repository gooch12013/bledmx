const DMX_DATA_SERVICE_UUID = 'bfa00000-247d-6e1c-448c-223dfa0bd00c';
const DMX_CHARACTERISTIC_UUID = 'bfa00001-247d-6e1c-448c-223dfa0bd00c';

// Flag to check if the device is connected
let isConnected = false;
// Array to store the values of the 512 channels
let channels = new Uint8Array(512);
// Array to track whether each slot has been written
let slotWritten = new Array(512).fill(false);

let device;

// --------------------------------------------------------
const MTU = 247; // Maximum Transmission Unit
const TOTAL_SLOTS = 512; // Total number of slots
const TARGET_VALUE = 255; // The value to set for all slots
const COMMAND_ID = 0x04; // Example command identifier
const START_SLOT = 0x00; // Example starting slot (adjust as needed)

// Function to create chunks adhering to MTU
function splitIntoChunks(buffer, chunkSize) {
    const chunks = [];
    for (let i = 0; i < buffer.length; i += chunkSize) {
        chunks.push(buffer.slice(i, i + chunkSize));
    }
    return chunks;
}

// Function to create command buffer for a specific slot range
function createCommandBuffer(startSlot, values) {
    const buffer = [COMMAND_ID, values.length, startSlot, ...values];
    return buffer;
}

// Simulated function to write the command buffer to the BLE characteristic
async function writeBufferToCharacteristic(buffer) {
    // Replace with your actual BLE characteristic writing logic
    console.log('Writing buffer to characteristic:', buffer.map(v => v.toString(16).padStart(2, '0')));
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay
}

// Function to set all slots to a specific value
async function setAllSlotsToValue(value, totalSlots, mtu) {
    // Prepare an array filled with the desired value
    const allValues = new Array(totalSlots).fill(value);

    // Split this array into chunks that adhere to MTU
    const chunks = splitIntoChunks(allValues, mtu - 3); // Adjust for command bytes overhead

    // Write each chunk to the BLE characteristic with an appropriate starting slot
    let currentSlot = START_SLOT;
    for (const chunk of chunks) {
        const commandBuffer = createCommandBuffer(currentSlot, chunk);
        await writeBufferToCharacteristic(commandBuffer);
        currentSlot += chunk.length; // Update the starting slot for the next chunk
    }

    // Optionally, wait for all writes to finish
    console.log(`All ${totalSlots} slots set to value:`, value);
}


// --------------------------------------------------------
async function connectDevice() {
    if (device.gatt.connected) return;

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(DMX_DATA_SERVICE_UUID);

    const characteristic = await service.getCharacteristic(DMX_CHARACTERISTIC_UUID);
    isConnected = true;
    console.log('Connected to the device');
    console.log(characteristic);
    console.log(channels);
    console.log(slotWritten);
    setAllSlotsToValue(TARGET_VALUE, TOTAL_SLOTS, MTU);
    return characteristic;


}

async function requestDevice() {
    device = await navigator.bluetooth.requestDevice({
        // connection to any device
        acceptAllDevices: true,
        optionalServices: [DMX_DATA_SERVICE_UUID],
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('.button');
    let characteristic; // Define characteristic variable here

    button.addEventListener('click', async () => {

        if (!device) await requestDevice();

        await connectDevice();
    });

});
