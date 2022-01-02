'use strict';

const
    {Transform} = require('stream'),
    QOI = require('./QoiConstants');

class EncodeStream extends Transform
{
    #firstChunk;
    #length;
    #cache;
    #bpp;
    #header;
    #run;
    #prev;
    #buffer;
    #lastPixel;
    #pos;

    constructor (width, height, channels, colorspace, opts)
    {
        const {highWaterMark} = typeof opts === 'object' ? opts || {} : {};
        super({highWaterMark});

        this.#firstChunk = true;
        this.#length = width * height * channels;
        this.#lastPixel = this.#length - channels;
        this.#cache = Array.from({length: 64}, () => 0);
        this.#bpp = channels;
        this.#header = Buffer.allocUnsafe(14);
        this.#prev = 0x000000FF;
        this.#buffer = Buffer.allocUnsafe(0);
        this.#run = 0;
        this.#pos = 0;

        this.#header.writeUInt32BE(QOI.HEADER_MAGIC, 0);
        this.#header.writeUInt32BE(width, 4);
        this.#header.writeUInt32BE(height, 8);
        this.#header.writeUInt8(channels, 12);
        this.#header.writeUInt8(colorspace, 13);
    }

    _encode (chunk)
    {
        let
            size = 0,
            data = Buffer.allocUnsafe(1 + chunk.byteLength + chunk.byteLength / this.#bpp);

        for (let col, offset = 0; offset < chunk.byteLength; offset += this.#bpp, this.#pos += this.#bpp) {
            if (this.#bpp === 3) {
                col = chunk.readUInt16BE(offset) << 16 | chunk.getUint8(offset + 2) << 8 | 0xFF;
            } else {
                col = chunk.readUInt32BE(offset);
            }

            const match = col === this.#prev;

            match && this.#run++;

            if ((match && (this.#run === 62 || this.#pos === this.#lastPixel)) || (!match && this.#run)) {
                data.writeUInt8(QOI.OP_RUN | this.#run - 1, size++);
                this.#run = 0;
            }

            if (!match) {
                const hash = ((col >> 24 & 0xFF) * 3
                    + (col >> 16 & 0xFF) * 5
                    + (col >> 8 & 0xFF) * 7
                    + (col & 0xFF) * 11) % 64;

                if (col === this.#cache[hash]) {
                    data.writeUInt8(QOI.OP_INDEX | hash, size++);
                } else {
                    this.#cache[hash] = col;

                    if ((col & 0xFF) === (this.#prev & 0xFF)) {
                        const
                            dr = ((col >> 24 & 0xFF) - (this.#prev >> 24 & 0xFF)) << 24 >> 24,
                            dg = ((col >> 16 & 0xFF) - (this.#prev >> 16 & 0xFF)) << 24 >> 24,
                            db = ((col >> 8 & 0xFF) - (this.#prev >> 8 & 0xFF)) << 24 >> 24,
                            drg = dr - dg,
                            dbg = db - dg;

                        if (dr > -3 && dr < 2 && dg > -3 && dg < 2 && db > -3 && db < 2) {
                            data.writeUInt8(QOI.OP_DIFF | dr + 2  << 4 | dg + 2 << 2 | db + 2, size++);
                        } else if (dg > -33 && dg < 32 && drg > -9 && drg < 8 && dbg > -9 && dbg < 8) {
                            data.writeUInt8(QOI.OP_LUMA | dg + 32, size++);
                            data.writeUInt8(drg + 8 << 4 | dbg + 8, size++);
                        } else {
                            data.writeUInt8(QOI.OP_RGB, size);
                            data.writeUInt8(col >> 24 & 0xFF, size + 1);
                            data.writeUInt8(col >> 16 & 0xFF, size + 2);
                            data.writeUInt8(col >> 8 & 0xFF, size + 3);
                            size += 4;
                        }
                    } else {
                        data.writeUInt8(QOI.OP_RGBA, size);
                        data.writeUInt8(col >> 24 & 0xFF, size + 1);
                        data.writeUInt8(col >> 16 & 0xFF, size + 2);
                        data.writeUInt8(col >> 8 & 0xFF, size + 3);
                        data.writeUInt8(col & 0xFF, size + 4);
                        size += 5;
                    }
                }
            }
            this.#prev = col;
        }
        return data.slice(0, size);
    }

    _transform(chunk, encoding, callback)
    {
        if (this.#firstChunk) {
            this.#firstChunk = false;
            this.push(this.#header);
        }

        this.#buffer = Buffer.concat([this.#buffer, chunk]);
        const len = this.#buffer.byteLength - this.#buffer.byteLength % this.#bpp;

        if (this.#buffer.byteLength % this.#bpp === 0) {
            this.push(this._encode(this.#buffer.slice(0, len)));
        }

        this.#buffer = this.#buffer.slice(len);

        callback(null);
    }

    _flush(callback)
    {
        const tail = Buffer.allocUnsafe(QOI.TAIL_SIZE);

        tail.writeBigInt64BE(QOI.TAIL_MAGIC);
        callback(null, tail);
    }
}

module.exports = EncodeStream;