const log = document.getElementById('log');
const status = document.getElementById('status');
const form = document.getElementById('composer');
const input = document.getElementById('input');
const button = form.querySelector('button');

function appendMessage(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

function setBusy(busy) {
  input.disabled = busy;
  button.disabled = busy;
}

function handleMessage(message) {
  switch (message.type) {
    case 'system':
      if (message.subtype === 'init') {
        status.textContent = 'connected';
        status.className = 'status connected';
      }
      break;

    case 'user': {
      const content = message.message?.content;
      if (typeof content === 'string') {
        appendMessage('user', content);
      }
      // Array content is tool_result echoes the CLI adds after a tool call;
      // the assistant's own text already narrates that outcome, so skip it.
      break;
    }

    case 'assistant': {
      for (const block of message.message.content) {
        if (block.type === 'text' && block.text.trim()) {
          appendMessage('assistant', block.text);
        } else if (block.type === 'tool_use') {
          appendMessage('tool', `${block.name}(${JSON.stringify(block.input)})`);
        }
      }
      break;
    }

    case 'result':
      setBusy(false);
      if (message.is_error) {
        appendMessage('error', message.result || 'The agent hit an error.');
      }
      break;

    default:
      break;
  }
}

function connect() {
  const events = new EventSource('/api/events');

  events.onopen = () => {
    status.textContent = 'connected';
    status.className = 'status connected';
  };

  events.onerror = () => {
    status.textContent = 'disconnected — retrying…';
    status.className = 'status error';
  };

  events.onmessage = (event) => {
    handleMessage(JSON.parse(event.data));
  };
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  setBusy(true);

  try {
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
  } catch (err) {
    setBusy(false);
    appendMessage('error', `Failed to send: ${err.message}`);
  }
});

connect();
