import mongoose, { Document, Schema } from 'mongoose';
import { AssetType } from './PriceAlert';

export interface IMarketPriceCache extends Document {
  symbol: string;
  assetType: AssetType;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  currency: string;
  source: 'TWELVE_DATA' | 'GOLD_API' | 'FALLBACK';
  updatedAt: Date;
}

const MarketPriceCacheSchema = new Schema<IMarketPriceCache>(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    assetType: {
      type: String,
      enum: ['STOCK', 'GOLD', 'SILVER'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    change: {
      type: Number,
      default: 0
    },
    percentChange: {
      type: Number,
      default: 0
    },
    high: {
      type: Number,
      default: 0
    },
    low: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    source: {
      type: String,
      enum: ['TWELVE_DATA', 'GOLD_API', 'FALLBACK'],
      default: 'FALLBACK'
    }
  },
  {
    timestamps: true
  }
);

export const MarketPriceCache = mongoose.model<IMarketPriceCache>(
  'MarketPriceCache',
  MarketPriceCacheSchema
);
