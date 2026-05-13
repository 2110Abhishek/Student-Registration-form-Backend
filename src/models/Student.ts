import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  encryptedData: string; // Store 2-level encrypted student data (excluding password)
  passwordHash: string;  // Separately store hashed password for security
  email: string;         // Store email separately for unique index and login lookup
}

const StudentSchema: Schema = new Schema(
  {
    encryptedData: { type: String, required: true },
    passwordHash: { type: String, required: true },
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<IStudent>('Student', StudentSchema);
