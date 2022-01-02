'use strict';

const QOI = require('./QoiConstants');

module.exports = (buffer, width, height, channels, colorspace) => {
    const
        len = width * height * channels,
        lastPixel = buffer.byteLength - channels,
        maxSize = width * height * (channels + 1) + QOI.HEADER_SIZE + QOI.TAIL_SIZE,
        data = new DataView(ArrayBuffer.isView(buffer) ? buffer.buffer : buffer),
        bytes = new DataView(new ArrayBuffer(maxSize)),
        seenPixels = Array.from({length: 64}, () => 0);

    bytes.setUint32(0, QOI.HEADER_MAGIC, false);
    bytes.setUint32(4, width, false);
    bytes.setUint32(8, height, false);
    bytes.setUint8(12, channels);
    bytes.setUint8(13, colorspace);

    let index = 14;

    for (let color, prevColor = 0x000000FF, run = 0, offset = 0; offset < len; offset += channels) {
        if (channels === 3) {
            color = ((data.getUint16(offset, false) << 16) | (data.getUint8(offset + 2)) << 8) | 0xFF;
        } else {
            color = data.getUint32(offset, false);
        }

        (color === prevColor) && run++;

        if ((color === prevColor && (run === 62 || offset === lastPixel)) || (color !== prevColor && run)) {
            bytes.setUint8(index++, QOI.OP_RUN | run - 1);
            run = 0;
        }

        if (color !== prevColor) {
            const hash = ((color >> 24 & 0xFF) * 3
                + (color >> 16 & 0xFF) * 5
                + (color >> 8 & 0xFF) * 7
                + (color & 0xFF) * 11) % 64;

            if (color === seenPixels[hash]) {
                bytes.setUint8(index++, QOI.OP_INDEX | hash);
            } else {
                seenPixels[hash] = color;

                if ((color & 0xFF) === (prevColor & 0xFF)) {
                    const
                        dr = ((color >> 24 & 0xFF) - (prevColor >> 24 & 0xFF)) << 24 >> 24,
                        dg = ((color >> 16 & 0xFF) - (prevColor >> 16 & 0xFF)) << 24 >> 24,
                        db = ((color >> 8 & 0xFF) - (prevColor >> 8 & 0xFF)) << 24 >> 24,
                        drg = dr - dg,
                        dbg = db - dg;

                    if (dr > -3 && dr < 2 && dg > -3 && dg < 2 && db > -3 && db < 2) {
                        bytes.setUint8(index++, QOI.OP_DIFF | dr + 2  << 4 | dg + 2 << 2 | db + 2);
                    } else if (dg > -33 && dg < 32 && drg > -9 && drg < 8 && dbg > -9 && dbg < 8) {
                        bytes.setUint16(index, (QOI.OP_LUMA | dg + 32) << 8 | drg + 8 << 4 | dbg + 8, false);
                        index += 2;
                    } else {
                        bytes.setUint32(index, QOI.OP_RGB << 24 | color >> 8 & 0xFFFFFF, false);
                        index += 4;
                    }
                } else {
                    bytes.setUint32(index, QOI.OP_RGBA << 24 | color >> 8, false);
                    bytes.setUint8(index + 4, color & 0xFF);
                    index += 5;
                }
            }
        }
        prevColor = color;
    }

    bytes.setBigUint64(index, QOI.TAIL_MAGIC, false);

    return new Uint8Array(bytes.buffer.slice(0, index + QOI.TAIL_SIZE));
}
