'use strict';

const QOI = require('./QoiConstants');

module.exports = (buffer) => {
    const
        data = new DataView(ArrayBuffer.isView(buffer) ? buffer.buffer : buffer),
        dataSize = data.byteLength,
        seenPixels = Array.from({length: 64}, () => 0);

    if (dataSize < QOI.HEADER_SIZE + QOI.TAIL_SIZE) {
        return null;
    }

    const
        header = data.getUint32(0, false),
        width = data.getUint32(4, false),
        height = data.getUint32(8, false),
        channels = data.getUint8(12),
        cs = data.getUint8(13);

    if (width < 1 || height < 1 || channels < 3 || channels > 4 || cs < 0 || cs > 1 || header !== QOI.HEADER_MAGIC) {
        return null;
    }

    const
        len = width * height * channels,
        bytes = new DataView(new ArrayBuffer(len)),
        lastPixel = dataSize - QOI.TAIL_SIZE;

    for (let color = 0x000000FF, offset = 0, run = 0, index = 14; offset < len; offset += channels) {
        if (run > 0) {
            run--;
        } else if (index < lastPixel) {
            const
                b1 = data.getUint8(index++),
                b1Masked = b1 & QOI.MASK_2;

            if (b1 === QOI.OP_RGB) {
                color = data.getUint16(index, false) << 16 | data.getUint8(index + 2) << 8 | color & 0xFF;
                index += 3;
            } else if (b1 === QOI.OP_RGBA) {
                color = data.getUint32(index, false);
                index += 4;
            } else if (b1Masked === QOI.OP_INDEX) {
                color = seenPixels[b1];
            } else if (b1Masked === QOI.OP_DIFF) {
                color = (((color >> 24) + (((b1 >> 4) & 0x03) - 2)) & 0xFF) << 24
                    | (((color >> 16) + (((b1 >> 2) & 0x03) - 2)) & 0xFF) << 16
                    | (((color >> 8) + ((b1  & 0x03) - 2)) & 0xFF) << 8
                    | color & 0xFF;
            } else if (b1Masked === QOI.OP_LUMA) {
                const
                    b2 = data.getUint8(index++),
                    dg = (b1 & 0x3F) - 32;

                color = ((color >> 24) + (dg - 8 + ((b2 >> 4) & 0x0F)) & 0xFF) << 24
                    | (((color >> 16) + dg) & 0xFF) << 16
                    | (((color >> 8) + (dg - 8 + (b2 & 0x0F))) & 0xFF) << 8
                    | color & 0xFF;
            } else if (b1Masked === QOI.OP_RUN) {
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