import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/Vite \+ React/i)).toBeInTheDocument();
  });

  it('shows initial count of 0', () => {
    render(<App />);
    expect(screen.getByText(/count is 0/i)).toBeInTheDocument();
  });

  it('increments count when button is clicked', async () => {
    const { user } = render(<App />);
    const button = screen.getByRole('button', { name: /count is 0/i });

    await user.click(button);
    expect(screen.getByText(/count is 1/i)).toBeInTheDocument();
  });
});
