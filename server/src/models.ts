import type { IKeyWithId, ISession, IUser } from '@src/types/types';
import mongoose, { Schema } from 'mongoose';


// **** Variables **** //

// a public key with an id
const keyWithIdSchema = new Schema<IKeyWithId>({
  id: String,
  publicKey: String,
  signature: String,
});

// keys tied to a session
const sessionSchema = new Schema<ISession>({
  IK: String,
  SIK: String,
  SPK: keyWithIdSchema,
  OPKs: [keyWithIdSchema],
  main: Boolean,
});

// user data base object
const userSchema = new Schema<IUser>({
  username: { type: String, maxLength: 255, unique: true, index: true },
  sessions: [sessionSchema]
});

// user mongoose model
export const UserModel = mongoose.model<IUser>('User', userSchema);
