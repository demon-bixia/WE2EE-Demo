import mongoose, { Schema, Types } from 'mongoose';


// **** Types **** //

export interface Session {
  _id: Types.ObjectId;
}

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  password: string;
  IDK?: string;
  SPK?: string;
  preKeys: string[];
  sessions: Session[];
};


// **** Variables **** //

// Schema
const userSchema = new Schema<IUser>({
  username: { type: String, maxLength: 255, unique: true, index: true },
  password: String,
  IDK: String,
  SPK: String,
  preKeys: [String],
  sessions: [],
});


// Test if object is user
export function isUser(arg: any): boolean {

  return (
    !!arg &&
      typeof arg === 'object' &&
      'username' in arg && typeof arg.username === 'string' &&
      'IDK' in arg ? (typeof arg.IDK === 'string' || arg.IDK === null) : true &&
        'SPK' in arg ? (typeof arg.SPK === 'string' || arg.SPK === null) : true &&
          'preKeys' in arg ? Array.isArray(arg.preKeys) : true &&
            'sessions' in arg ? Array.isArray(arg.sessions) : true
  );
}


// **** Export default **** //

export default mongoose.model<IUser>('User', userSchema);
