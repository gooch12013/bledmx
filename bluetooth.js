// Constants for BLE service and characteristic UUIDs
const SERVICE_UUID = 'bfa00000-247d-6e1c-448c-223dfa0bd00c';
const CHARACTERISTIC_UUID = 'bfa00001-247d-6e1c-448c-223dfa0bd00c';

// Global state
const NUMSLOTS = 512; // Number of slots in the DMX output
const MAXCHUNKSIZE = 125; // 18 bytes = 20 bytes MTU - 2 bytes for the header

let isConnected = false; // Flag to track if the device is connected
let device; // The selected device
let characteristic; // The selected characteristic
let statusMessage; // The status message element
let dmxArray = []; // The array to store the DMX values
let characteristicInUse = false;




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
        if (statusMessage) {
            statusMessage.textContent = 'Scanning error: ' + error;
        }
    }
}

// Function to connect to the selected device
async function connectToDevice(selectedDevice) {
    try {
        const server = await selectedDevice.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

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
        await connectToDevice(device);
    } catch (error) {
        console.error('Reconnection error:', error);
    }
}

// enable DMX output of the selected device NOTE: all slots must be sent for DMX output to work 
async function enableDMX() {
    try {
        
        for (let i = 0; i < NUMSLOTS; i += MAXCHUNKSIZE) {
            const chunkSize = Math.min(MAXCHUNKSIZE, NUMSLOTS - i);
            const header = ((chunkSize << 9) & 0xFE00) | (i & 0x01FF);
    
            const chunk = new Uint8Array(2 + chunkSize);
            chunk[0] = header & 0xFF;
            chunk[1] = (header >> 8) & 0xFF;
      
            for (let j = 0; j < chunkSize; j++) {
              chunk[2 + j] = 0x00; // Defalt value for all slots/channels
            }
      
            console.log(chunk);
            await characteristic.writeValueWithoutResponse(chunk);
        }


        
    } catch (error) {
        console.error('Error starting DMX output:', error);
    }

    console.log("DMX output enabled");
} 


// function to send only the give slots the DMX data to the connected device 
async function sendDMX(dmxArray) {
    if (!isConnected) {
      console.error('Device is not connected.');
      reconnect();
      return;
    }
  
    if (characteristicInUse) {
      console.log('Characteristic is already in use.');
      return;
    }
  
    characteristicInUse = true;
  
    try {
      for (let i = 0; i < dmxArray.length; i += MAXCHUNKSIZE) {
        const chunkSize = Math.min(MAXCHUNKSIZE, dmxArray.length - i);
        const startSlot = dmxArray[i].slot;  // Assuming dmxArray contains objects with slot and value
        const header = ((chunkSize << 9) & 0xFE00) | ((startSlot - 1) & 0x01FF);
  
        const chunk = new Uint8Array(2 + chunkSize);
        chunk[0] = header & 0xFF;
        chunk[1] = (header >> 8) & 0xFF;
  
        for (let j = 0; j < chunkSize; j++) {
          chunk[2 + j] = dmxArray[i + j].value;  // Set DMX values from the array
        }
  
        console.log(chunk);
        await characteristic.writeValueWithoutResponse(chunk);
      }
  
      // console.log('DMX output started.');
    } catch (error) {
      console.error('Error starting DMX output:', error);
    } finally {
      characteristicInUse = false;
    }
  }

window.addEventListener("load", startup, false);

// Add event listeners for the scan button
document.addEventListener('DOMContentLoaded', () => {
    statusMessage = document.getElementById('status');

    document.querySelector('.button').addEventListener('click', scanForDevices);

    document.querySelector('.max').addEventListener('click', () => {

    });

    document.querySelector('#masterDimmer').addEventListener('input', () => {

        const MD = document.querySelector('#masterDimmer').value;
        // console.log(MD);
        const dmxArray = [ 
            { slot: 1, value: MD },
           
          ];

        sendDMX(dmxArray);
    
    });
    


});

function startup() {
    colorPicker = document.querySelector("#color");
    colorPicker.value ="#FF0000";
    colorPicker.addEventListener("input", updateFirst, false);
    colorPicker.select();
  }

  function updateFirst(event) {
    // console.log("Update First color: ", colorPicker.value);
    // concert the color code to hex format to rgb values
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

