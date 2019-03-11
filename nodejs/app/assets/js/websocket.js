
const container = document.querySelector('#messages-container');
const messageForm = document.querySelector('form[name="message-form"]');

const socketInit = () => {
  const ws = new WebSocket('wss://localhost:3500/socket');

  const send = e => {
    e.preventDefault();
    ws.send(messageForm.querySelector('input[name=message]').value);
    messageForm.querySelector('input[name=message]').value = '';
  }

  ws.onopen = e => {
    const time = new Date().toISOString();
    container.innerHTML = `
      <div class="message-container">
        <span><strong>Connection opened</strong></span>
        <div class="message">
          <span>${time}</span>
        </div>
      </div>
    ` + container.innerHTML;

    messageForm.addEventListener('submit', send);
  };

  ws.onclose = e => {
    const time = new Date().toISOString();
    container.innerHTML = `
      <div class="message-container">
        <span><strong>Connection closed</strong></span>
        <div class="message">
          <span>${time}</span>
        </div>
      </div>
    ` + container.innerHTML;

    setTimeout(() => socketInit(), 1000);

    messageForm.removeEventListener('submit', send);
  };

  ws.onerror = e => {
    const time = new Date().toISOString();
    container.innerHTML = `
      <div class="message-container">
        <span><strong>Error occured</strong></span>
        <div class="message">
            <span>${time}</span>
        </div>
      </div>
    ` + container.innerHTML;
  };

  ws.onmessage = e => {
    container.innerHTML = `
      <div class="message-container">
        <span><strong>New message</strong></span>
        <div class="message">
          <span>${e.data}</span>
        </div>
      </div>
    ` + container.innerHTML;
    console.log(e);
  };

   return ws;
};

socketInit();
