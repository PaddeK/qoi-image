# Encoder / Decoder in javascript for QOI the quite okay image format.
Inspired by the work of [Francis Stokes](https://github.com/LowLevelJavaScript/QOI) and his encoder implementation
on [Youtube](https://www.youtube.com/watch?v=GgsRQuGSrc0).

# Reference
QOI format [https://qoiformat.org/](https://qoiformat.org/) by [Dominic Szablewski](http://twitter.com/phoboslab).

# Example
```node
'use strict';

const
    {encode, decode, EncodeStream, DecodeStream} = require('qoi-image'),
    {createHash} = require('crypto'),
    {createReadStream, readFileSync} = require('fs'),
    {join} = require('path'),
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

console.log(`Encode hash: ${encodeHash}`);
console.log(`Decode hash: ${decodeHash}`);

createReadStream(infile)
    .pipe(new EncodeStream(256, 256, 4, 1))
    .pipe(createHash('sha1').setEncoding('hex'))
    .on('finish', function() {
        const hash = this.read();
        console.log(`EncodeStream hash: ${hash}`);
    });

createReadStream(outfile)
    .pipe(new DecodeStream())
    .pipe(createHash('sha1').setEncoding('hex'))
    .on('finish', function() {
        const hash = this.read();
        console.log(`DecodeStream hash: ${hash}`);
    });
```