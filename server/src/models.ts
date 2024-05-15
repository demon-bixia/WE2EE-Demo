import mongoose, { Schema } from 'mongoose';
import type { IKeyWithId, IUser, ISession } from './types/types';


// **** Variables **** //

const keyWithIdSchema = new Schema<IKeyWithId>({
  id: String,
  key: String,
});

const sessionSchema = new Schema<ISession>({
  IK: String,
  SPK: keyWithIdSchema,
  OPKs: [keyWithIdSchema],
  main: Boolean,
});

// User Model
const userSchema = new Schema<IUser>({
  username: { type: String, maxLength: 255, unique: true, index: true },
  sessions: [sessionSchema]
});
export const UserModel = mongoose.model<IUser>('User', userSchema);
