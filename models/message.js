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
    }
}, { timestamps: true })

const Message = model('message', messageSchema);

export default Message;