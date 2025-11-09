import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * MSW Browser Worker for intercepting API calls in demo mode
 * This worker runs in the browser and intercepts fetch/XHR requests
 */
export const worker = setupWorker(...handlers);

/**
 * Start the MSW worker with quiet logging
 */
export async function startMockServiceWorker(): Promise<void> {
  await worker.start({
    onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
    quiet: false, // Show MSW console messages for debugging
  });

  console.log('🎭 MSW: Mock Service Worker started in demo mode');
}

/**
 * Stop the MSW worker
 */
export function stopMockServiceWorker(): void {
  worker.stop();
  console.log('🎭 MSW: Mock Service Worker stopped');
}

/**
 * Reset all handlers to their initial state
 */
export function resetMockHandlers(): void {
  worker.resetHandlers();
  console.log('🎭 MSW: Handlers reset to initial state');
}
