// A pushable async queue: push() enqueues a value, and the async iterator
// yields values in order, waiting indefinitely for the next push rather than
// completing. Lets an HTTP request (push) feed a long-lived generator that a
// separate consumer (query()'s streaming input) is iterating.
export function createAsyncQueue() {
  const buffer = [];
  let waiting = null;

  return {
    push(value) {
      if (waiting) {
        const resolve = waiting;
        waiting = null;
        resolve(value);
      } else {
        buffer.push(value);
      }
    },
    async *[Symbol.asyncIterator]() {
      while (true) {
        if (buffer.length > 0) {
          yield buffer.shift();
        } else {
          yield await new Promise((resolve) => {
            waiting = resolve;
          });
        }
      }
    },
  };
}
