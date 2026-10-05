import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  fullName: string;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    refreshTokenHash: {
      type: String,
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
