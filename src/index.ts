import express = require("express");
import { Fin } from "./lib/fin";
import { Flash } from "./lib/flash";

const app: express.Application = express();
const fin: Fin = new Fin();

/**
 * Gets the running status of the balenaFin
 * @param req None
 * @param res Idle, Flashing
 */
app.get("/status", function (_, res) {
  res.send("status");
});

/**
 * Gets the version of the balenaFin (e.g. v1.1.0)
 * @param req None
 * @param res balenaFin version
 */
app.get("/version", function (_, res) {
  res.send(fin.version);
});

/**
 * Sets the sleep period on the balenaFin
 * @param req Request object
 * @param res Response object
 */
app.post("/poweroff/:delay/:timeout", function (req, res) {
    if (!req.params.delay || !req.params.timeout) {
        return res.status(400).send("Bad Request");
      }
    else if (parseInt(fin.getVersion(true)) < 10) {
        return res
          .status(405)
          .send("Feature not available on current hardware revision");
      }
    
      fin.powerOff(parseInt(req.params.delay), parseInt(req.params.timeout))
        .then(() => {
          console.error("Sleep command registered, shutting down...");
          res.status(200).send("OK");
        })
        .catch((error) => {
          console.error(`Error registering sleep command: ${error.message}`);
          throw error;
        });});

app.listen(3000, function () {
  console.log("App is listening on port 3000!");
});
