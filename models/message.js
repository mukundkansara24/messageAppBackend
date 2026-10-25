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
    message_text: {
        type: String,
    },
    ciphertext: {
        type: String, // Base64 encoded encrypted payload
    },
    iv: {
        type: String, // Base64 encoded 12-byte IV
    },
    is_encrypted: {
        type: Boolean,
        default: false,
    },
    client_msg_id: {
        type: String,
        index: true,
        sparse: true,
    }
}, { timestamps: true })

const Message = model('message', messageSchema);

export default Message;