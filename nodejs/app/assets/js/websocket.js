
(function() {

  const container = document.querySelector('#messages-container');
  const messageForm = document.querySelector('form[name="message-form"]');
  const websocketHost = messageForm.getAttribute('data-websocket-host')
  const room = 1;
  // const room = Math.floor(Math.random() * (+4 - +1)) + +1;
  let send;

  const socketInit = () => {
    switch (messageForm.getAttribute('data-websocket')) {
      case 'socketio':
        const socket = io(`wss://${websocketHost}/namespace`, { path:'/socket', transports: ['websocket'], forceNew: false });
        send = e => {
          e.preventDefault();
          console.log('sending message');
          socket.emit('message', {
            room,
            message: messageForm.querySelector('input[name=message]').value
          });
          messageForm.querySelector('input[name=message]').value = '';
        }

        socket.on('connect', () => {
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
          console.log(`joining room ${room}`)
          socket.emit('join', room);
        });

        socket.on('connect_timeout', e => {
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
          console.log('timeout: ', e);
        });

        socket.on('connect_error', e => {
          const time = new Date().toISOString();
          container.innerHTML = `
            <div class="message-container">
              <span><strong>Error occured</strong></span>
              <div class="message">
                  <span>${time}</span>
              </div>
            </div>
          ` + container.innerHTML;
          console.log('error: ', e);
        });

        socket.on('message', e => {
          container.innerHTML = `
            <div class="message-container">
              <span><strong>New message</strong></span>
              <div class="message">
                <span>${e}</span>
              </div>
            </div>
          ` + container.innerHTML;
          console.log('message: ', e);
        });

        socket.on('disconnect', () => {
          container.innerHTML = `
            <div class="message-container">
              <span><strong>Disconnected</strong></span>
              <div class="message">
                <span>Disconnected</span>
              </div>
            </div>
          ` + container.innerHTML;
          console.log('disconnected');
        });
        break;
      case 'sockjs':
        // wss protocol won't work, needs to be http.
        const sockjs = new SockJS(`https://${websocketHost}/socket`);

        // for non-multiplexed connection, use sockjs instead of one
        const multiplexer = new WebSocketMultiplex(sockjs);
        const channel  = multiplexer.channel(room);

        send = e => {
          e.preventDefault();
          console.log('sending message');
          channel.send(messageForm.querySelector('input[name=message]').value);
          messageForm.querySelector('input[name=message]').value = '';
        }

        channel.onopen = () => {
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

        channel.onmessage = e => {
          container.innerHTML = `
            <div class="message-container">
              <span><strong>New message</strong></span>
              <div class="message">
                <span>${e.data}</span>
              </div>
            </div>
          ` + container.innerHTML;
          console.log('message: ', e);
        };

        channel.onclose = () => {
          container.innerHTML = `
            <div class="message-container">
              <span><strong>Closed</strong></span>
              <div class="message">
                <span>Connection closed</span>
              </div>
            </div>
          ` + container.innerHTML;

          setTimeout(() => socketInit(), 1000);

          messageForm.removeEventListener('submit', send);
          console.log('closed')
        };
        break;
      case 'cws':
        const cws = new ClusterWS({url: `wss://${websocketHost}/socket` });

        send = e => {
          e.preventDefault();
          console.log('sending message');
          cws.send('message', messageForm.querySelector('input[name=message]').value);
          messageForm.querySelector('input[name=message]').value = '';
        }

        cws.on('connect', () => {
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
        });

        cws.on('message', data => {
          container.innerHTML = `
            <div class="message-container">
              <span><strong>New message</strong></span>
              <div class="message">
                <span>${data}</span>
              </div>
            </div>
          ` + container.innerHTML;
        });

        cws.on('error', () => {
          const time = new Date().toISOString();
          container.innerHTML = `
            <div class="message-container">
              <span><strong>Error occured</strong></span>
              <div class="message">
                  <span>${time}</span>
              </div>
            </div>
          ` + container.innerHTML;
        });

        cws.on('disconnect', () => {
          const time = new Date().toISOString();
          container.innerHTML = `
            <div class="message-container">
              <span><strong>Disconnected</strong></span>
              <div class="message">
                  <span>${time}</span>
              </div>
            </div>
          ` + container.innerHTML;
        });

        break;
      default:
        const ws = new WebSocket(`wss://${websocketHost}/socket`);
        send = e => {
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
        break;
    }
  };

  socketInit();
})();
