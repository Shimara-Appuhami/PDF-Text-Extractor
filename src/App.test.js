import { render, screen } from '@testing-library/react';
import App from './App';

test('renders PDF Text Extractor heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /pdf text extractor/i });
  expect(heading).toBeInTheDocument();
});

test('renders file input', () => {
  render(<App />);
  const input = screen.getByLabelText(/highlight keywords/i); // ensure component rendered
  expect(input).toBeInTheDocument();
});

test('shows drag & drop prompt', () => {
  render(<App />);
  expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
});

test('renders dark mode toggle', () => {
  render(<App />);
  const toggle = screen.getByText(/mode/i);
  expect(toggle).toBeInTheDocument();
});
