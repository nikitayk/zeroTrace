// Popup functionality
class ZeroTraceChat {
  constructor() {
    this.messages = []
    this.isTyping = false
    this.settings = {
      apiKey: "",
      model: "gpt-3.5-turbo",
      systemPrompt: "You are a helpful AI assistant focused on privacy and security.",
      theme: "dark",
    }

    this.init()
  }

  async init() {
    await this.loadSettings()
    this.setupEventListeners()
    this.setupTheme()
    // Optionally, you could add a welcome message or load previous chat history here
  }

  async loadSettings() {
    try {
      // Correctly await the promise from chrome.storage.local.get
      const result = await window.chrome.storage.local.get("zeroTraceSettings")
      const savedSettings = result.zeroTraceSettings

      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) }
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  setupEventListeners() {
    // Message input
    const messageInput = document.getElementById("messageInput")
    const sendButton = document.getElementById("sendButton")
    const charCount = document.getElementById("charCount")

    messageInput.addEventListener("input", (e) => {
      this.handleInputChange(e)
    })

    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })

    sendButton.addEventListener("click", () => {
      this.sendMessage()
    })

    // Settings
    document.getElementById("settingsBtn").addEventListener("click", () => {
      this.openSettings()
    })
    document.getElementById("closeSettings").addEventListener("click", () => {
      this.closeSettings()
    })
    document.getElementById("saveSettings").addEventListener("click", () => {
      this.saveSettings()
    })

    // Theme toggle
    document.getElementById("themeToggle").addEventListener("click", () => {
      this.toggleTheme()
    })

    // Clear chat
    document.getElementById("clearBtn").addEventListener("click", () => {
      this.clearChat()
    })

    // Close modal on outside click
    document.getElementById("settingsModal").addEventListener("click", (e) => {
      if (e.target.id === "settingsModal") {
        this.closeSettings()
      }
    })
  }

  handleInputChange(e) {
    const input = e.target
    const charCount = document.getElementById("charCount")
    const sendButton = document.getElementById("sendButton")

    // Update character count
    charCount.textContent = input.value.length

    // Auto-resize textarea
    input.style.height = "auto"
    input.style.height = Math.min(input.scrollHeight, 100) + "px"

    // Enable/disable send button
    sendButton.disabled = !input.value.trim() || this.isTyping

    // Update character counter color
    const percentage = input.value.length / 4000
    if (percentage > 0.9) {
      charCount.style.color = "var(--error-color)"
    } else if (percentage > 0.7) {
      charCount.style.color = "var(--warning-color)"
    } else {
      charCount.style.color = "var(--text-muted)"
    }
  }

  async sendMessage() {
    const messageInput = document.getElementById("messageInput")
    const message = messageInput.value.trim()

    if (!message || this.isTyping) return

    // Hide welcome screen
    document.getElementById("welcomeScreen").style.display = "none"

    // Add user message
    this.addMessage("user", message)

    // Clear input
    messageInput.value = ""
    messageInput.style.height = "auto"
    document.getElementById("charCount").textContent = "0"
    document.getElementById("sendButton").disabled = true

    // Show typing indicator
    this.showTypingIndicator()

    // Simulate AI response (replace with actual API call)
    await this.simulateAIResponse(message)
  }

  addMessage(sender, content, timestamp = new Date()) {
    const chatContainer = document.getElementById("chatContainer")

    const messageElement = document.createElement("div")
    messageElement.className = `message ${sender}`

    const avatar = document.createElement("div")
    avatar.className = "message-avatar"
    avatar.textContent = sender === "user" ? "👤" : "🤖"

    const messageContent = document.createElement("div")
    messageContent.className = "message-content"

    const messageText = document.createElement("div")
    messageText.className = "message-text"
    messageText.textContent = content

    const messageTime = document.createElement("div")
    messageTime.className = "message-time"
    messageTime.textContent = this.formatTime(timestamp)

    messageContent.appendChild(messageText)
    messageContent.appendChild(messageTime)

    messageElement.appendChild(avatar)
    messageElement.appendChild(messageContent)

    chatContainer.appendChild(messageElement)

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight

    // Store message (in memory only for privacy)
    this.messages.push({ sender, content, timestamp })
  }

  showTypingIndicator() {
    this.isTyping = true
    const chatContainer = document.getElementById("chatContainer")

    const typingElement = document.createElement("div")
    typingElement.className = "typing-indicator"
    typingElement.id = "typingIndicator"

    typingElement.innerHTML = `
        <div class="typing-avatar">🤖</div>
        <div class="typing-content">
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span class="typing-text">zeroTrace is thinking...</span>
        </div>
    `

    chatContainer.appendChild(typingElement)
    chatContainer.scrollTop = chatContainer.scrollHeight
  }

  hideTypingIndicator() {
    this.isTyping = false
    const typingIndicator = document.getElementById("typingIndicator")
    if (typingIndicator) {
      typingIndicator.remove()
    }
    document.getElementById("sendButton").disabled = !document.getElementById("messageInput").value.trim()
  }

  async simulateAIResponse(userMessage) {
    // Simulate thinking time
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

    this.hideTypingIndicator()

    // Generate a contextual response
    const response = this.generateContextualResponse(userMessage)

    // Add AI response
    this.addMessage("assistant", response)
  }

  generateContextualResponse(userMessage) {
    const responses = [
      "I understand your question about " +
        userMessage.toLowerCase() +
        ". As your private AI assistant, I'm here to help while keeping your data secure.",
      "That's an interesting point. Let me provide you with some insights while maintaining complete privacy.",
      "I appreciate you using zeroTrace for this query. Your privacy is protected while I assist you with: " +
        userMessage.substring(0, 50) +
        "...",
      "Thank you for your question. Unlike other AI services, zeroTrace ensures your conversation remains private and secure.",
      "I'm processing your request securely. Here's what I can help you with regarding your query.",
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  openSettings() {
    const modal = document.getElementById("settingsModal")
    modal.classList.add("show")

    // Populate current settings
    document.getElementById("apiKey").value = this.settings.apiKey
    document.getElementById("modelSelect").value = this.settings.model
    document.getElementById("systemPrompt").value = this.settings.systemPrompt
  }

  closeSettings() {
    document.getElementById("settingsModal").classList.remove("show")
  }

  saveSettings() {
    this.settings.apiKey = document.getElementById("apiKey").value
    this.settings.model = document.getElementById("modelSelect").value
    this.settings.systemPrompt = document.getElementById("systemPrompt").value

    // Save to chrome.storage.local
    window.chrome.storage.local.set({ zeroTraceSettings: JSON.stringify(this.settings) })

    this.closeSettings()
    this.showNotification("Settings saved successfully!")
  }

  setupTheme() {
    document.documentElement.setAttribute("data-theme", this.settings.theme)
    const themeToggle = document.getElementById("themeToggle")
    themeToggle.textContent = this.settings.theme === "dark" ? "🌙" : "☀️"
  }

  toggleTheme() {
    this.settings.theme = this.settings.theme === "dark" ? "light" : "dark"
    this.setupTheme()
    this.saveSettings()
  }

  clearChat() {
    if (confirm("Are you sure you want to clear the chat? This action cannot be undone.")) {
      this.messages = []
      const chatContainer = document.getElementById("chatContainer")
      chatContainer.innerHTML = ""

      // Show welcome screen again
      const welcomeScreen = document.getElementById("welcomeScreen")
      welcomeScreen.style.display = "flex"
      chatContainer.appendChild(welcomeScreen)

      this.showNotification("Chat cleared successfully!")
    }
  }

  formatTime(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  showNotification(message) {
    // Simple notification system
    const notification = document.createElement("div")
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 0.9rem;
        z-index: 2000;
        animation: slideInRight 0.3s ease-out;
    `
    notification.textContent = message

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease-out forwards"
      setTimeout(() => notification.remove(), 300)
    }, 3000)
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.zeroTraceChat = new ZeroTraceChat()
})