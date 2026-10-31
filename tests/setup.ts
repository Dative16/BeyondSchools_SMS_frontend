import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library tears itself down through a global `afterEach`, which only
// exists when vitest runs with `globals: true`. It does not here, so without
// this every test renders on top of the last one and "found multiple elements"
// becomes the normal failure.
afterEach(cleanup);

/**
 * jsdom implements `<dialog>` the element but not `showModal` or `close`, so
 * any component built on the browser's own modal throws the moment a test
 * opens it. Every dialog in this app is built that way on purpose — the focus
 * trap, Escape and the top layer are the browser's problem rather than ours —
 * which until now meant none of them could be opened in a test at all.
 *
 * This is the smallest stand-in that makes them testable: it tracks `open` and
 * fires `close`, which is what the components react to. It is not a faithful
 * modal: nothing here traps focus or makes the background inert, so a test
 * must not use it to assert either of those.
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, value?: string) {
    this.open = false;
    if (value !== undefined) this.returnValue = value;
    this.dispatchEvent(new Event('close'));
  };
}
