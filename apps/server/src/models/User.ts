import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    /** Used by the UI to render the generated initials avatar. */
    avatarColor: { type: String, required: true, default: '#7FD8BD' },
    title: { type: String, default: '' },
  },
  { timestamps: true },
);

export type UserAttributes = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttributes>;

export const User: Model<UserAttributes> =
  (models.User as Model<UserAttributes>) ?? model<UserAttributes>('User', userSchema);
