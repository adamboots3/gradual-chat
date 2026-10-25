import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const channelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['channel', 'dm'], default: 'channel' },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

channelSchema.index({ memberIds: 1 });

export type ChannelAttributes = InferSchemaType<typeof channelSchema>;
export type ChannelDocument = HydratedDocument<ChannelAttributes>;

export const Channel: Model<ChannelAttributes> =
  (models.Channel as Model<ChannelAttributes>) ??
  model<ChannelAttributes>('Channel', channelSchema);
