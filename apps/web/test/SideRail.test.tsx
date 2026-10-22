import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SideRail } from '../src/components/SideRail';

describe('SideRail', () => {
  it('renders the navigation groups', () => {
    render(<SideRail unreadTotal={0} />);

    for (const label of ['Forum', 'Chat', 'Matches', 'Members', 'Contributors']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('Engage')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
  });

  it('shows the total unread badge on the chat entry', () => {
    render(<SideRail unreadTotal={8} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('hides the badge when everything is read', () => {
    const { container } = render(<SideRail unreadTotal={0} />);
    expect(container.querySelector('.bg-badge')).toBeNull();
  });

  it('marks Chat as the active view', () => {
    render(<SideRail unreadTotal={3} />);
    const chat = screen.getByText('Chat').closest('button');
    expect(chat).toHaveAttribute('aria-current', 'page');
  });
});
