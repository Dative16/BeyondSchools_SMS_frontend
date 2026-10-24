import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library tears itself down through a global `afterEach`, which only
// exists when vitest runs with `globals: true`. It does not here, so without
// this every test renders on top of the last one and "found multiple elements"
// becomes the normal failure.
afterEach(cleanup);
