import gi = require("node-gtk");





export class Fin {
    public version: string; 
    public port: string;
    private sdk: any;

    constructor() {
        const SDK = gi.require("Fin", "0.2");
        this.sdk = new SDK.Client();

        this.port = this.initSerialPort();
        this.version = this.setVersion();
    }

    private initSerialPort() {
        if (this.sdk.revision === "09") {
            return process.env.SERIALPORT || "/dev/ttyUSB0";
        } else {
            return process.env.SERIALPORT || "/dev/ttyS0";
        }
    }

    private setVersion(internal: boolean = false): string {
        let version;
        if (internal) {
            version = this.sdk.revision;
        } else {
            switch (this.sdk.revision) {
                case "09":
                    version = "1.0.0";
                    break;
                case "10":
                    version = "1.1.0";
                    break;
                case "11":
                    version = "1.1.1";
                    break;
                default:
                    version = "1.0.0";
                    break;
            }
        }
        return version;
    }

    /**
     * shutdown
     */
    public shutdown() {
        
    }
}