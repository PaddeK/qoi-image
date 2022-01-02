'use strict';

module.exports = {
    HEADER_MAGIC: 0x71_6F_69_66,
    HEADER_SIZE: 14,
    TAIL_MAGIC: 1n,
    TAIL_SIZE: 8,
    OP_INDEX: 0x00,
    OP_DIFF: 0x40,
    OP_LUMA: 0x80,
    OP_RUN: 0xC0,
    OP_RGB: 0xFE,
    OP_RGBA: 0xFF,
    MASK_2: 0xC0
}