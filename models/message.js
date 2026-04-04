import { Schema, model, models } from "mongoose";

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
        required: true,
    },
    attachments: [
        {
            fileType: { type: String },
            url: { type: String },
        }
    ]
}, { timestamps: true })

const Message = model('message', messageSchema);

export default Message;