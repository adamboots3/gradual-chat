import { gql } from '@apollo/client';

export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    name
    username
    avatarColor
    title
  }
`;

export const MESSAGE_FIELDS = gql`
  fragment MessageFields on Message {
    id
    channelId
    body
    createdAt
    author {
      ...UserFields
    }
    mentions {
      ...UserFields
    }
    replyTo {
      id
      body
      createdAt
      author {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const CHANNEL_FIELDS = gql`
  fragment ChannelFields on Channel {
    id
    name
    slug
    type
    memberCount
    unreadCount
    members {
      ...UserFields
    }
    lastMessage {
      id
      body
      createdAt
      author {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const USER = gql`
  query User($id: ID!) {
    user(id: $id) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const CHANNELS = gql`
  query Channels($userId: ID!) {
    channels(userId: $userId) {
      ...ChannelFields
    }
  }
  ${CHANNEL_FIELDS}
`;

export const MESSAGES = gql`
  query Messages($channelId: ID!, $cursor: String) {
    messages(channelId: $channelId, cursor: $cursor, limit: 50) {
      messages {
        ...MessageFields
      }
      nextCursor
    }
  }
  ${MESSAGE_FIELDS}
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($input: SendMessageInput!, $userId: ID!) {
    sendMessage(input: $input, userId: $userId) {
      ...MessageFields
    }
  }
  ${MESSAGE_FIELDS}
`;

export const MARK_CHANNEL_READ = gql`
  mutation MarkChannelRead($channelId: ID!, $userId: ID!, $lastMessageId: ID) {
    markChannelRead(channelId: $channelId, userId: $userId, lastMessageId: $lastMessageId) {
      id
      unreadCount
    }
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!) {
    users(query: $query) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
