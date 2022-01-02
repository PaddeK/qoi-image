/* eslint-disable no-console */
'use strict';

const
    {createHash} = require('crypto'),
    {createReadStream, readFileSync} = require('fs'),
    {join} = require('path'),
    {encode, decode, EncodeStream, DecodeStream} = require('./../src'),
    filename = 'testcard_rgba',
    infile = join(__dirname, '..', 'reference', `${filename}.bin`),
    outfile = join(__dirname, '..', 'reference', `${filename}.qoi`),
    binBuffer = readFileSync(infile),
    qoiBuffer = readFileSync(outfile),
    refBinHash = createHash('sha1').update(binBuffer).digest('hex'),
    refQoiHash = createHash('sha1').update(qoiBuffer).digest('hex'),
    encoded = encode(binBuffer, 256, 256, 4, 1),
    decoded = decode(qoiBuffer),
    encodeHash = createHash('sha1').update(encoded).digest('hex'),
    decodeHash = createHash('sha1').update(decoded).digest('hex');

console.log(`Reference BIN hash: ${refBinHash}`);
console.log(`Reference QOI hash: ${refQoiHash}`);

console.log(`Encode hash: ${encodeHash}`, refQoiHash === encodeHash ? 'match' : 'no match');
console.log(`Decode hash: ${decodeHash}`, refBinHash === decodeHash ? 'match' : 'no match');

createReadStream(infile)
    .pipe(new EncodeStream(256, 256, 4, 1))
    .pipe(createHash('sha1').setEncoding('hex'))
    .on('finish', function() {
        const hash = this.read();
        console.log(`EncodeStream hash: ${hash}`, refQoiHash === hash ? 'match' : 'no match');
    });

createReadStream(outfile)
    .pipe(new DecodeStream())
    .pipe(createHash('sha1').setEncoding('hex'))
    .on('finish', function() {
        const hash = this.read();
        console.log(`DecodeStream hash: ${hash}`, refBinHash === hash ? 'match' : 'no match');
    });
