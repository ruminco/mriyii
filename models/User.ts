import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type UserGender = 'female' | 'male';
export type ThemePreset = 'rose_luxury' | 'cyber_titanium';

export function resolveThemePresetByGender(gender?: UserGender): ThemePreset {
  return gender === 'male' ? 'cyber_titanium' : 'rose_luxury';
}

export interface IAiPreferences {
  hobbies: string[];
  flowerPreferences?: string;
  clothingSize?: string;
  shoeSize?: string;
  antiGifts: string[];
  notes?: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  firebaseUid: string;
  email: string;
  name?: string;
  image?: string;
  instagramHandle?: string;
  gender: UserGender;
  themePreset: ThemePreset;
  aiPreferences: IAiPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const AiPreferencesSchema = new Schema<IAiPreferences>(
  {
    hobbies: { type: [String], default: [] },
    flowerPreferences: { type: String, trim: true },
    clothingSize: { type: String, trim: true },
    shoeSize: { type: String, trim: true },
    antiGifts: { type: [String], default: [] },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    instagramHandle: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['female', 'male'],
      required: true,
      default: 'female',
    },
    themePreset: {
      type: String,
      enum: ['rose_luxury', 'cyber_titanium'],
      required: true,
      default: 'rose_luxury',
    },
    aiPreferences: {
      type: AiPreferencesSchema,
      default: () => ({ hobbies: [], antiGifts: [] }),
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

export default User;
