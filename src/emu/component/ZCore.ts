import { Z80 } from 'z80-emulator'
import { MemoryMap } from './Memory'

interface ZCoreSettings {
    peripherals: { ROM: ROM[] };
    sendOutput: (txt: string) => void;
    updateInterval: number
    numCyclesPerTick: number
}

export interface ROM {
    name: string;
    start: number;
    size: number;
    uri: any;
}

export class ZCore {
    emuConfig: ZCoreSettings
    mmap: MemoryMap
    outbuf: string
    inbuf: string
    bufferTickCountdown: number
    lastReadAddress: number
    lastWriteAddress: number
    cpu: Z80
    interval!: NodeJS.Timeout;

    constructor(emuConfig: ZCoreSettings) {
        this.emuConfig = emuConfig;
        this.mmap = new MemoryMap(0xFFFF);

        // add our peripherals
        this.parsePeripherals(emuConfig.peripherals);

        // reset the output buffer
        this.outbuf = "";
        this.inbuf = "";
        this.bufferTickCountdown = 0;

        // reset debugging
        this.lastReadAddress = 0xFFFF;
        this.lastWriteAddress = 0xFFFF;

        // initialize the Z80 core
        this.cpu = new Z80(this);

        this.cpu.reset();

        // timer
        this.go();
    }

    parsePeripherals(data: { ROM: ROM[] }) {
        for (let idx in data.ROM) {
            let item = data.ROM[idx];
            this.mmap.addROM(item.name, item.start, item.size, item.uri);
        }
    }

    readMemory(address: number) {
        this.lastReadAddress = address;
        return (this.mmap.read(address));
    }

    tStateCount = 0
    contendMemory() { }
    contendPort() { }


    writeMemory(address: number, value: number) {
        this.lastWriteAddress = address;
        this.mmap.write(address, value);
    }

    addToKeyboardBuffer(chars: string | ArrayBuffer) {
        this.inbuf += chars;
    }

    pollKeybuffer() {
        if (this.inbuf.length == 0) { return; }
        this.cpu.maskableInterrupt();
    }

    readPort(port: number) {
        let retval = 0x00;

        port = port & 0x00FF;

        if (port == 0x81) {  /* ACIA data (get chars from console) */
            // return with the first character
            retval = this.inbuf.charCodeAt(0);
            // and trim down the string (pop it off the front)
            this.inbuf = this.inbuf.substring(1);
        }

        if (port == 0x80) {  /* ACIA control */
            if (this.inbuf.length > 0) { /* console available */
                retval = 0x01; // kPRS_RxDataReady
            }
            retval |= 0x02; // kPRS_TXDataEmpty - ready for new stuff
            retval |= 0x04; // kPRS_DCD - connected to carrier
            retval |= 0x08; // kPRS_CTS - clear to send!
        }

        return retval;
    }

    writePort(port: number, value: number) {
        port = port & 0x00FF;
        if (port == 0x81) { /* ACIA data (send chars to console) */
            this.emuConfig.sendOutput(String.fromCharCode(value));
        }
    }

    tick() {
        let count = 0;

        // pop a keyhit off, if it's time.
        this.pollKeybuffer();

        // run some instructions
        while (this.tStateCount < this.emuConfig.numCyclesPerTick) {
            this.cpu.step();
        }
        this.cpu.hal.tStateCount = 0
    }

    go() {
        // stop them just in case
        clearInterval(this.interval);

        let self = this;
        this.interval = setInterval(function () {
            self.tick();
        }, this.emuConfig.updateInterval);
    }
}