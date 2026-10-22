import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../src/components/LoginPage';
import { LOGIN } from '../src/graphql/operations';

const loginMock = {
  request: {
    query: LOGIN,
    variables: { email: 'jenny@gradual.com', password: 'password123' },
  },
  result: {
    data: {
      login: {
        __typename: 'AuthPayload',
        token: 'test-token',
        user: {
          __typename: 'User',
          id: 'u1',
          name: 'Jenny White',
          username: 'jenny',
          avatarColor: '#7FD8BD',
          title: 'Community Manager',
        },
      },
    },
  },
};

const failedLoginMock = {
  request: {
    query: LOGIN,
    variables: { email: 'jenny@gradual.com', password: 'password123' },
  },
  error: new Error('Invalid email or password.'),
};

describe('LoginPage', () => {
  it('prefills the first demo account and lists the others', () => {
    render(
      <MockedProvider mocks={[]}>
        <LoginPage onAuthenticated={vi.fn()} />
      </MockedProvider>,
    );

    expect(screen.getByLabelText('Email')).toHaveValue('jenny@gradual.com');
    expect(screen.getByText('Devon Lane')).toBeInTheDocument();
    expect(screen.getByText('Jerry White')).toBeInTheDocument();
    expect(screen.getByText(/password for every demo account/i)).toBeInTheDocument();
  });

  it('switches the form to another demo account', async () => {
    render(
      <MockedProvider mocks={[]}>
        <LoginPage onAuthenticated={vi.fn()} />
      </MockedProvider>,
    );

    await userEvent.click(screen.getByText('Devon Lane'));
    expect(screen.getByLabelText('Email')).toHaveValue('devon@gradual.com');
  });

  it('returns the token on a successful sign in', async () => {
    const onAuthenticated = vi.fn();
    render(
      <MockedProvider mocks={[loginMock]}>
        <LoginPage onAuthenticated={onAuthenticated} />
      </MockedProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith('test-token'));
  });

  it('surfaces an error message and stays on the form', async () => {
    const onAuthenticated = vi.fn();
    render(
      <MockedProvider mocks={[failedLoginMock]}>
        <LoginPage onAuthenticated={onAuthenticated} />
      </MockedProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Invalid email or password/);
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});
