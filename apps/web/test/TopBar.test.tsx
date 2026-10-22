import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from '../src/components/TopBar';
import type { User } from '../src/types';

const me: User = {
  id: 'u1',
  name: 'Jenny White',
  username: 'jenny',
  avatarColor: '#7FD8BD',
  title: 'Community Manager',
};

describe('TopBar', () => {
  it('shows the workspace name and search box', () => {
    render(<TopBar me={me} onSignOut={vi.fn()} />);

    expect(screen.getByText('Gradual Community')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByText('UTC-05:00 Chicago')).toBeInTheDocument();
  });

  it('opens the account menu and signs out', async () => {
    const onSignOut = vi.fn();
    render(<TopBar me={me} onSignOut={onSignOut} />);

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByText('@jenny · Community Manager')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('closes the menu when clicking outside', async () => {
    render(<TopBar me={me} onSignOut={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();

    await userEvent.click(document.body);
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
  });
});
