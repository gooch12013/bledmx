/*
BLE Interface¶
The TimoTwo module comprises a BLE based interface that allows for configuration of the device as well as transfer of DMX data to the device.

Configuration¶
The configuration service allows for configuration and firmware update of the device. This interface is used by the CRMX Toolbox app.

Get it on Google Play   Download on the App Store

DMX data service¶
The DMX data service allows for BLE enabled lighting controllers to send DMX data to the device via BLE.

Name	Description
UUID	bfa00000-247d-6e1c-448c-223dfa0bd00c
DMX channel characteristic¶
Name	Description
UUID	bfa00001-247d-6e1c-448c-223dfa0bd00c
Read access	no
Write access	yes
Max write size	Depends on the negotiated ATT MTU
Data written to this characteristic is interpreted as a series of changes to be made to the generated channel data.

Channel values changed with this characteristic will keep their value until they are explicitly changed or the device is reset.

Changes take effect as soon as the written data is processed. There is no mechanism to synchronise changes split across several BLE transfers.

The generated frame always have Start Code 0 and have 512 slots of channel data.

Note: All 512 slots of data must be written at least once before the DMX output of the device is enabled. This is to avoid outputting any garbage data.

Data is encoded as a list of slot changes (Multi byte words are transferred least significant byte first). It is recommended to fill up as much as possible (or needed) of the ATT MTU by the list.

Each slot change has the following format:

Header (16 bit)	Data
Bit 15-9: Number of slots in the data field	DMX data (1 byte per slot)
Bit 8-0: Slot number - 1 of the first byte in the data field	 
Example 1

To set slots 5-7 to 0 126 254. Send the following 5 bytes: 0406007efe

Example 2

To set slots 5-7 to 0 126 254, and slots 511-512 to 14 30. Send the following 9 bytes: 0406007efefe050e1e

Algorithm for sending updates¶
BLE is by nature slower than a full refresh rate DMX stream. To handle this, it is recommended to only write changes to the device instead of the full universe.

Pseudo code


WHILE (1) {  
    TAKE SNAPSHOT OF UNIVERSE;
    COMPARE TO PREVIOUS SNAPSHOT;
    COMPILE LIST OF ALL CHANGES;
    WHILE (CHANGES LEFT IN LIST) {
        MOVE CHANGES TO A BUFFER UP TO MTU; //max 247 bytes
        WRITE BUFFER TO CHARACTERISTIC;
    }
    WAIT FOR ALL WRITES TO FINISH; //check through BLE stack or by reading a characteristic)
}
Generic RX/TX data service¶
The Generic RX/TX data service allows for apps to communicate with the host MCU via the BLE and SPI interfaces.

Before using this service it is recommended to use the OEM information codes register in the SPI interface. This allows any connecting apps to distinguish different applications from each other when using this service through identifying the correct manufacturer ID and product ID.

Name	Description
UUID	95221000-c733-6ac3-b844-467c1e68623f
RX characteristic¶
Name	Description
UUID	95221001-c733-6ac3-b844-467c1e68623f
Read access	yes
Write access	no
Data size	variable, up to 128 bytes or negotiated MTU
This characteristic is read to obtain available data.

TX characteristic¶
Name	Description
UUID	95221002-c733-6ac3-b844-467c1e68623f
Read access	no
Write access	yes
Data size	variable, up to 128 bytes or negotiated MTU
Write data to this characteristic to send it to the SPI interface.

Data available characteristic¶
Name	Description
UUID	95221003-c733-6ac3-b844-467c1e68623f
Read access	yes
Write access	yes
Notifications	yes
Data size	1 byte
Read this characteristic to obtain the number of bytes available in the RX characteristic. Notifications on changes is supported.

Write this characteristic to 0 to confirm data has been read from the RX characteristic.

Clear-to-send characteristic¶
Name	Description
UUID	95221004-c733-6ac3-b844-467c1e68623f
Read access	yes
Write access	no
Notifications	yes
Data size	1 byte
Read this characteristic to see if data can safely be written to the TX characteristic. This characteristic has a value of 0 after data has been written, until the host MCU has read the data from the SPI interface. After host has read the data, this characteristic has a value of 1 and it's safe to write more data.

Notifications of changes are supported on this characteristic.

*/