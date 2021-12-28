/* eslint-disable no-console */
'use strict';

const
    {createHash} = require('crypto'),
    {readFile} = require('fs/promises'),
    {join} = require('path'),
    Qoi = require('./../src');

(async () => {
    const
        filename = 'testcard_rgba',
        binBuffer = await readFile(join(__dirname, '..', 'reference', `${filename}.bin`)),
        qoiBuffer = await readFile(join(__dirname, '..', 'reference', `${filename}.qoi`)),
        refBinHash = createHash('sha1').update(binBuffer).digest('hex'),
        refQoiHash = createHash('sha1').update(qoiBuffer).digest('hex'),
        qoiResult = Qoi.encode(binBuffer, 256, 256, 4, 1),
        binResult = Qoi.decode(qoiBuffer),
        testBinHash = createHash('sha1').update(binResult).digest('hex'),
        testQoiHash = createHash('sha1').update(qoiResult).digest('hex');

    console.log(`Reference hash for ${filename}.bin:`, refBinHash);
    console.log(`Reference hash for ${filename}.qoi:`, refQoiHash);
    console.log(`Testing hash for ${filename}.bin:`, testBinHash, testBinHash === refBinHash ? 'match' : 'no match');
    console.log(`Testing hash for ${filename}.qoi:`, testQoiHash, testQoiHash === refQoiHash ? 'match' : 'no match');
})();
