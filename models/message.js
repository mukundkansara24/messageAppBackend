import { Schema, model } from "mongoose";

const messageSchema = new Schema({
    group_id: {
        type: String,
        required: true,
    },
    sender_id: {
        type: String,
        required: true,
    },
    sender_name: {
        type: String,
        required: true,
    },
    ciphertext: {
        type: String, // Base64 encoded encrypted payload
        required: true,
    },
    iv: {
        type: String, // Base64 encoded 12-byte IV
        required: true,
    },
    is_encrypted: {
        type: Boolean,
        default: true,
    },
    client_msg_id: {
        type: String,
        index: true,
        sparse: true,
    }
}, { timestamps: true })

const Message = model('message', messageSchema);

export default Message;