import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type AnalyticsEventType =
  | 'wishlist_created'
  | 'wishlist_viewed'
  | 'gift_booked'
  | 'affiliate_clicked'
  | 'jar_clicked'
  | 'instagram_dm_copied'
  | 'ai_assistant_used'
  | 'growth_loop_clicked'
  | 'gift_purchased_elsewhere';

export interface IAnalyticsEventMetadata {
  segment?: 'mass_b2c' | 'creator_bio';
  themePreset?: 'rose_luxury' | 'cyber_titanium';
  priceUah?: number;
  itemType?: 'affiliate' | 'instagram_shop' | 'regular';
  merchantDomain?: string;
  estimatedCpaRate?: number;
  shopHandle?: string;
  budgetTier?: 'up_to_1000' | 'around_1500' | 'vip';
  clickSource?: 'post_booking_modal' | 'card_button' | 'owner_jar_payout';
  utmSource?: 'ig_bio' | 'tg_chat' | 'direct';
  fromGrowthLoop?: boolean;
  isAiSurprise?: boolean;
  isUniqueForWishlist?: boolean;
  jarGoalUah?: number;
  jarCurrentUah?: number;
  jarDeltaSyncedUah?: number;
  isFlowerPreferenceCard?: boolean;
  convertedToSurpriseBooking?: boolean;
  creatorCohortId?: string;
  sourceWishlistId?: string;
}

export interface IAnalyticsEvent extends Document {
  eventType: AnalyticsEventType;
  wishlistId?: mongoose.Types.ObjectId;
  wishlistSlug?: string;
  itemId?: mongoose.Types.ObjectId;
  visitorHash?: string; // SHA-256(IP + UA + YYYY-MM) — жодних персональних даних
  metadata: IAnalyticsEventMetadata;
  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        'wishlist_created',
        'wishlist_viewed',
        'gift_booked',
        'affiliate_clicked',
        'jar_clicked',
        'instagram_dm_copied',
        'ai_assistant_used',
        'growth_loop_clicked',
      ],
      index: true,
    },
    wishlistId: {
      type: Schema.Types.ObjectId,
      ref: 'Wishlist',
      index: true,
    },
    wishlistSlug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'GiftItem',
    },
    visitorHash: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AnalyticsEventSchema.index({ eventType: 1, createdAt: -1 });
AnalyticsEventSchema.index({ wishlistId: 1, eventType: 1, createdAt: -1 });
AnalyticsEventSchema.index({ wishlistSlug: 1, eventType: 1, visitorHash: 1 });

const AnalyticsEvent: Model<IAnalyticsEvent> =
  mongoose.models.AnalyticsEvent ||
  mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);

export default AnalyticsEvent;
