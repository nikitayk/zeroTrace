// PrivateGPT - Privacy-First ChatGPT Extension
class PrivateGPT {
    constructor() {
        this.apiKey = '';
        this.messages = [];
        this.isTyping = false;
        this.currentTheme = 'light';
        
        this.init();
    }

    init() {
        this.loadSessionData();
        this.setupEventListeners();
        this.setupTheme();
        this.updateUI();
    }

    // Session Management (privacy-first)
    loadSessionData() {
        // Only load from sessionStorage (cleared when popup closes)
        this.apiKey = sessionStorage.getItem('privateGPT_apiKey') || '';
        this.currentTheme = sessionStorage.getItem('privateGPT_theme') || 'light';
        
        if (this.apiKey) {
            document.getElementById('apiKeyInput').value = this.apiKey;
            this.validateApiKey();
        }
    }

    saveSessionData() {
        // Only save to sessionStorage (temporary)
        if (this.apiKey) {
            sessionStorage.setItem('privateGPT_apiKey', this.apiKey);
        }
        sessionStorage.setItem('privateGPT_theme', this.currentTheme);
    }

    // Event Listeners
    setupEventListeners() {
        // API Key Management
        document.getElementById('saveKeyBtn').addEventListener('click', () => {
            this.saveApiKey();
        });

        document.getElementById('toggleKeyBtn').addEventListener('click', () => {
            this.toggleApiKeyVisibility();
        });

        document.getElementById('apiKeyInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
            }
        });

        // Message Input
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');

        messageInput.addEventListener('input', (e) => {
            this.handleInputChange(e);
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Theme Toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Clear Chat
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearChat();
        });
    }

    // API Key Management
    saveApiKey() {
        const input = document.getElementById('apiKeyInput');
        const key = input.value.trim();
        
        if (!key) {
            this.showApiKeyStatus('Please enter an API key', 'error');
            return;
        }

        if (!key.startsWith('sk-')) {
            this.showApiKeyStatus('Invalid API key format', 'error');
            return;
        }

        this.apiKey = key;
        this.saveSessionData();
        this.validateApiKey();
    }

    async validateApiKey() {
        if (!this.apiKey) return;

        this.showApiKeyStatus('Validating API key...', 'info');
        
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showApiKeyStatus('✅ API key is valid', 'success');
                this.enableChat();
                this.updateStatus('Ready', 'success');
            } else {
                const error = await response.json();
                this.showApiKeyStatus(`❌ ${error.error?.message || 'Invalid API key'}`, 'error');
                this.disableChat();
                this.updateStatus('API key invalid', 'error');
            }
        } catch (error) {
            this.showApiKeyStatus('❌ Failed to validate API key', 'error');
            this.disableChat();
            this.updateStatus('Connection error', 'error');
        }
    }

    toggleApiKeyVisibility() {
        const input = document.getElementById('apiKeyInput');
        const btn = document.getElementById('toggleKeyBtn');
        
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
        } else {
            input.type = 'password';
            btn.textContent = '👁️';
        }
    }

    showApiKeyStatus(message, type) {
        const status = document.getElementById('apiKeyStatus');
        status.textContent = message;
        status.className = `api-key-status ${type}`;
    }

    // Chat Management
    enableChat() {
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('messageInput').placeholder = 'Type your message...';
        this.hideWelcomeMessage();
    }

    disableChat() {
        document.getElementById('messageInput').disabled = true;
        document.getElementById('sendBtn').disabled = true;
        document.getElementById('messageInput').placeholder = 'Enter valid API key to start chatting...';
    }

    hideWelcomeMessage() {
        const welcome = document.querySelector('.welcome-message');
        if (welcome && this.messages.length === 0) {
            welcome.style.display = 'none';
        }
    }

    handleInputChange(e) {
        const input = e.target;
        const sendBtn = document.getElementById('sendBtn');
        const charCount = document.getElementById('charCount');

        // Auto-resize textarea
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';

        // Update character count
        charCount.textContent = input.value.length;

        // Enable/disable send button
        sendBtn.disabled = !input.value.trim() || this.isTyping || !this.apiKey;
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (!message || this.isTyping || !this.apiKey) return;

        // Add user message
        this.addMessage('user', message);

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        document.getElementById('charCount').textContent = '0';
        document.getElementById('sendBtn').disabled = true;

        // Show typing indicator
        this.showTypingIndicator();
        this.updateStatus('Thinking...', 'warning');

        try {
            // Call OpenAI API
            const response = await this.callOpenAI(message);
            this.hideTypingIndicator();
            
            if (response) {
                this.addMessage('assistant', response);
                this.updateStatus('Ready', 'success');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
            this.updateStatus('Error occurred', 'error');
        }
    }

    async callOpenAI(message) {
        // Prepare messages for API
        const apiMessages = [
            {
                role: 'system',
                content: 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.'
            },
            ...this.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            {
                role: 'user',
                content: message
            }
        ];

        const requestBody = {
            model: 'gpt-3.5-turbo',
            messages: apiMessages,
            max_tokens: 1000,
            temperature: 0.7,
            stream: false
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        
        // Update token info
        if (data.usage) {
            this.updateTokenInfo(data.usage.total_tokens);
        }

        return data.choices[0]?.message?.content || 'No response received';
    }

    addMessage(role, content) {
        const chatContainer = document.getElementById('chatContainer');
        
        // Hide welcome message
        const welcome = document.querySelector('.welcome-message');
        if (welcome) {
            welcome.style.display = 'none';
        }

        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? '👤' : '🤖';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = content;

        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageContent.appendChild(messageText);
        messageContent.appendChild(messageTime);
        messageEl.appendChild(avatar);
        messageEl.appendChild(messageContent);

        chatContainer.appendChild(messageEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Store message (in memory only)
        this.messages.push({ role, content, timestamp: new Date() });
    }

    showTypingIndicator() {
        this.isTyping = true;
        const chatContainer = document.getElementById('chatContainer');

        const typingEl = document.createElement('div');
        typingEl.className = 'typing-indicator';
        typingEl.id = 'typingIndicator';

        typingEl.innerHTML = `
            <div class="typing-avatar">🤖</div>
            <div class="typing-content">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                <span class="typing-text">Thinking...</span>
            </div>
        `;

        chatContainer.appendChild(typingEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        
        // Re-enable send button if there's text
        const messageInput = document.getElementById('messageInput');
        document.getElementById('sendBtn').disabled = !messageInput.value.trim() || !this.apiKey;
    }

    clearChat() {
        if (this.messages.length === 0) return;

        if (confirm('Clear all messages? This cannot be undone.')) {
            this.messages = [];
            const chatContainer = document.getElementById('chatContainer');
            
            // Remove all messages and typing indicators
            const messages = chatContainer.querySelectorAll('.message, .typing-indicator');
            messages.forEach(msg => msg.remove());

            // Show welcome message again
            const welcome = document.querySelector('.welcome-message');
            if (welcome) {
                welcome.style.display = 'block';
            }

            this.updateStatus('Chat cleared', 'success');
            setTimeout(() => {
                this.updateStatus('Ready', 'success');
            }, 2000);
        }
    }

    // Theme Management
    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeToggle();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeToggle();
        this.saveSessionData();
    }

    updateThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        toggle.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
        toggle.title = `Switch to ${this.currentTheme === 'light' ? 'dark' : 'light'} theme`;
    }

    // Status Management
    updateStatus(text, type = 'success') {
        const statusText = document.getElementById('statusText');
        const statusDot = document.getElementById('statusDot');
        
        statusText.textContent = text;
        statusDot.className = `status-dot ${type}`;
    }

    updateTokenInfo(tokens) {
        const tokenInfo = document.getElementById('tokenInfo');
        const tokenCount = document.getElementById('tokenCount');
        
        tokenCount.textContent = tokens;
        tokenInfo.style.display = 'block';
        
        // Estimate cost (rough calculation for GPT-3.5-turbo)
        const estimatedCost = (tokens / 1000) * 0.002;
        tokenInfo.title = `Estimated cost: $${estimatedCost.toFixed(4)}`;
    }

    updateUI() {
        // Update UI based on current state
        if (this.apiKey) {
            this.validateApiKey();
        } else {
            this.disableChat();
            this.updateStatus('Enter API key', 'warning');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.privateGPT = new PrivateGPT();
});

// Clean up on unload (privacy measure)
window.addEventListener('beforeunload', () => {
    // Clear sensitive data when popup closes
    // Note: sessionStorage will be cleared automatically
    console.log('PrivateGPT: Session ended, data cleared');
});