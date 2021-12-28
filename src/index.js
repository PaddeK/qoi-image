'use strict';

class Qoi
{
    static #QOI_HEADER_MAGIC = 0x71_6F_69_66;
    static #QOI_HEADER_SIZE = 14;
    static #QOI_TAIL_MAGIC = 1n;
    static #QOI_TAIL_SIZE = 8;
    static #QOI_OP_INDEX = 0x00;
    static #QOI_OP_DIFF = 0x40;
    static #QOI_OP_LUMA = 0x80;
    static #QOI_OP_RUN = 0xC0;
    static #QOI_OP_RGB = 0xFE;
    static #QOI_OP_RGBA = 0xFF;
    static #QOI_MASK_2 = 0xC0;

    static decode (buffer)
    {
        const
            data = new DataView(ArrayBuffer.isView(buffer) ? buffer.buffer : buffer),
            dataSize = data.byteLength,
            seenPixels = Array.from({length: 64}, () => 0);

        if (dataSize < Qoi.#QOI_HEADER_SIZE + Qoi.#QOI_TAIL_SIZE) {
            return null;
        }

        const
            header = data.getUint32(0, false),
            width = data.getUint32(4, false),
            height = data.getUint32(8, false),
            channels = data.getUint8(12),
            cs = data.getUint8(13);

        if (width === 0 || height === 0 || channels < 3 || channels > 4 || cs > 1 || header !== Qoi.#QOI_HEADER_MAGIC) {
            return null;
        }

        const
            len = width * height * channels,
            bytes = new DataView(new ArrayBuffer(len)),
            lastPixel = dataSize - Qoi.#QOI_TAIL_SIZE;

        for (let color = 0x000000FF, offset = 0, run = 0, index = 14; offset < len; offset += channels) {
            if (run > 0) {
                run--;
            } else if (index < lastPixel) {
                const
                    b1 = data.getUint8(index++),
                    b1Masked = b1 & Qoi.#QOI_MASK_2;

                if (b1 === Qoi.#QOI_OP_RGB) {
                    color = data.getUint16(index, false) << 16 | data.getUint8(index + 2) << 8 | color & 0xFF;
                    index += 3;
                } else if (b1 === Qoi.#QOI_OP_RGBA) {
                    color = data.getUint32(index, false);
                    index += 4;
                } else if (b1Masked === Qoi.#QOI_OP_INDEX) {
                    color = seenPixels[b1];
                } else if (b1Masked === Qoi.#QOI_OP_DIFF) {
                    color = (((color >> 24) + (((b1 >> 4) & 0x03) - 2)) & 0xFF) << 24
                        | (((color >> 16) + (((b1 >> 2) & 0x03) - 2)) & 0xFF) << 16
                        | (((color >> 8) + ((b1  & 0x03) - 2)) & 0xFF) << 8
                        | color & 0xFF;
                } else if (b1Masked === Qoi.#QOI_OP_LUMA) {
                    const
                        b2 = data.getUint8(index++),
                        dg = (b1 & 0x3F) - 32;

                    color = ((color >> 24) + (dg - 8 + ((b2 >> 4) & 0x0F)) & 0xFF) << 24
                        | (((color >> 16) + dg) & 0xFF) << 16
                        | (((color >> 8) + (dg - 8 + (b2 & 0x0F))) & 0xFF) << 8
                        | color & 0xFF;
                } else if (b1Masked === Qoi.#QOI_OP_RUN) {
                    run = b1 & 0x3F;
                }

                const hash = ((color >> 24 & 0xFF) * 3
                    + (color >> 16 & 0xFF) * 5
                    + (color >> 8 & 0xFF) * 7
                    + (color & 0xFF) * 11) % 64;

                seenPixels[hash] = color;
            }

            if (channels === 4) {
                bytes.setUint32(offset, color, false);
            } else {
                bytes.setUint8(offset, color >> 24 & 0xFF);
                bytes.setUint8(offset + 1, color >> 16 & 0xFF);
                bytes.setUint8(offset + 2, color >> 8 & 0xFF);
            }
        }

        return new Uint8Array(bytes.buffer);
    }

    static encode (buffer, width, heigth, channels, colorspace)
    {
        const
            len = width * heigth * channels,
            lastPixel = buffer.byteLength - channels,
            maxSize = width * heigth * (channels + 1) + Qoi.#QOI_HEADER_SIZE + Qoi.#QOI_TAIL_SIZE,
            data = new DataView(ArrayBuffer.isView(buffer) ? buffer.buffer : buffer),
            bytes = new DataView(new ArrayBuffer(maxSize)),
            seenPixels = Array.from({length: 64}, () => 0);

        bytes.setUint32(0, Qoi.#QOI_HEADER_MAGIC, false);
        bytes.setUint32(4, width, false);
        bytes.setUint32(8, heigth, false);
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
                bytes.setUint8(index++, Qoi.#QOI_OP_RUN | run - 1);
                run = 0;
            }

            if (color !== prevColor) {
                const hash = ((color >> 24 & 0xFF) * 3
                    + (color >> 16 & 0xFF) * 5
                    + (color >> 8 & 0xFF) * 7
                    + (color & 0xFF) * 11) % 64;

                if (color === seenPixels[hash]) {
                    bytes.setUint8(index++, Qoi.#QOI_OP_INDEX | hash);
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
                            bytes.setUint8(index++, Qoi.#QOI_OP_DIFF | dr + 2  << 4 | dg + 2 << 2 | db + 2);
                        } else if (dg > -33 && dg < 32 && drg > -9 && drg < 8 && dbg > -9 && dbg < 8) {
                            bytes.setUint16(index, (Qoi.#QOI_OP_LUMA | dg + 32) << 8 | drg + 8 << 4 | dbg + 8, false);
                            index += 2;
                        } else {
                            bytes.setUint32(index, Qoi.#QOI_OP_RGB << 24 | color >> 8 & 0xFFFFFF, false);
                            index += 4;
                        }
                    } else {
                        bytes.setUint32(index, Qoi.#QOI_OP_RGBA << 24 | color >> 8, false);
                        bytes.setUint8(index + 4, color & 0xFF);
                        index += 5;
                    }
                }
            }
            prevColor = color;
        }

        bytes.setBigUint64(index, Qoi.#QOI_TAIL_MAGIC, false);

        return new Uint8Array(bytes.buffer.slice(0, index + 8));
    }
}

module.exports = Qoi;