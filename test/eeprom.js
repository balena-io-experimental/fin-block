const eeprom = require('../src/utils/eeprom/index.js');
const assert = require('assert');

describe('EEPROM', function () {
    describe('#parseSerial()', function () {
        it('Return valid pared manufacturing data', async () => {
            const actual = await eeprom.parseSerial("1100038129192019-0355")
            const expect = {
                RAW: "1100038129192019-0355",
                batchSerial: 381,
                hardwareRevision: 10,
                pcbaLot: "2019-0355",
                schema: 1,
                week: 29,
                year: 19
            }
            assert.deepEqual(actual, expect);
        })

        it('Throw an error if serial cannot be parsed', async () => {
            await eeprom.parseSerial("123456789").catch((error) => {
                assert.equal(error.message, 'bad serial: 123456789')
            })
        });
    })
    describe('#convertRevisionToVersion()', function () {
        it('Returns valid version for internal version', async () => {
            const testData = [9, 10, 11]
            const actual = await Promise.all(testData.map(async (version) => {
                return await eeprom.convertRevisionToVersion(version);
            }));
            const expect = ["1.0.0", "1.1.0", "1.1.1"]
            assert.deepEqual(actual, expect);
        })

        it('Throw an error if version is invalid', async () => {
            await eeprom.convertRevisionToVersion(8).catch((error) => {
                assert.equal(error.message, 'hardware revision 8 unknown, cannot convert to version')
            })
        });
    }
    );
});
