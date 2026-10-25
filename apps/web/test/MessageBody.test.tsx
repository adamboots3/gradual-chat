import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MessageBody } from '../src/components/MessageBody';

describe('MessageBody', () => {
  it('renders bold, italic, strike-through and inline code', () => {
    render(<MessageBody body="**bold** *italic* ~~gone~~ `code`" />);

    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('italic').tagName).toBe('EM');
    expect(screen.getByText('gone').tagName).toBe('DEL');
    expect(screen.getByText('code').tagName).toBe('CODE');
  });

  it('highlights a resolved mention', () => {
    render(<MessageBody body="hello @devon" mentions={[{ username: 'devon' }]} />);
    const mention = screen.getByText('@devon');
    expect(mention.tagName).toBe('SPAN');
    expect(mention.className).toContain('font-semibold');
  });

  it('leaves unknown handles as plain text', () => {
    render(<MessageBody body="hello @ghost" mentions={[{ username: 'devon' }]} />);
    expect(screen.queryByText('@ghost')?.tagName).not.toBe('SPAN');
  });

  it('renders bullet and numbered lists', () => {
    render(<MessageBody body={'- one\n- two'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('list').tagName).toBe('UL');
  });

  it('does not highlight unknown handles when the server resolved no mentions', () => {
    const { container } = render(<MessageBody body="hello @ghost" mentions={[]} />);
    expect(container.querySelector('.font-semibold')).toBeNull();
  });

  it('does not highlight a handle inside an email address', () => {
    const { container } = render(
      <MessageBody body="mail team@devon.com" mentions={[{ username: 'devon' }]} />,
    );
    expect(container.querySelector('.font-semibold')).toBeNull();
  });

  it('never injects raw markup', () => {
    render(<MessageBody body={'<img src=x onerror="alert(1)">'} />);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
  });
});
