import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.stubEnv('VITE_API_URL', import.meta.env.VITE_API_URL || 'https://api.test');
