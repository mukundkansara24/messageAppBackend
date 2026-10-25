import { Schema, model } from 'mongoose';

const userPublicKeySchema = new Schema({
    user_id: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    public_key: {
        type: String, // Stored as JWK JSON string
        required: true,
    }
}, { timestamps: true });

const UserPublicKey = model('user_public_key', userPublicKeySchema);

export default UserPublicKey;
