/**
 * Custom Binary Protocol ("MS" Protocol v1)
 *
 * Header: 10 Bytes
 * -------------------------------------------------------------------------
 * Offset 0..1: Magic Bytes (0x4D53 -> "MS")
 * Offset 2:    Version (0x01)
 * Offset 3:    Opcode (1 Byte)
 * Offset 4:    Flags (1 Byte, 0x01 = ENCRYPTED)
 * Offset 5..7: Group ID (3 Bytes, uint24 Big-Endian)
 * Offset 8..9: Payload Length (2 Bytes, uint16 Big-Endian)
 */

export const MAGIC_BYTES = 0x4d53;
export const PROTOCOL_VERSION = 0x01;
export const HEADER_SIZE = 10;

export const OPCODES = {
    AUTH: 0x01,
    JOIN_ROOM: 0x02,
    CHAT_MESSAGE: 0x03,
    ACK: 0x04,
    ERROR: 0x05,
    PING: 0x06,
    PONG: 0x07,
};

export const FLAGS = {
    NONE: 0x00,
    ENCRYPTED: 0x01,
};

/**
 * Encodes the 10-byte header.
 */
export function encodeHeader({ opcode, flags = FLAGS.NONE, groupId = 0, payloadLength = 0 }) {
    const header = Buffer.alloc(HEADER_SIZE);
    header.writeUInt16BE(MAGIC_BYTES, 0);
    header.writeUInt8(PROTOCOL_VERSION, 2);
    header.writeUInt8(opcode, 3);
    header.writeUInt8(flags, 4);
    header.writeUIntBE(Number(groupId), 5, 3);
    header.writeUInt16BE(payloadLength, 8);
    return header;
}

/**
 * Decodes the 10-byte header.
 */
export function decodeHeader(buffer) {
    if (!buffer || buffer.length < HEADER_SIZE) {
        throw new Error(`Buffer too small for header: expected at least ${HEADER_SIZE} bytes, got ${buffer?.length || 0}`);
    }

    const magic = buffer.readUInt16BE(0);
    if (magic !== MAGIC_BYTES) {
        throw new Error(`Invalid magic bytes: 0x${magic.toString(16)} (expected 0x${MAGIC_BYTES.toString(16)})`);
    }

    const version = buffer.readUInt8(2);
    const opcode = buffer.readUInt8(3);
    const flags = buffer.readUInt8(4);
    const groupId = buffer.readUIntBE(5, 3);
    const payloadLength = buffer.readUInt16BE(8);

    return {
        magic,
        version,
        opcode,
        flags,
        groupId,
        payloadLength,
    };
}

/**
 * Encodes a complete CHAT_MESSAGE packet:
 * [Header (10B)] + [Payload: SenderID (3B) + IV (12B) + ClientMsgIdLen (1B) + ClientMsgId + Ciphertext]
 */
export function encodeChatMessagePacket({
    groupId,
    senderId,
    iv, // Buffer or Uint8Array (12 bytes)
    clientMsgId = '',
    ciphertext, // Buffer or Uint8Array
    flags = FLAGS.ENCRYPTED,
}) {
    const ivBuf = Buffer.isBuffer(iv) ? iv : Buffer.from(iv);
    if (ivBuf.length !== 12) {
        throw new Error(`IV must be exactly 12 bytes, got ${ivBuf.length}`);
    }

    const clientMsgIdBuf = Buffer.from(clientMsgId, 'utf8');
    if (clientMsgIdBuf.length > 255) {
        throw new Error(`ClientMsgId exceeds 255 bytes limit: ${clientMsgIdBuf.length}`);
    }

    const cipherBuf = Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext);

    // Payload: SenderID(3) + IV(12) + ClientMsgIdLen(1) + ClientMsgId(N) + Ciphertext(M)
    const payloadLength = 3 + 12 + 1 + clientMsgIdBuf.length + cipherBuf.length;
    if (payloadLength > 0xffff) {
        throw new Error(`Payload exceeds 65535 bytes maximum: ${payloadLength}`);
    }

    const header = encodeHeader({
        opcode: OPCODES.CHAT_MESSAGE,
        flags,
        groupId,
        payloadLength,
    });

    const payload = Buffer.alloc(payloadLength);
    let offset = 0;

    payload.writeUIntBE(Number(senderId), offset, 3);
    offset += 3;

    ivBuf.copy(payload, offset, 0, 12);
    offset += 12;

    payload.writeUInt8(clientMsgIdBuf.length, offset);
    offset += 1;

    clientMsgIdBuf.copy(payload, offset);
    offset += clientMsgIdBuf.length;

    cipherBuf.copy(payload, offset);

    return Buffer.concat([header, payload]);
}

/**
 * Decodes a CHAT_MESSAGE payload (excluding the 10-byte header).
 */
export function decodeChatMessagePayload(payloadBuffer) {
    if (!payloadBuffer || payloadBuffer.length < 3 + 12 + 1) {
        throw new Error(`Invalid CHAT_MESSAGE payload length: ${payloadBuffer?.length || 0}`);
    }

    let offset = 0;
    const senderId = payloadBuffer.readUIntBE(offset, 3);
    offset += 3;

    const iv = payloadBuffer.subarray(offset, offset + 12);
    offset += 12;

    const clientMsgIdLen = payloadBuffer.readUInt8(offset);
    offset += 1;

    if (offset + clientMsgIdLen > payloadBuffer.length) {
        throw new Error('Truncated clientMsgId in payload');
    }

    const clientMsgId = payloadBuffer.subarray(offset, offset + clientMsgIdLen).toString('utf8');
    offset += clientMsgIdLen;

    const ciphertext = payloadBuffer.subarray(offset);

    return {
        senderId,
        iv,
        clientMsgId,
        ciphertext,
    };
}

/**
 * Encodes an ACK packet:
 * [Header (10B)] + [Payload: ClientMsgIdLen (1B) + ClientMsgId + Status (1B) + ServerMsgIdLen (1B) + ServerMsgId]
 */
export function encodeAckPacket({ groupId, clientMsgId = '', status = 0, serverMsgId = '' }) {
    const clientMsgIdBuf = Buffer.from(clientMsgId, 'utf8');
    const serverMsgIdBuf = Buffer.from(serverMsgId, 'utf8');

    const payloadLength = 1 + clientMsgIdBuf.length + 1 + 1 + serverMsgIdBuf.length;
    const header = encodeHeader({
        opcode: OPCODES.ACK,
        flags: FLAGS.NONE,
        groupId,
        payloadLength,
    });

    const payload = Buffer.alloc(payloadLength);
    let offset = 0;

    payload.writeUInt8(clientMsgIdBuf.length, offset);
    offset += 1;

    clientMsgIdBuf.copy(payload, offset);
    offset += clientMsgIdBuf.length;

    payload.writeUInt8(status, offset);
    offset += 1;

    payload.writeUInt8(serverMsgIdBuf.length, offset);
    offset += 1;

    serverMsgIdBuf.copy(payload, offset);

    return Buffer.concat([header, payload]);
}

/**
 * Decodes an ACK payload.
 */
export function decodeAckPayload(payloadBuffer) {
    let offset = 0;
    const clientMsgIdLen = payloadBuffer.readUInt8(offset);
    offset += 1;

    const clientMsgId = payloadBuffer.subarray(offset, offset + clientMsgIdLen).toString('utf8');
    offset += clientMsgIdLen;

    const status = payloadBuffer.readUInt8(offset);
    offset += 1;

    const serverMsgIdLen = payloadBuffer.readUInt8(offset);
    offset += 1;

    const serverMsgId = payloadBuffer.subarray(offset, offset + serverMsgIdLen).toString('utf8');

    return { clientMsgId, status, serverMsgId };
}

/**
 * Encodes an ERROR packet.
 */
export function encodeErrorPacket({ groupId = 0, errorCode = 0, message = '' }) {
    const msgBuf = Buffer.from(message, 'utf8');
    const payloadLength = 2 + msgBuf.length;

    const header = encodeHeader({
        opcode: OPCODES.ERROR,
        flags: FLAGS.NONE,
        groupId,
        payloadLength,
    });

    const payload = Buffer.alloc(payloadLength);
    payload.writeUInt16BE(errorCode, 0);
    msgBuf.copy(payload, 2);

    return Buffer.concat([header, payload]);
}

/**
 * Decodes an ERROR payload.
 */
export function decodeErrorPayload(payloadBuffer) {
    const errorCode = payloadBuffer.readUInt16BE(0);
    const message = payloadBuffer.subarray(2).toString('utf8');
    return { errorCode, message };
}

/**
 * Encodes an AUTH packet.
 */
export function encodeAuthPacket({ token }) {
    const tokenBuf = Buffer.from(token, 'utf8');
    const header = encodeHeader({
        opcode: OPCODES.AUTH,
        flags: FLAGS.NONE,
        groupId: 0,
        payloadLength: tokenBuf.length,
    });
    return Buffer.concat([header, tokenBuf]);
}

/**
 * Decodes an AUTH payload.
 */
export function decodeAuthPayload(payloadBuffer) {
    return { token: payloadBuffer.toString('utf8') };
}

/**
 * Encodes a JOIN_ROOM packet.
 */
export function encodeJoinRoomPacket({ groupId }) {
    return encodeHeader({
        opcode: OPCODES.JOIN_ROOM,
        flags: FLAGS.NONE,
        groupId,
        payloadLength: 0,
    });
}
