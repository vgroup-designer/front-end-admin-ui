import { createInterface } from 'node:readline/promises';
import { startAgentQuery } from './agent.js';

function printMessage(message) {
  if (message.type === 'assistant') {
    for (const block of message.message.content) {
      if (block.type === 'text') {
        process.stdout.write(block.text + '\n');
      } else if (block.type === 'tool_use') {
        console.log(`\n[tool] ${block.name}(${JSON.stringify(block.input)})`);
      }
    }
  } else if (message.type === 'result') {
    if (message.is_error) {
      console.error(`\n[error] ${message.result}`);
      process.exitCode = 1;
    } else {
      console.log(`\n[done] ${message.num_turns} turn(s), $${message.total_cost_usd.toFixed(4)}`);
    }
  }
}

async function runOnce(prompt) {
  for await (const message of startAgentQuery(prompt)) {
    printMessage(message);
  }
}

// Streaming-input generator for the REPL: query() pulls the next user
// message from this each time it needs one, keeping a single session open
// across turns. Iterates rl's own async iterator rather than calling
// rl.question() repeatedly — question() attaches its 'line' listener only
// after being called, so a line arriving between calls (e.g. piped input
// delivered back-to-back) fires with no listener attached and is lost.
// The async iterator queues lines internally and never drops one.
async function* readUserMessages(rl) {
  process.stdout.write('> ');

  for await (const line of rl) {
    const trimmed = line.trim();

    if (trimmed === 'exit' || trimmed === 'quit') {
      // The CLI subprocess waits on bidirectional traffic rather than plain
      // EOF once an MCP server is registered, so it won't exit on its own
      // when this generator ends. Exiting here is safe: the SDK tears the
      // child process down via its own process 'exit' handler.
      process.exit(0);
    }

    if (trimmed) {
      yield {
        type: 'user',
        message: { role: 'user', content: trimmed },
        parent_tool_use_id: null,
      };
    }

    process.stdout.write('> ');
  }
}

async function runRepl() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('Shopify ops agent. Type "exit" or "quit" to leave.\n');

  for await (const message of startAgentQuery(readUserMessages(rl))) {
    printMessage(message);
  }
}

const prompt = process.argv.slice(2).join(' ').trim();

if (prompt) {
  await runOnce(prompt);
} else {
  await runRepl();
}
