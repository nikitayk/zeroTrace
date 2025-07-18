// PrivateGPT Pro - Advanced ChatGPT Clone
class PrivateGPTPro {
    constructor() {
        this.messages = [];
        this.currentChatId = 'welcome-chat';
        this.chatHistory = new Map();
        this.isTyping = false;
        this.currentTheme = 'dark';
        this.attachedFiles = [];
        this.settings = {
            openaiKey: '',
            claudeKey: '',
            geminiKey: '',
            model: 'gpt-3.5-turbo',
            systemPrompt: 'You are a helpful AI assistant focused on privacy and security. Provide detailed, accurate responses while being concise and professional.',
            temperature: 0.7,
            codeHighlighting: true,
            streamResponse: true
        };

        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.setupTheme();
        this.initializeChat();
        this.setupCodeHighlighting();
        this.setupFileHandling();
    }

    // Settings Management
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get('privateGPTProSettings');
            if (result.privateGPTProSettings) {
                this.settings = { ...this.settings, ...JSON.parse(result.privateGPTProSettings) };
            }
            
            // Load theme from sessionStorage for immediate application
            const sessionTheme = sessionStorage.getItem('privateGPT_theme');
            if (sessionTheme) {
                this.currentTheme = sessionTheme;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.local.set({
                privateGPTProSettings: JSON.stringify(this.settings)
            });
            sessionStorage.setItem('privateGPT_theme', this.currentTheme);
            this.showNotification('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Sidebar
        document.getElementById('newChatBtn').addEventListener('click', () => this.createNewChat());
        document.getElementById('sidebarToggle').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('mobileSidebarToggle').addEventListener('click', () => this.toggleSidebar());

        // Header
        document.getElementById('modelSelect').addEventListener('change', (e) => {
            this.settings.model = e.target.value;
            this.saveSettings();
        });
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('shareBtn').addEventListener('click', () => this.shareChat());

        // Input
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const charCount = document.getElementById('charCount');

        messageInput.addEventListener('input', (e) => this.handleInputChange(e));
        messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        sendBtn.addEventListener('click', () => this.sendMessage());

        // File handling
        document.getElementById('attachBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));

        // Action buttons
        document.getElementById('codeBtn').addEventListener('click', () => this.toggleCodeMode());
        document.getElementById('imageBtn').addEventListener('click', () => this.generateImage());

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettingsFromModal());
        document.getElementById('resetSettings').addEventListener('click', () => this.resetSettings());

        // Settings modal inputs
        document.querySelectorAll('.toggle-visibility').forEach(btn => {
            btn.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        });

        // Quick actions
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.currentTarget.dataset.prompt;
                if (prompt) {
                    document.getElementById('messageInput').value = prompt;
                    this.sendMessage();
                }
            });
        });

        // Modal close on outside click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettings();
            }
        });

        // Upgrade button (placeholder)
        document.getElementById('upgradeBtn').addEventListener('click', () => {
            this.showNotification('Upgrade features coming soon!', 'info');
        });
    }

    // Chat Management
    initializeChat() {
        this.chatHistory.set('welcome-chat', {
            id: 'welcome-chat',
            title: 'Welcome Chat',
            messages: [],
            timestamp: new Date()
        });
        
        this.updateModelSelector();
        this.showWelcomeScreen();
    }

    createNewChat() {
        const chatId = 'chat-' + Date.now();
        const newChat = {
            id: chatId,
            title: 'New Chat',
            messages: [],
            timestamp: new Date()
        };
        
        this.chatHistory.set(chatId, newChat);
        this.currentChatId = chatId;
        this.messages = [];
        
        this.clearChatContainer();
        this.showWelcomeScreen();
        this.updateChatHistory();
    }

    clearChatContainer() {
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.innerHTML = '';
    }

    showWelcomeScreen() {
        const chatContainer = document.getElementById('chatContainer');
        const welcomeScreen = document.getElementById('welcomeScreen');
        
        if (welcomeScreen) {
            chatContainer.appendChild(welcomeScreen);
            welcomeScreen.style.display = 'flex';
        }
    }

    hideWelcomeScreen() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
    }

    updateChatHistory() {
        const historyContainer = document.getElementById('chatHistory');
        historyContainer.innerHTML = `
            <div class="history-section">
                <h3>Today</h3>
                ${Array.from(this.chatHistory.values()).map(chat => `
                    <div class="chat-item ${chat.id === this.currentChatId ? 'active' : ''}" data-chat-id="${chat.id}">
                        <span class="chat-title">${chat.title}</span>
                        <button class="chat-options">⋯</button>
                    </div>
                `).join('')}
            </div>
        `;

        // Add click listeners to chat items
        historyContainer.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('chat-options')) {
                    this.switchToChat(item.dataset.chatId);
                }
            });
        });
    }

    switchToChat(chatId) {
        const chat = this.chatHistory.get(chatId);
        if (!chat) return;

        this.currentChatId = chatId;
        this.messages = [...chat.messages];
        
        this.clearChatContainer();
        
        if (this.messages.length === 0) {
            this.showWelcomeScreen();
        } else {
            this.hideWelcomeScreen();
            this.messages.forEach(msg => this.displayMessage(msg.role, msg.content, false));
        }
        
        this.updateChatHistory();
    }

    // Message Handling
    handleInputChange(e) {
        const input = e.target;
        const charCount = document.getElementById('charCount');
        const sendBtn = document.getElementById('sendBtn');

        // Auto-resize textarea
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 200) + 'px';

        // Update character count
        const count = input.value.length;
        charCount.textContent = `${count}/32000`;
        
        // Color coding for character count
        if (count > 28000) {
            charCount.style.color = 'var(--text-danger)';
        } else if (count > 24000) {
            charCount.style.color = 'var(--text-warning)';
        } else {
            charCount.style.color = 'var(--text-muted)';
        }

        // Enable/disable send button
        sendBtn.disabled = !input.value.trim() || this.isTyping;
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (!message || this.isTyping) return;

        // Check if API key is configured
        if (!this.settings.openaiKey && !this.settings.claudeKey && !this.settings.geminiKey) {
            this.showNotification('Please configure your API keys in settings', 'warning');
            this.openSettings();
            return;
        }

        // Hide welcome screen
        this.hideWelcomeScreen();

        // Add user message
        this.addMessage('user', message);

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        document.getElementById('charCount').textContent = '0/32000';
        document.getElementById('sendBtn').disabled = true;

        // Clear attachments
        this.clearAttachments();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Call AI API
            const response = await this.callAI(message);
            this.hideTypingIndicator();
            
            if (response) {
                this.addMessage('assistant', response);
                this.updateChatTitle(message);
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('assistant', `I apologize, but I encountered an error: ${error.message}. Please check your API key and try again.`);
            console.error('AI API Error:', error);
        }
    }

    addMessage(role, content) {
        const message = { role, content, timestamp: new Date() };
        this.messages.push(message);
        
        // Update chat history
        const currentChat = this.chatHistory.get(this.currentChatId);
        if (currentChat) {
            currentChat.messages = [...this.messages];
            this.chatHistory.set(this.currentChatId, currentChat);
        }

        this.displayMessage(role, content, true);
    }

    displayMessage(role, content, animate = false) {
        const chatContainer = document.getElementById('chatContainer');
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        if (animate) {
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'translateY(20px)';
        }

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? '👤' : '🤖';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        
        // Process markdown and code highlighting
        if (this.settings.codeHighlighting && typeof marked !== 'undefined') {
            messageText.innerHTML = marked.parse(content);
            // Highlight code blocks
            messageText.querySelectorAll('pre code').forEach(block => {
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(block);
                }
            });
        } else {
            messageText.textContent = content;
        }

        const messageActions = document.createElement('div');
        messageActions.className = 'message-actions';
        messageActions.innerHTML = `
            <button class="message-action" onclick="navigator.clipboard.writeText('${content.replace(/'/g, "\\'")}')">
                📋 Copy
            </button>
            <button class="message-action" onclick="this.closest('.message').remove()">
                🗑️ Delete
            </button>
        `;

        messageContent.appendChild(messageText);
        messageContent.appendChild(messageActions);
        messageElement.appendChild(avatar);
        messageElement.appendChild(messageContent);

        chatContainer.appendChild(messageElement);

        // Animate if needed
        if (animate) {
            requestAnimationFrame(() => {
                messageElement.style.transition = 'all 0.3s ease-out';
                messageElement.style.opacity = '1';
                messageElement.style.transform = 'translateY(0)';
            });
        }

        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    showTypingIndicator() {
        this.isTyping = true;
        const chatContainer = document.getElementById('chatContainer');

        const typingElement = document.createElement('div');
        typingElement.className = 'typing-indicator';
        typingElement.id = 'typingIndicator';

        typingElement.innerHTML = `
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

        chatContainer.appendChild(typingElement);
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
        document.getElementById('sendBtn').disabled = !messageInput.value.trim();
    }

    updateChatTitle(firstMessage) {
        const currentChat = this.chatHistory.get(this.currentChatId);
        if (currentChat && currentChat.title === 'New Chat') {
            // Generate a title from the first message
            const title = firstMessage.length > 30 
                ? firstMessage.substring(0, 30) + '...' 
                : firstMessage;
            currentChat.title = title;
            this.chatHistory.set(this.currentChatId, currentChat);
            this.updateChatHistory();
        }
    }

    // AI API Integration
    async callAI(message) {
        const model = this.settings.model;
        let apiKey, endpoint, headers, body;

        // Determine which API to use based on model
        if (model.startsWith('gpt')) {
            if (!this.settings.openaiKey) {
                throw new Error('OpenAI API key not configured');
            }
            apiKey = this.settings.openaiKey;
            endpoint = 'https://api.openai.com/v1/chat/completions';
            headers = {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            };
            body = {
                model: model,
                messages: [
                    { role: 'system', content: this.settings.systemPrompt },
                    ...this.messages.slice(-10), // Keep last 10 messages for context
                    { role: 'user', content: message }
                ],
                temperature: this.settings.temperature,
                max_tokens: 4000,
                stream: false
            };
        } else if (model.startsWith('claude')) {
            if (!this.settings.claudeKey) {
                throw new Error('Claude API key not configured');
            }
            // Claude API integration (placeholder)
            throw new Error('Claude integration coming soon');
        } else if (model.startsWith('gemini')) {
            if (!this.settings.geminiKey) {
                throw new Error('Gemini API key not configured');
            }
            // Gemini API integration (placeholder)
            throw new Error('Gemini integration coming soon');
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response received';
    }

    // File Handling
    setupFileHandling() {
        const chatContainer = document.getElementById('chatContainer');
        
        // Drag and drop
        chatContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            chatContainer.classList.add('dragover');
        });

        chatContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            chatContainer.classList.remove('dragover');
        });

        chatContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            chatContainer.classList.remove('dragover');
            this.handleFilesDrop(e.dataTransfer.files);
        });
    }

    handleFileSelect(e) {
        this.handleFilesDrop(e.target.files);
    }

    handleFilesDrop(files) {
        Array.from(files).forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                this.showNotification(`File ${file.name} is too large (max 10MB)`, 'error');
                return;
            }
            
            this.attachedFiles.push(file);
            this.displayAttachment(file);
        });
    }

    displayAttachment(file) {
        const attachmentsContainer = document.getElementById('inputAttachments');
        
        const attachmentElement = document.createElement('div');
        attachmentElement.className = 'attachment-item';
        attachmentElement.innerHTML = `
            <span class="icon">📎</span>
            <span>${file.name}</span>
            <button class="attachment-remove" onclick="this.parentElement.remove()">✕</button>
        `;

        attachmentsContainer.appendChild(attachmentElement);
    }

    clearAttachments() {
        this.attachedFiles = [];
        document.getElementById('inputAttachments').innerHTML = '';
    }

    // UI Controls
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('collapsed');
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setupTheme();
        this.saveSettings();
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.innerHTML = `<span class="icon">${this.currentTheme === 'dark' ? '☀️' : '🌙'}</span>`;
    }

    updateModelSelector() {
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.value = this.settings.model;
    }

    toggleCodeMode() {
        const codeBtn = document.getElementById('codeBtn');
        codeBtn.classList.toggle('active');
        
        const messageInput = document.getElementById('messageInput');
        if (codeBtn.classList.contains('active')) {
            messageInput.placeholder = 'Paste your code here for analysis...';
            messageInput.style.fontFamily = 'var(--font-mono)';
        } else {
            messageInput.placeholder = 'Message PrivateGPT Pro...';
            messageInput.style.fontFamily = 'var(--font-family)';
        }
    }

    generateImage() {
        this.showNotification('Image generation coming soon!', 'info');
    }

    shareChat() {
        const chatData = {
            title: this.chatHistory.get(this.currentChatId)?.title || 'Chat',
            messages: this.messages
        };
        
        navigator.clipboard.writeText(JSON.stringify(chatData, null, 2))
            .then(() => this.showNotification('Chat copied to clipboard!', 'success'))
            .catch(() => this.showNotification('Failed to copy chat', 'error'));
    }

    // Settings Modal
    openSettings() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('show');
        
        // Populate current settings
        document.getElementById('openaiKey').value = this.settings.openaiKey;
        document.getElementById('claudeKey').value = this.settings.claudeKey;
        document.getElementById('geminiKey').value = this.settings.geminiKey;
        document.getElementById('systemPrompt').value = this.settings.systemPrompt;
        document.getElementById('temperature').value = this.settings.temperature;
        document.getElementById('codeHighlighting').checked = this.settings.codeHighlighting;
        document.getElementById('streamResponse').checked = this.settings.streamResponse;
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('show');
    }

    saveSettingsFromModal() {
        this.settings.openaiKey = document.getElementById('openaiKey').value;
        this.settings.claudeKey = document.getElementById('claudeKey').value;
        this.settings.geminiKey = document.getElementById('geminiKey').value;
        this.settings.systemPrompt = document.getElementById('systemPrompt').value;
        this.settings.temperature = parseFloat(document.getElementById('temperature').value);
        this.settings.codeHighlighting = document.getElementById('codeHighlighting').checked;
        this.settings.streamResponse = document.getElementById('streamResponse').checked;
        
        this.saveSettings();
        this.closeSettings();
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            this.settings = {
                openaiKey: '',
                claudeKey: '',
                geminiKey: '',
                model: 'gpt-3.5-turbo',
                systemPrompt: 'You are a helpful AI assistant focused on privacy and security. Provide detailed, accurate responses while being concise and professional.',
                temperature: 0.7,
                codeHighlighting: true,
                streamResponse: true
            };
            this.saveSettings();
            this.openSettings(); // Refresh the modal
        }
    }

    togglePasswordVisibility(e) {
        const targetId = e.target.dataset.target;
        const input = document.getElementById(targetId);
        const button = e.target;
        
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
        }
    }

    // Code Highlighting Setup
    setupCodeHighlighting() {
        if (typeof hljs !== 'undefined') {
            hljs.configure({
                languages: ['javascript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'sql', 'bash']
            });
        }
    }

    // Notifications
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-default);
            border-left: 4px solid ${type === 'success' ? 'var(--text-success)' : 
                                     type === 'error' ? 'var(--text-danger)' : 
                                     type === 'warning' ? 'var(--text-warning)' : 'var(--text-accent)'};
            color: var(--text-primary);
            padding: var(--space-4);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            z-index: 2000;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.privateGPTPro = new PrivateGPTPro();
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    console.log('PrivateGPT Pro: Session ended, temporary data cleared');
});