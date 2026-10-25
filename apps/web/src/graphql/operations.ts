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
    editedAt
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

export const ME = gql`
  query Me {
    me {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const CHANNELS = gql`
  query Channels {
    channels {
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
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      ...MessageFields
    }
  }
  ${MESSAGE_FIELDS}
`;

export const DELETE_MESSAGE = gql`
  mutation DeleteMessage($id: ID!) {
    deleteMessage(id: $id) {
      id
      channelId
    }
  }
`;

export const MARK_CHANNEL_READ = gql`
  mutation MarkChannelRead($channelId: ID!, $lastMessageId: ID) {
    markChannelRead(channelId: $channelId, lastMessageId: $lastMessageId) {
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
