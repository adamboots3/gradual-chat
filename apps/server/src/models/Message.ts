import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const messageSchema = new Schema(
  {
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    /** Quote reply target — a self reference so previews stay one query away. */
    replyToId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    mentionIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Cursor pagination walks the natural `_id` order inside one channel.
messageSchema.index({ channelId: 1, _id: -1 });
messageSchema.index({ channelId: 1, createdAt: -1 });

export type MessageAttributes = InferSchemaType<typeof messageSchema>;
export type MessageDocument = HydratedDocument<MessageAttributes>;

export const Message: Model<MessageAttributes> =
  (models.Message as Model<MessageAttributes>) ??
  model<MessageAttributes>('Message', messageSchema);
