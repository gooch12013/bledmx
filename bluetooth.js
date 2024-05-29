// Constants for BLE service and characteristic UUIDs
const SERVICE_UUID = 'bfa00000-247d-6e1c-448c-223dfa0bd00c';
const CHARACTERISTIC_UUID = 'bfa00001-247d-6e1c-448c-223dfa0bd00c';

// Global state
const NUM_SLOTS = 512;
const MAX_CHUNK_SIZE = 125;
const HEADER_SIZE = 2;
const MTU_SIZE = 20;
const TRANSMIT_DELAY = 70;

let isConnected = false;
let device;
let characteristic;
let statusMessage;
let dmxArray = [];
let characteristicInUse = false;
let isFading = false; // Flag to control the fade loop

// Function to scan for devices and connect to the first one found
async function scanForDevices() {
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID]
    });
    console.log('Found device:', device.name);
    statusMessage.textContent = 'Device found: ' + device.name;
    await connectToDevice(device);
  } catch (error) {
    console.error('Scanning error:', error);
    statusMessage.textContent = 'Scanning error: ' + error;
  }
}

// Function to connect to the selected device
async function connectToDevice(selectedDevice) {
  try {
    const server = await selectedDevice.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    device = selectedDevice;
    isConnected = true;

    console.log('Connected to device:', device.name);
    statusMessage.textContent = 'Connected to device: ' + device.name;

    await enableDMX();
  } catch (error) {
    console.error('Connection error:', error);
    statusMessage.textContent = 'Connection error: ' + error;
  }
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

// Enable DMX output for the connected device
async function enableDMX() {
  try {
    for (let i = 0; i < NUM_SLOTS; i += MAX_CHUNK_SIZE) {
      const chunkSize = Math.min(MAX_CHUNK_SIZE, NUM_SLOTS - i);
      const header = ((chunkSize << 9) & 0xFE00) | (i & 0x01FF);

      const chunk = new Uint8Array(HEADER_SIZE + chunkSize);
      chunk[0] = header & 0xFF;
      chunk[1] = (header >> 8) & 0xFF;

      for (let j = 0; j < chunkSize; j++) {
        chunk[HEADER_SIZE + j] = 0x00;
      }

      console.log(chunk);
      await characteristic.writeValueWithoutResponse(chunk);
    }
  } catch (error) {
    console.error('Error starting DMX output:', error);
  }

  console.log("DMX output enabled");
}

// Function to send DMX data to the connected device
async function sendDMX(dmxArray) {
  if (!isConnected) {
    console.error('Device is not connected.');
    await reconnect();
    return;
  }

  if (characteristicInUse) {
    return;
  }

  characteristicInUse = true;

  try {
    const sendChunks = async (startIndex) => {
      if (startIndex >= dmxArray.length) {
        characteristicInUse = false;
        return;
      }

      const chunkSize = Math.min(MAX_CHUNK_SIZE, dmxArray.length - startIndex);
      const startSlot = dmxArray[startIndex].slot;
      const header = ((chunkSize << 9) & 0xFE00) | ((startSlot - 1) & 0x01FF);

      const chunk = new Uint8Array(HEADER_SIZE + chunkSize);
      chunk[0] = header & 0xFF;
      chunk[1] = (header >> 8) & 0xFF;

      for (let j = 0; j < chunkSize; j++) {
        chunk[HEADER_SIZE + j] = dmxArray[startIndex + j].value;
      }

      await characteristic.writeValueWithoutResponse(chunk);

      setTimeout(() => sendChunks(startIndex + chunkSize), TRANSMIT_DELAY);
    };

    sendChunks(0);
  } catch (error) {
    console.error('Error sending DMX data:', error);
    characteristicInUse = false;
  }
}

// Function to fade between two colors indefinitely until the button is clicked again, including hold time
function setFade() {
  if (isFading) {
    isFading = false;
    // Set RGB values to 0 and send to BLE
    const dmxArray = [
      { slot: 1, value: 0 },
      { slot: 2, value: 0 },
      { slot: 3, value: 0 },
    ];
    sendDMX(dmxArray);
    return;
  }

  isFading = true;
  const color1 = document.getElementById('color1').value;
  const color2 = document.getElementById('color2').value;
  const fadeTime = parseInt(document.getElementById('fadeTime').value, 10);
  const holdTime = parseInt(document.getElementById('HoldTime').value, 10); // Get hold time from input

  const color1RGB = hexToRgb(color1);
  const color2RGB = hexToRgb(color2);

  const steps = fadeTime / TRANSMIT_DELAY;
  const stepChange = {
    r: (color2RGB.r - color1RGB.r) / steps,
    g: (color2RGB.g - color1RGB.g) / steps,
    b: (color2RGB.b - color1RGB.b) / steps,
  };

  let currentStep = 0;
  let direction = 1;
  let holding = false;

  const fadeInterval = setInterval(() => {
    if (!isFading) {
      clearInterval(fadeInterval);
      return;
    }

    if (holding) {
      return;
    }

    const currentColor = {
      r: clamp(Math.round(color1RGB.r + stepChange.r * currentStep), 0, 255),
      g: clamp(Math.round(color1RGB.g + stepChange.g * currentStep), 0, 255),
      b: clamp(Math.round(color1RGB.b + stepChange.b * currentStep), 0, 255),
    };

    const dmxArray = [
      { slot: 1, value: currentColor.r },
      { slot: 2, value: currentColor.g },
      { slot: 3, value: currentColor.b },
    ];

    sendDMX(dmxArray);
    currentStep += direction;

    if (currentStep >= steps || currentStep <= 0) {
      direction *= -1; // Reverse the fade direction
      holding = true;
      setTimeout(() => {
        holding = false;
      }, holdTime);
    }
  }, TRANSMIT_DELAY);
}

// Helper function to clamp a value between min and max
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Convert hex color to RGB
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// Initialize the app and set up event listeners
window.addEventListener("load", startup, false);

document.addEventListener('DOMContentLoaded', () => {
  statusMessage = document.getElementById('status');

  document.querySelector('#scanButton').addEventListener('click', scanForDevices);
  document.querySelector('#allMaxButton').addEventListener('click', () => {
    // Add functionality for the max button if needed
  });

  document.querySelector('#masterDimmer').addEventListener('input', () => {
    const masterDimmerValue = document.querySelector('#masterDimmer').value;
    const dmxArray = [
      { slot: 1, value: masterDimmerValue },
    ];

    sendDMX(dmxArray);
  });

  document.querySelector('#fadeButton').addEventListener('click', setFade);
});

// Set up the color picker and its event listener
function startup() {
  const colorPicker = document.querySelector("#color");
  colorPicker.value = "#FF0000";
  colorPicker.addEventListener("input", updateColor, false);
  colorPicker.select();
}

// Function to update DMX values based on the selected color
function updateColor(event) {
  const colorPicker = event.target;
  const red = parseInt(colorPicker.value.slice(1, 3), 16);
  const green = parseInt(colorPicker.value.slice(3, 5), 16);
  const blue = parseInt(colorPicker.value.slice(5, 7), 16);
  console.log("RGB values:", red, green, blue);

  const dmxArray = [
    { slot: 1, value: red },
    { slot: 2, value: green },
    { slot: 3, value: blue },
  ];

  sendDMX(dmxArray);
}
