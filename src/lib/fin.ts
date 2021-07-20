/// <reference path='../types/node-gtk.d.ts' />

import gi = require("node-gtk");
import { Firmata } from "./firmata";
import { Supervisor } from "./supervisor";

export class Fin {
  public version: string;
  public port: string;
  private sdk: any;

  constructor() {
    const SDK = gi.require("Fin", "0.2");
    this.sdk = new SDK.Client();

    this.port = this.initSerialPort();
    this.version = this.getVersion();
  }

  private initSerialPort() {
    if (this.sdk.revision === "09") {
      return process.env.SERIALPORT || "/dev/ttyUSB0";
    } else {
      return process.env.SERIALPORT || "/dev/ttyS0";
    }
  }

  public getVersion(internal: boolean = false): string {
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
  public async powerOff(delay: number, timeout: number) {
    
  }
  
}