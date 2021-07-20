/// <reference path='../types/firmata.d.ts' />

import Fi = require("firmata");

export class Firmata {
    private static instance: Firmata;

    private constructor() { }

    public static getInstance(): Firmata {
        if (!Firmata.instance) {
            Firmata.instance = new Firmata();
        }

        return Firmata.instance;
    }
}