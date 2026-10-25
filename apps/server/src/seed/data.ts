export const DEMO_PASSWORD = 'password123';

export interface SeedUser {
  name: string;
  username: string;
  email: string;
  avatarColor: string;
  title: string;
}

export const seedUsers: SeedUser[] = [
  {
    name: 'Jenny White',
    username: 'jenny',
    email: 'jenny@gradual.com',
    avatarColor: '#7FD8BD',
    title: 'Community Manager',
  },
  {
    name: 'Devon Lane',
    username: 'devon',
    email: 'devon@gradual.com',
    avatarColor: '#F2B8A2',
    title: 'Product Designer',
  },
  {
    name: 'Jerry White',
    username: 'jerry',
    email: 'jerry@gradual.com',
    avatarColor: '#A8B4F8',
    title: 'Design Lead',
  },
  {
    name: 'Allen Wei',
    username: 'allen',
    email: 'allen@gradual.com',
    avatarColor: '#F5D06F',
    title: 'Frontend Engineer',
  },
  {
    name: 'Tim Chen',
    username: 'tim',
    email: 'tim@gradual.com',
    avatarColor: '#9BD3F5',
    title: 'Backend Engineer',
  },
  {
    name: 'Courtney Henry',
    username: 'courtney',
    email: 'courtney@gradual.com',
    avatarColor: '#F5A8C0',
    title: 'Community Lead',
  },
  {
    name: 'Albert Flores',
    username: 'albert',
    email: 'albert@gradual.com',
    avatarColor: '#B6E3A8',
    title: 'Partnerships',
  },
  {
    name: 'Darlene Robertson',
    username: 'darlene',
    email: 'darlene@gradual.com',
    avatarColor: '#D8B4F8',
    title: 'Content Strategist',
  },
  {
    name: 'Eric Yao',
    username: 'eric',
    email: 'eric@gradual.com',
    avatarColor: '#F8C8A8',
    title: 'Designer',
  },
  {
    name: 'Grace Lin',
    username: 'grace',
    email: 'grace@gradual.com',
    avatarColor: '#A8E6D8',
    title: 'Product Manager',
  },
  {
    name: 'Lynne Park',
    username: 'lynne',
    email: 'lynne@gradual.com',
    avatarColor: '#C5C8F8',
    title: 'Marketing',
  },
  {
    name: 'Darrell Steward',
    username: 'darrell',
    email: 'darrell@gradual.com',
    avatarColor: '#F5B8B8',
    title: 'CTO @Apple',
  },
];

export interface SeedChannel {
  name: string;
  slug: string;
  type: 'channel' | 'dm';
  members: string[];
  order: number;
  /** Messages newer than this many minutes are unread for every member. */
  readBeforeMinutesAgo: number;
}

export const seedChannels: SeedChannel[] = [
  {
    name: 'Announcements',
    slug: 'announcements',
    type: 'channel',
    members: ['jenny', 'jerry', 'allen', 'tim', 'grace', 'courtney', 'eric', 'devon'],
    order: 1,
    readBeforeMinutesAgo: 39,
  },
  {
    name: 'Share your story',
    slug: 'share-your-story',
    type: 'channel',
    members: ['jenny', 'devon', 'allen', 'grace'],
    order: 2,
    readBeforeMinutesAgo: 0,
  },
  {
    name: 'General',
    slug: 'general',
    type: 'channel',
    members: ['jenny', 'tim', 'allen', 'courtney', 'albert', 'darlene'],
    order: 3,
    readBeforeMinutesAgo: 51,
  },
  {
    name: 'Courtney Henry',
    slug: 'dm-courtney',
    type: 'dm',
    members: ['jenny', 'courtney'],
    order: 4,
    readBeforeMinutesAgo: 0,
  },
  {
    name: 'Albert Flores',
    slug: 'dm-albert',
    type: 'dm',
    members: ['jenny', 'albert'],
    order: 5,
    readBeforeMinutesAgo: 60,
  },
  {
    name: 'Darlene Robertson',
    slug: 'dm-darlene',
    type: 'dm',
    members: ['jenny', 'darlene'],
    order: 6,
    readBeforeMinutesAgo: 0,
  },
  {
    name: 'Design product',
    slug: 'design-product',
    type: 'channel',
    members: ['jenny', 'eric', 'allen', 'grace'],
    order: 7,
    readBeforeMinutesAgo: 65,
  },
  {
    name: 'Product team',
    slug: 'product-team',
    type: 'channel',
    members: ['jenny', 'grace', 'lynne', 'devon'],
    order: 8,
    readBeforeMinutesAgo: 21,
  },
];

export interface SeedMessage {
  channelSlug: string;
  author: string;
  body: string;
  minutesAgo: number;
  /** Index (within the same channel) of the message this one quotes. */
  replyToIndex?: number;
}

export const seedMessages: SeedMessage[] = [
  // Announcements — last three are unread, one of them mentions @jenny
  {
    channelSlug: 'announcements',
    author: 'jerry',
    body: '[File] Design Guideline.pdf',
    minutesAgo: 42,
  },
  {
    channelSlug: 'announcements',
    author: 'jerry',
    body: '@jenny the new guideline is live, could you take a look?',
    minutesAgo: 38,
  },
  {
    channelSlug: 'announcements',
    author: 'allen',
    body: 'Rolling out the updated onboarding flow today 🚀',
    minutesAgo: 36,
  },
  {
    channelSlug: 'announcements',
    author: 'jerry',
    body: 'Weekly sync moved to Thursday 10:00 — same room.',
    minutesAgo: 34,
  },

  // Share your story — mirrors the designs, ends with a quote reply
  {
    channelSlug: 'share-your-story',
    author: 'jenny',
    body: 'If you want to learn from community builders & spur ideas from how others run virtual events, check out Vanilla Forums (11/17 - 11/18/20) for free.',
    minutesAgo: 32,
  },
  {
    channelSlug: 'share-your-story',
    author: 'devon',
    body: 'Check out Vanilla Forums (11/17 - 11/18/20) for free.',
    minutesAgo: 31,
  },
  {
    channelSlug: 'share-your-story',
    author: 'jenny',
    body: 'I will take a look in case it’s useful for us.',
    minutesAgo: 30,
  },
  {
    channelSlug: 'share-your-story',
    author: 'jenny',
    body: 'Many thanks!',
    minutesAgo: 29,
    replyToIndex: 1,
  },

  // General — two unread
  {
    channelSlug: 'general',
    author: 'tim',
    body: 'If you want to learn more about the community program, ping me.',
    minutesAgo: 55,
  },
  {
    channelSlug: 'general',
    author: 'courtney',
    body: 'So, what’s your plan this weekend?',
    minutesAgo: 52,
  },
  {
    channelSlug: 'general',
    author: 'albert',
    body: 'What’s the progress on that task?',
    minutesAgo: 50,
  },
  { channelSlug: 'general', author: 'darlene', body: 'Yeah! You’re right.', minutesAgo: 48 },

  // Direct messages
  {
    channelSlug: 'dm-courtney',
    author: 'courtney',
    body: 'So, what’s your plan this weekend?',
    minutesAgo: 52,
  },
  {
    channelSlug: 'dm-courtney',
    author: 'jenny',
    body: 'Nothing fancy — probably a long hike 🥾',
    minutesAgo: 51,
  },
  {
    channelSlug: 'dm-albert',
    author: 'albert',
    body: 'What’s the progress on that task?',
    minutesAgo: 50,
  },
  { channelSlug: 'dm-darlene', author: 'darlene', body: 'Yeah! You’re right.', minutesAgo: 48 },

  // Design product — all read
  { channelSlug: 'design-product', author: 'eric', body: 'Yeah I know 😀', minutesAgo: 70 },
  {
    channelSlug: 'design-product',
    author: 'eric',
    body: 'Shall we ship the new empty state this week?',
    minutesAgo: 68,
  },
  {
    channelSlug: 'design-product',
    author: 'grace',
    body: 'I’ll prepare the specs first thing tomorrow.',
    minutesAgo: 66,
  },

  // Product team — two unread, one mentions @lynne
  {
    channelSlug: 'product-team',
    author: 'grace',
    body: '@lynne have time to huddle?',
    minutesAgo: 20,
  },
  {
    channelSlug: 'product-team',
    author: 'lynne',
    body: 'Sure — give me 10 minutes.',
    minutesAgo: 18,
  },
];
