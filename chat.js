// chat.js
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

// Append a new chat bubble
function appendChatBubble(message, type) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = message;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Send chat message to the server
async function sendChatMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  // Show user message
  appendChatBubble(message, 'user');
  chatInput.value = '';

  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await response.json();
    console.log('Chat response JSON:', data);
    // Show bot response
    appendChatBubble(data.response, 'bot');
  } catch (error) {
    console.error('Error fetching chat response:', error);
    appendChatBubble('Error: Unable to get response.', 'bot');
  }
}

chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendChatMessage();
  }
});
