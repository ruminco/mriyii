import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { ThemePreset } from '@/models/User';

export interface IWishlist extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  slug: string;
  title: string;
  themePreset: ThemePreset;
  flowerAndGiftNotes?: string;
  eventDate?: Date;
  isSurpriseActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WishlistSchema = new Schema<IWishlist>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    themePreset: {
      type: String,
      enum: ['rose_luxury', 'cyber_titanium'],
      required: true,
      default: 'rose_luxury',
    },
    flowerAndGiftNotes: {
      type: String,
      trim: true,
      maxlength: 600,
    },
    eventDate: {
      type: Date,
    },
    isSurpriseActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Wishlist: Model<IWishlist> =
  (mongoose.models.Wishlist as Model<IWishlist>) ||
  mongoose.model<IWishlist>('Wishlist', WishlistSchema);

export default Wishlist;
