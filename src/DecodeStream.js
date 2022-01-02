'use strict';

const
    {Transform} = require('stream'),
    decode = require('./Decode');

class DecodeStream extends Transform
{
    #buffer;

    constructor (opts)
    {
        const {highWaterMark} = typeof opts === 'object' ? opts || {} : {};
        super({highWaterMark});

        this.#buffer = Buffer.alloc(0);
    }

    _transform(chunk, encoding, callback)
    {
        this.#buffer = Buffer.concat([this.#buffer, chunk]);
        callback(null);
    }

    _flush(callback)
    {
        const bytes = decode(this.#buffer);

        if (bytes === null) {
            return callback(new TypeError(`DecodeStream source is not a valid QOI file.`));
        }

        callback(null, bytes);
    }
}

module.exports = DecodeStream;