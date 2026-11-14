import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IGiftItem extends Document {
  _id: Types.ObjectId;
  wishlistId: Types.ObjectId;
  title: string;
  emoji?: string;
  description?: string;
  price?: number;
  currency: string;
  imageUrl?: string;
  originalUrl?: string;
  affiliateUrl?: string;
  instagramHandle?: string;
  isBooked: boolean;
  bookedByName?: string;
  bookedByEmail?: string;
  bookingToken?: string;
  bookedByFingerprint?: string;
  monoJarUrl?: string;
  monoJarId?: string;
  jarTargetAmount?: number;
  jarCurrentAmount?: number;
  jarLastSyncedAt?: Date;
  isAiSurprise: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Поля, які СУВОРО виключаються на рівні запиту Mongoose при перегляді власником у Сюрприз-режимі.
 */
export const SURPRISE_MODE_EXCLUDED_FIELDS =
  '-bookedByName -bookedByEmail -bookingToken -bookedByFingerprint -jarCurrentAmount -jarLastSyncedAt' as const;

const GiftItemSchema = new Schema<IGiftItem>(
  {
    wishlistId: {
      type: Schema.Types.ObjectId,
      ref: 'Wishlist',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    emoji: {
      type: String,
      trim: true,
      default: '✨',
      maxlength: 12,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    price: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'UAH',
      uppercase: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    originalUrl: {
      type: String,
      trim: true,
    },
    affiliateUrl: {
      type: String,
      trim: true,
    },
    instagramHandle: {
      type: String,
      trim: true,
    },
    isBooked: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    bookedByName: {
      type: String,
      trim: true,
    },
    bookedByEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    bookingToken: {
      type: String,
      index: true,
    },
    bookedByFingerprint: {
      type: String,
      index: true,
    },
    monoJarUrl: {
      type: String,
      trim: true,
    },
    monoJarId: {
      type: String,
      trim: true,
    },
    jarTargetAmount: {
      type: Number,
      min: 0,
    },
    jarCurrentAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    jarLastSyncedAt: {
      type: Date,
    },
    isAiSurprise: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Складені індекси для швидкої вибірки подарунків вішліста, анти-тролінгу та атомарного бронювання
GiftItemSchema.index({ wishlistId: 1, isAiSurprise: 1 });
GiftItemSchema.index({ wishlistId: 1, isBooked: 1, bookedByEmail: 1 });
GiftItemSchema.index({ wishlistId: 1, isBooked: 1, bookedByFingerprint: 1 });
GiftItemSchema.index({ _id: 1, isBooked: 1 });

export const GiftItem: Model<IGiftItem> =
  (mongoose.models.GiftItem as Model<IGiftItem>) ||
  mongoose.model<IGiftItem>('GiftItem', GiftItemSchema);

export default GiftItem;
