// This code works to star a DMX output on the BLE device as of 5-24-2024

const SERVICE_UUID = 'bfa00000-247d-6e1c-448c-223dfa0bd00c';
const CHARACTERISTIC_UUID = 'bfa00001-247d-6e1c-448c-223dfa0bd00c';

async function startDMXOutput() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID]
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    const numSlots = 512;
    const maxChunkSize = 18; // 20 bytes MTU - 2 bytes for the header

    for (let i = 0; i < numSlots; i += maxChunkSize) {
      const chunkSize = Math.min(maxChunkSize, numSlots - i);
      const header = ((chunkSize << 9) & 0xFE00) | (i & 0x01FF);

      const chunk = new Uint8Array(2 + chunkSize);
      chunk[0] = header & 0xFF;
      chunk[1] = (header >> 8) & 0xFF;

      for (let j = 0; j < chunkSize; j++) {
        chunk[2 + j] = 0xFF; // Defalt value for all slots/channels
      }

      console.log(chunk);
      await characteristic.writeValueWithoutResponse(chunk);
    }

    console.log('DMX output started.');
  } catch (error) {
    console.error('Error starting DMX output:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.max').addEventListener('click', () => {
    console.log("Max");
    startDMXOutput();
  });
});
