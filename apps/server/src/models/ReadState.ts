import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';

/**
 * Per-user, per-channel read cursor. `unreadCount` is denormalised on purpose:
 * the channel list must never scan the message collection to render a badge.
 */
const readStateSchema = new Schema(
  {
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastReadAt: { type: Date, default: () => new Date(0) },
    lastReadMessageId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    unreadCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

readStateSchema.index({ channelId: 1, userId: 1 }, { unique: true });
readStateSchema.index({ userId: 1 });

export type ReadStateAttributes = InferSchemaType<typeof readStateSchema>;
export type ReadStateDocument = HydratedDocument<ReadStateAttributes>;

export const ReadState: Model<ReadStateAttributes> =
  (models.ReadState as Model<ReadStateAttributes>) ??
  model<ReadStateAttributes>('ReadState', readStateSchema);
