(function () {
  var script = document.currentScript;
  var chatbotUrl = script && script.getAttribute('data-chatbot-url');
  if (!chatbotUrl) {
    console.warn('AI-nonymauz widget: data-chatbot-url is required.');
    return;
  }

  var button = document.createElement('button');
  button.innerText = 'Chat with us';
  button.style.position = 'fixed';
  button.style.right = '20px';
  button.style.bottom = '20px';
  button.style.zIndex = '99998';
  button.style.border = '0';
  button.style.borderRadius = '999px';
  button.style.background = '#111827';
  button.style.color = '#fff';
  button.style.padding = '12px 16px';
  button.style.font = '600 14px Arial, sans-serif';
  button.style.boxShadow = '0 12px 30px rgba(0,0,0,.18)';
  button.style.cursor = 'pointer';

  var frame = document.createElement('iframe');
  frame.src = chatbotUrl;
  frame.title = 'AI-nonymauz Chatbot';
  frame.style.position = 'fixed';
  frame.style.right = '20px';
  frame.style.bottom = '76px';
  frame.style.width = 'min(420px, calc(100vw - 40px))';
  frame.style.height = 'min(720px, calc(100vh - 110px))';
  frame.style.zIndex = '99999';
  frame.style.border = '1px solid #e5e7eb';
  frame.style.borderRadius = '24px';
  frame.style.boxShadow = '0 20px 70px rgba(0,0,0,.22)';
  frame.style.display = 'none';
  frame.style.background = '#fff';

  button.onclick = function () {
    var open = frame.style.display === 'block';
    frame.style.display = open ? 'none' : 'block';
    button.innerText = open ? 'Chat with us' : 'Close chat';
  };

  document.body.appendChild(frame);
  document.body.appendChild(button);
})();
