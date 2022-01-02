'use strict';

const
    Encode = require('./Encode'),
    Decode = require('./Decode'),
    EncodeStream = require('./EncodeStream'),
    DecodeStream = require('./DecodeStream');

module.exports = {
    encode: Encode,
    decode: Decode,
    EncodeStream,
    DecodeStream
}