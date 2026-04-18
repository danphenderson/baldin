import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConnectionStatusBanner from '@/component/connection-status-banner';

describe('ConnectionStatusBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when status is connected and no prior disconnection', () => {
    const { container } = render(<ConnectionStatusBanner status="connected" />);
    expect(container.textContent).toBe('');
  });

  it('renders an offline indicator when disconnected', () => {
    render(<ConnectionStatusBanner status="disconnected" />);
    expect(screen.getByTestId('connection-status-disconnected')).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('renders a reconnecting indicator when connecting', () => {
    render(<ConnectionStatusBanner status="connecting" />);
    expect(screen.getByTestId('connection-status-connecting')).toBeInTheDocument();
    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
  });

  it('briefly shows a connected chip after reconnecting then hides it', () => {
    const { rerender } = render(<ConnectionStatusBanner status="disconnected" />);
    expect(screen.getByTestId('connection-status-disconnected')).toBeInTheDocument();

    rerender(<ConnectionStatusBanner status="connected" />);
    expect(screen.getByTestId('connection-status-connected')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2000); });

    expect(screen.queryByTestId('connection-status-connected')).not.toBeInTheDocument();
  });

  it('hides the reconnected chip when status changes back to disconnected before timeout', () => {
    const { rerender } = render(<ConnectionStatusBanner status="disconnected" />);

    rerender(<ConnectionStatusBanner status="connected" />);
    expect(screen.getByTestId('connection-status-connected')).toBeInTheDocument();

    rerender(<ConnectionStatusBanner status="disconnected" />);
    expect(screen.getByTestId('connection-status-disconnected')).toBeInTheDocument();
    expect(screen.queryByTestId('connection-status-connected')).not.toBeInTheDocument();
  });
});
