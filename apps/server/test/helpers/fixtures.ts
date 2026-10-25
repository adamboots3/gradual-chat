import { Types } from 'mongoose';
import { hashPassword } from '../../src/services/passwords';
import { Channel } from '../../src/models/Channel';
import { ReadState } from '../../src/models/ReadState';
import { User, type UserDocument } from '../../src/models/User';

export const TEST_PASSWORD = 'password123';

export interface Fixture {
  jenny: UserDocument;
  devon: UserDocument;
  grace: UserDocument;
  channelId: string;
  otherChannelId: string;
}

/**
 * Two channels:
 *  - "share" with jenny + devon + grace
 *  - "other" with jenny only
 */
export async function createFixture(): Promise<Fixture> {
  const passwordHash = await hashPassword(TEST_PASSWORD);

  const [jenny, devon, grace] = await User.create([
    {
      name: 'Jenny White',
      username: 'jenny',
      email: 'jenny@test.dev',
      passwordHash,
      avatarColor: '#7FD8BD',
    },
    {
      name: 'Devon Lane',
      username: 'devon',
      email: 'devon@test.dev',
      passwordHash,
      avatarColor: '#F2B8A2',
    },
    {
      name: 'Grace Lin',
      username: 'grace',
      email: 'grace@test.dev',
      passwordHash,
      avatarColor: '#A8E6D8',
    },
  ]);

  const share = await Channel.create({
    name: 'Share your story',
    slug: 'share',
    type: 'channel',
    memberIds: [jenny._id, devon._id, grace._id],
  });
  const other = await Channel.create({
    name: 'Other',
    slug: 'other',
    type: 'channel',
    memberIds: [jenny._id],
  });

  for (const channel of [share, other]) {
    for (const memberId of channel.memberIds) {
      await ReadState.create({ channelId: channel._id, userId: memberId });
    }
  }

  return {
    jenny,
    devon,
    grace,
    channelId: String(share._id),
    otherChannelId: String(other._id),
  };
}

export function objectId(): string {
  return new Types.ObjectId().toHexString();
}
