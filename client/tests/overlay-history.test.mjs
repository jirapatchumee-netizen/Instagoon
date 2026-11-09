import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOverlayStack } from '../player/overlay-history.ts';

// Session history where back() is async, like the browser: the pop lands after the current task.
function fakeHistory() {
  const entries = ['base'];
  let index = 0;
  const queued = [];
  let stack;
  return {
    entries,
    get index() {
      return index;
    },
    pushState() {
      entries.splice(index + 1);
      entries.push('overlay');
      index += 1;
    },
    back() {
      queued.push(true);
    },
    userBack() {
      index -= 1;
      stack.onPopState();
    },
    flush() {
      while (queued.shift()) {
        index -= 1;
        stack.onPopState();
      }
    },
    attach(s) {
      stack = s;
    },
  };
}

function setup() {
  const history = fakeHistory();
  const stack = createOverlayStack(history);
  history.attach(stack);
  return { history, stack };
}

test('device back closes only the top overlay', () => {
  const { history, stack } = setup();
  const closed = [];
  stack.open(() => closed.push('profile'));
  stack.open(() => closed.push('chat'));
  history.userBack();
  assert.deepEqual(closed, ['chat']);
  assert.equal(stack.depth, 1);
  assert.equal(history.index, 1);
});

test('closing from the UI consumes its entry without closing anything else', () => {
  const { history, stack } = setup();
  const closed = [];
  stack.open(() => closed.push('profile'));
  const disposeChat = stack.open(() => closed.push('chat'));
  disposeChat();
  history.flush();
  assert.deepEqual(closed, []);
  assert.equal(stack.depth, 1);
  assert.equal(history.index, 1);
});

test('story reply: closing the story and opening the DM in one tick keeps entries and overlays in step', () => {
  const { history, stack } = setup();
  const closed = [];
  const disposeStory = stack.open(() => closed.push('story'));
  disposeStory();
  stack.open(() => closed.push('chat'));
  history.flush();
  assert.equal(stack.depth, 1);
  assert.equal(history.index, 1);
  history.userBack();
  assert.deepEqual(closed, ['chat']);
  assert.equal(history.index, 0);
});

test('dispose after a back-button close is a no-op', () => {
  const { history, stack } = setup();
  const dispose = stack.open(() => {});
  history.userBack();
  dispose();
  history.flush();
  assert.equal(stack.depth, 0);
  assert.equal(history.index, 0);
});

test('back with no overlay open does nothing', () => {
  const { stack } = setup();
  assert.doesNotThrow(() => stack.onPopState());
  assert.equal(stack.depth, 0);
});
