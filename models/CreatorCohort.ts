import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type CreatorCohortStatus =
  | 'invited'
  | 'showcase_ready'
  | 'placed_in_bio'
  | 'validated_gift_received'
  | 'churned_14d';

export interface ICreatorCohort extends Document {
  instagramHandle: string; // напр. "@alina.luxury.kyiv"
  followersCount: number; // напр. 24500
  niche: string; // "IT-Girl / Lifestyle", "Model", "Streamer"
  wishlistId?: mongoose.Types.ObjectId;
  wishlistSlug: string; // напр. "alina-luxury"
  status: CreatorCohortStatus;
  invitedAt: Date;
  placedInBioAt?: Date;
  firstGiftAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CreatorCohortSchema = new Schema<ICreatorCohort>(
  {
    instagramHandle: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    followersCount: {
      type: Number,
      required: true,
      min: 0,
      default: 5000,
    },
    niche: {
      type: String,
      required: true,
      trim: true,
      default: 'Lifestyle / IT-Girl',
    },
    wishlistId: {
      type: Schema.Types.ObjectId,
      ref: 'Wishlist',
      index: true,
    },
    wishlistSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'invited',
        'showcase_ready',
        'placed_in_bio',
        'validated_gift_received',
        'churned_14d',
      ],
      default: 'showcase_ready',
      index: true,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    placedInBioAt: {
      type: Date,
    },
    firstGiftAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

const CreatorCohort: Model<ICreatorCohort> =
  mongoose.models.CreatorCohort ||
  mongoose.model<ICreatorCohort>('CreatorCohort', CreatorCohortSchema);

export default CreatorCohort;
