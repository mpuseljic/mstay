<template>
  <div class="ai-widget">
    <button v-if="!isOpen" class="chat-fab" @click="isOpen = true">
      <span>AI</span>
    </button>

    <section v-else class="chat-panel">
      <div class="chat-header">
        <div>
          <strong>Ask mStay</strong>
          <p>AI booking assistant</p>
        </div>

        <button class="close-btn" @click="isOpen = false">✕</button>
      </div>

      <div ref="chatBox" class="chat-box">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['message-row', msg.role === 'user' ? 'message-row--user' : '']"
        >
          <div :class="['message', msg.role === 'user' ? 'message--user' : 'message--ai']">
            <p>{{ msg.text }}</p>

            <div v-if="msg.filters" class="filter-chips">
              <span v-if="msg.filters.location">📍 {{ msg.filters.location }}</span>
              <span v-if="msg.filters.guestCount">👥 {{ msg.filters.guestCount }} guests</span>
              <span v-if="msg.filters.maxPrice">€ {{ msg.filters.maxPrice }}</span>
              <span v-for="a in msg.filters.amenities" :key="a">✨ {{ a }}</span>
            </div>

            <div v-if="msg.results?.length" class="chat-results">
              <RouterLink
                v-for="listing in msg.results.slice(0, 3)"
                :key="listing.listingId"
                :to="`/listings/${listing.listingId}`"
                class="result-card"
              >
                <strong>{{ listing.title }}</strong>
                <span>{{ listing.locationTitle || 'Location available in details' }}</span>
                <small>{{ listing.score }}% match</small>
              </RouterLink>
            </div>
          </div>
        </div>

        <div v-if="loading" class="message-row">
          <div class="message message--ai typing"><span></span><span></span><span></span></div>
        </div>
      </div>

      <div class="suggestions">
        <button @click="useSuggestion('Find me an apartment in Pula for 2 people with parking')">
          Pula apartment
        </button>
        <button @click="useSuggestion('Show me stays for 4 guests with WiFi and sea view')">
          Sea view
        </button>
      </div>

      <form class="chat-input" @submit.prevent="sendMessage">
        <input v-model="message" type="text" placeholder="Ask about stays..." />
        <button :disabled="loading || !message.trim()">➤</button>
      </form>
    </section>
  </div>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { aiSearchListings } from '@/services/ai'

const isOpen = ref(false)
const message = ref('')
const loading = ref(false)
const chatBox = ref(null)

const messages = ref([
  {
    id: Date.now(),
    role: 'ai',
    text: 'Hi! Tell me what kind of stay you are looking for.',
  },
])

async function scrollToBottom() {
  await nextTick()
  if (chatBox.value) {
    chatBox.value.scrollTop = chatBox.value.scrollHeight
  }
}

function useSuggestion(text) {
  message.value = text
  sendMessage()
}

async function sendMessage() {
  if (!message.value.trim() || loading.value) return

  const userText = message.value.trim()

  messages.value.push({
    id: Date.now() + Math.random(),
    role: 'user',
    text: userText,
  })

  message.value = ''
  loading.value = true
  await scrollToBottom()

  try {
    const response = await aiSearchListings(userText)
    const count = response.results?.length || 0

    messages.value.push({
      id: Date.now() + Math.random(),
      role: 'ai',
      text: response.answer,
      filters: response.filters,
      results: response.results || [],
    })
  } catch (err) {
    messages.value.push({
      id: Date.now() + Math.random(),
      role: 'ai',
      text: 'AI search is currently unavailable.',
    })
  } finally {
    loading.value = false
    await scrollToBottom()
  }
}
</script>

<style scoped>
.ai-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2000;
}

.chat-fab {
  width: 68px;
  height: 68px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary, #ff385c), #111827);
  color: white;
  cursor: pointer;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.28);
}

.chat-fab span {
  font-weight: 900;
  font-size: 1rem;
}

.chat-panel {
  width: min(390px, calc(100vw - 32px));
  height: min(620px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.26);
  border: 1px solid #e5e7eb;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 18px;
  background: linear-gradient(135deg, #111827, var(--primary, #ff385c));
  color: white;
}

.chat-header strong {
  display: block;
  font-size: 1.05rem;
}

.chat-header p {
  margin: 3px 0 0;
  opacity: 0.82;
  font-size: 0.85rem;
}

.close-btn {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  color: white;
  cursor: pointer;
}

.chat-box {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}

.message-row--user {
  justify-content: flex-end;
}

.message {
  max-width: 86%;
  border-radius: 18px;
  padding: 12px 13px;
  font-size: 0.92rem;
  line-height: 1.45;
}

.message p {
  margin: 0;
}

.message--ai {
  background: #fff;
  color: #111827;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 5px;
}

.message--user {
  background: #111827;
  color: white;
  border-bottom-right-radius: 5px;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.filter-chips span {
  background: #f3f4f6;
  color: #374151;
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 0.76rem;
  font-weight: 700;
}

.chat-results {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.result-card {
  display: block;
  padding: 11px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e5e7eb;
  color: inherit;
  text-decoration: none;
}

.result-card strong,
.result-card span,
.result-card small {
  display: block;
}

.result-card strong {
  color: #111827;
}

.result-card span {
  margin-top: 3px;
  color: #6b7280;
}

.result-card small {
  margin-top: 6px;
  color: var(--primary, #ff385c);
  font-weight: 900;
}

.suggestions {
  display: flex;
  gap: 8px;
  padding: 10px 14px 0;
  background: #fff;
  overflow-x: auto;
}

.suggestions button {
  flex: 0 0 auto;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
  border-radius: 999px;
  padding: 8px 10px;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
}

.chat-input {
  display: grid;
  grid-template-columns: 1fr 42px;
  gap: 9px;
  padding: 12px 14px 14px;
  background: #fff;
}

.chat-input input {
  border: 1px solid #d1d5db;
  border-radius: 999px;
  padding: 12px 14px;
  font: inherit;
}

.chat-input button {
  border: 0;
  border-radius: 999px;
  background: var(--primary, #ff385c);
  color: white;
  font-weight: 900;
  cursor: pointer;
}

.chat-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.typing {
  display: inline-flex;
  gap: 5px;
}

.typing span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #9ca3af;
  animation: blink 1s infinite ease-in-out;
}

.typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@media (max-width: 560px) {
  .ai-widget {
    right: 16px;
    bottom: 16px;
  }

  .chat-panel {
    width: calc(100vw - 32px);
    height: calc(100vh - 48px);
  }
}
</style>
