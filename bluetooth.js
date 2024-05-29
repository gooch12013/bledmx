// Constants for BLE service and characteristic UUIDs
const SERVICE_UUID = 'bfa00000-247d-6e1c-448c-223dfa0bd00c';
const CHARACTERISTIC_UUID = 'bfa00001-247d-6e1c-448c-223dfa0bd00c';

// Global state
const NUMSLOTS = 512; // Number of slots in the DMX output
const MAXCHUNKSIZE = 125; // 18 bytes = 20 bytes MTU - 2 bytes for the header
const HEADER_SIZE = 2; // Header size in bytes
const MTU_SIZE = 20; // Maximum Transmission Unit size
const TRANSMIT_DELAY = 50; // Delay between each DMX chunk transmission in milliseconds

let isConnected = false; // Flag to track if the device is connected
let device; // The selected device
let characteristic; // The selected characteristic
let statusMessage; // The status message element
let dmxArray = []; // The array to store the DMX values
let characteristicInUse = false; // Flag to track if the characteristic is currently in use

// Function to scan for devices and connect to the first one found
async function scanForDevices() {
  try {
    // Request a Bluetooth device
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID]
    });
    console.log('Found device:', device.name);
    statusMessage.textContent = 'Device found: ' + device.name;
    await connectToDevice(device); // Connect to the found device
  } catch (error) {
    console.error('Scanning error:', error);
    if (statusMessage) {
      statusMessage.textContent = 'Scanning error: ' + error;
    }
  }
}

// Function to connect to the selected device
async function connectToDevice(selectedDevice) {
  try {
    const server = await selectedDevice.gatt.connect(); // Connect to the GATT server
    const service = await server.getPrimaryService(SERVICE_UUID); // Get the primary service
    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID); // Get the characteristic

    // Update global state
    device = selectedDevice;
    isConnected = true;

    console.log('Connected to device:', device.name);
    statusMessage.textContent = 'Connected to device: ' + device.name;

    // Enable DMX output
    await enableDMX();
  } catch (error) {
    console.error('Connection error:', error);
    if (statusMessage) {
      statusMessage.textContent = 'Connection error: ' + error;
    }
  }
}

// Reconnect if disconnected previously
async function reconnect() {
  if (!device) {
    console.error('Device is not set.');
    return;
  }

  try {
    await connectToDevice(device); // Attempt to reconnect to the device
  } catch (error) {
    console.error('Reconnection error:', error);
  }
}

// Enable DMX output of the selected device NOTE: all slots must be sent for DMX output to work 
async function enableDMX() {
  try {
    // Iterate through all DMX slots
    for (let i = 0; i < NUMSLOTS; i += MAXCHUNKSIZE) {
      const chunkSize = Math.min(MAXCHUNKSIZE, NUMSLOTS - i); // Calculate the chunk size
      const header = ((chunkSize << 9) & 0xFE00) | (i & 0x01FF); // Create the header

      // Create the data chunk with the header and default DMX values (0x00)
      const chunk = new Uint8Array(HEADER_SIZE + chunkSize);
      chunk[0] = header & 0xFF;
      chunk[1] = (header >> 8) & 0xFF;

      for (let j = 0; j < chunkSize; j++) {
        chunk[HEADER_SIZE + j] = 0x00; // Default value for all slots/channels
      }

      console.log(chunk);
      await characteristic.writeValueWithoutResponse(chunk); // Write the chunk to the characteristic
    }
  } catch (error) {
    console.error('Error starting DMX output:', error);
  }

  console.log("DMX output enabled");
}

// Function to send only the given slots the DMX data to the connected device 
async function sendDMX(dmxArray) {
  if (!isConnected) {
    console.error('Device is not connected.');
    await reconnect(); // Attempt to reconnect if not connected
    return;
  }

  if (characteristicInUse) {
    console.log('Characteristic is already in use.');
    return;
  }

  characteristicInUse = true;

  try {
    // Function to send DMX data chunk by chunk with a delay
    const sendChunks = async (startIndex) => {
      if (startIndex >= dmxArray.length) {
        characteristicInUse = false;
        return;
      }

      const chunkSize = Math.min(MAXCHUNKSIZE, dmxArray.length - startIndex); // Calculate the chunk size
      const startSlot = dmxArray[startIndex].slot; // Get the start slot from the DMX array
      const header = ((chunkSize << 9) & 0xFE00) | ((startSlot - 1) & 0x01FF); // Create the header

      // Create the data chunk with the header and DMX values from the array
      const chunk = new Uint8Array(HEADER_SIZE + chunkSize);
      chunk[0] = header & 0xFF;
      chunk[1] = (header >> 8) & 0xFF;

      for (let j = 0; j < chunkSize; j++) {
        chunk[HEADER_SIZE + j] = dmxArray[startIndex + j].value; // Set DMX values from the array
      }

      await characteristic.writeValueWithoutResponse(chunk); // Write the chunk to the characteristic

      // Schedule the next chunk transmission
      setTimeout(() => sendChunks(startIndex + chunkSize), TRANSMIT_DELAY);
    };

    sendChunks(0); // Start sending chunks from the beginning
  } catch (error) {
    console.error('Error sending DMX data:', error);
    characteristicInUse = false; // Reset the flag in case of an error
  }
}

// Initialize the app and set up event listeners
window.addEventListener("load", startup, false);

document.addEventListener('DOMContentLoaded', () => {
  statusMessage = document.getElementById('status'); // Get the status message element

  // Add event listener for the scan button
  document.querySelector('.button').addEventListener('click', scanForDevices);

  // Add event listener for the max button (functionality can be added as needed)
  document.querySelector('.max').addEventListener('click', () => {
    // Add functionality for the max button if needed
  });

  // Add event listener for the master dimmer input
  document.querySelector('#masterDimmer').addEventListener('input', () => {
    const MD = document.querySelector('#masterDimmer').value;
    const dmxArray = [
      { slot: 1, value: MD },
    ];

    sendDMX(dmxArray); // Send DMX data with the master dimmer value
  });
});

// Set up the color picker and its event listener
function startup() {
  const colorPicker = document.querySelector("#color");
  colorPicker.value = "#FF0000"; // Set default color
  colorPicker.addEventListener("input", updateFirst, false); // Add event listener for color input
  colorPicker.select(); // Select the color picker
}

// Function to update DMX values based on the selected color
function updateFirst(event) {
  const colorPicker = event.target;
  const red = parseInt(colorPicker.value.slice(1, 3), 16); // Extract red value
  const green = parseInt(colorPicker.value.slice(3, 5), 16); // Extract green value
  const blue = parseInt(colorPicker.value.slice(5, 7), 16); // Extract blue value
  console.log("RGB values:", red, green, blue);

  const dmxArray = [
    { slot: 1, value: red },
    { slot: 2, value: green },
    { slot: 3, value: blue },
  ];

  sendDMX(dmxArray); // Send DMX data with the selected color values
}
