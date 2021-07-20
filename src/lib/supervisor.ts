import debug = require("debug");
import rp = require("request-promise-native");

export class Supervisor {
    private static instance: Supervisor;
    private BALENA_SUPERVISOR_ADDRESS = process.env.BALENA_SUPERVISOR_ADDRESS;
    private BALENA_SUPERVISOR_API_KEY = process.env.BALENA_SUPERVISOR_API_KEY;
    private BALENA_APP_ID = process.env.BALENA_APP_ID;

    private constructor() { 
        
    }

    public static getInstance(): Supervisor {
        if (!Supervisor.instance) {
            Supervisor.instance = new Supervisor();
        }

        return Supervisor.instance;
    }

    /**
     * getOverlay
     */
    public getOverlay() {
        
    }

    /**
     * setOverlay
     */
    public setOverlay() {
        
    }

    /**
     * reboot
     */
    public async reboot() {
        return new Promise((resolve, reject) => {
                let options = {
                  method: "POST",
                  uri:
                    this.BALENA_SUPERVISOR_ADDRESS +
                    "/v1/reboot?apikey=" +
                    this.BALENA_SUPERVISOR_API_KEY,
                };
                rp(options)
                  .then(function (parsedBody) {
                    if (!parsedBody.Error) {
                      resolve(parsedBody.Data);
                    } else {
                      reject(parsedBody.Error);
                    }
                  })
                  .catch(function (err) {
                    reject(err);
                  });
              })
              .catch((_) => {
                console.error(
                  "device is not idle, likely updating, will retry rebooting in 60 seconds"
                );
                setTimeout(this.reboot, 60000);
              });
          };

    /**
     * shutdown
     */
    public shutdown() {
        
    }
}