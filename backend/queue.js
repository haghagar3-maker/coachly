// queue.js — Groq request queue
// All Groq calls go through here. Max 10s wait. 300ms stagger between requests.
// This prevents rate-limit crashes when many users hit Groq simultaneously.

const queue = [];
let processing = false;

async function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject, queued: Date.now() });
    if (!processing) processQueue();
  });
}

async function processQueue() {
  processing = true;
  while (queue.length > 0) {
    const { fn, resolve, reject, queued } = queue.shift();

    if (Date.now() - queued > 10000) {
      reject(new Error('Queue timeout — please try again in a moment'));
      continue;
    }

    try {
      resolve(await fn());
    } catch (e) {
      reject(e);
    }

    // 300ms stagger so concurrent users never fire Groq simultaneously
    await new Promise(r => setTimeout(r, 300));
  }
  processing = false;
}

function getQueueLength() {
  return queue.length;
}

module.exports = { enqueue, getQueueLength };
