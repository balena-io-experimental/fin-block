/// <reference path='./types/node-gtk.d.ts' />

import express = require("express");
import { Fin } from './lib/fin';


const app: express.Application = express();
const fin: Fin = new Fin;

/**
 * Description of the route
 * @param req Request object
 * @param res Response object
 */
app.get("/ping", function (_, res) {
  res.send("pong");
});

/**
 * Description of the route
 * @param req Request object
 * @param res Response object
 */
app.post("/sleep/:delay/:timeout", function (req, res) {

  if (!req.params.delay || !req.params.timeout) {
    return res.status(400).send("Bad Request");
  }

  if (parseInt(fin.revision) < 10) {
    return res
      .status(405)
      .send("Sleep is only available on the balenaFin v1.1 and above");
  }

  shutdown(req.params.delay, req.params.timeout)
    .then(() => {
      console.error("Sleep command registered, shutting down...");
      res.status(200).send("OK");
    })
    .catch((error) => {
      console.error(`Error registering sleep command: ${error.message}`);
      throw error;
    });
});

app.listen(3000, function () {
  console.log("App is listening on port 3000!");
});
