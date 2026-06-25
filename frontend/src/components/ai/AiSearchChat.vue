<template>
  <div class="ai-widget">
    <button
      v-if="!isOpen"
      class="chat-fab"
      type="button"
      aria-label="Open AI assistant"
      @click="openChat"
    >
      <span class="chat-fab__icon">✦</span>
      <span class="chat-fab__text">AI</span>
    </button>

    <section v-else class="chat-panel">
      <div class="chat-header">
        <div class="chat-header__left">
          <div class="assistant-avatar">✦</div>
          <div>
            <strong>Ask mStay</strong>
            <p>AI-powered stay search</p>
          </div>
        </div>

        <button class="close-btn" type="button" @click="isOpen = false">✕</button>
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
              <span v-if="msg.filters.maxPrice">≤ {{ msg.filters.maxPrice }}</span>
              <span v-for="a in msg.filters.amenities" :key="a">✨ {{ a }}</span>
            </div>

            <div v-if="msg.results?.length" class="chat-results">
              <RouterLink
                v-for="listing in msg.results.slice(0, 3)"
                :key="listing.listingId"
                :to="`/listings/${listing.listingId}`"
                class="result-card"
              >
                <div class="result-card__media">
                  <img :src="getListingImage(listing)" :alt="listing.title" />
                  <span class="match-badge">{{ listing.score }}%</span>
                </div>

                <div class="result-card__body">
                  <div class="result-card__top">
                    <strong>{{ listing.title }}</strong>
                    <span class="rating">★ AI</span>
                  </div>

                  <span class="result-location">
                    {{
                      listing.locationTitle || listing.location || 'Location available in details'
                    }}
                  </span>

                  <small class="result-meta">
                    <template v-if="listing.propertyType">{{ listing.propertyType }}</template>
                    <template v-if="listing.guestCount">
                      · {{ listing.guestCount }} guests</template
                    >
                    <template v-if="listing.bedrooms"> · {{ listing.bedrooms }} bedroom</template>
                  </small>

                  <p v-if="listing.reasons?.length" class="result-reason">
                    {{ listing.reasons[0] }}
                  </p>
                </div>
              </RouterLink>
            </div>
          </div>
        </div>

        <div v-if="loading" class="message-row">
          <div class="message message--ai typing"><span></span><span></span><span></span></div>
        </div>
      </div>

      <div class="suggestions">
        <button
          type="button"
          @click="
            useSuggestion('Find me an apartment in Pula for 2 people with kitchen and parking')
          "
        >
          Pula apartment
        </button>
        <button
          type="button"
          @click="useSuggestion('Show me stays with WiFi, TV and air conditioning')"
        >
          WiFi + TV + AC
        </button>
        <button type="button" @click="useSuggestion('I need a pet friendly stay with workspace')">
          Pet friendly
        </button>
      </div>

      <form class="chat-input" @submit.prevent="sendMessage">
        <input v-model="message" type="text" placeholder="Ask for a stay, amenity, city..." />
        <button :disabled="loading || !message.trim()" type="submit">➤</button>
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
    text: 'Hi! I can help you find the best stay by location, amenities, capacity or travel style.',
  },
])

function openChat() {
  isOpen.value = true
  scrollToBottom()
}

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

function getListingImage(listing) {
  const roomImage = listing.sleepingArrangements?.find((x) => x.imageUrl)?.imageUrl

  return (
    listing.imageUrls?.[0] ||
    listing.imageUrl ||
    listing.coverImage ||
    roomImage ||
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80'
  )
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
      text: 'AI search is currently unavailable. Please try again later.',
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
  position: relative;
  width: 70px;
  height: 70px;
  border: 0;
  border-radius: 999px;
  background:
    radial-gradient(circle at 25% 20%, rgba(255, 255, 255, 0.5), transparent 24%),
    linear-gradient(135deg, var(--primary, #ff385c), #111827);
  color: white;
  cursor: pointer;
  box-shadow: 0 22px 55px rgba(15, 23, 42, 0.3);
  display: grid;
  place-items: center;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease;
}

.chat-fab::after {
  content: '';
  position: absolute;
  inset: -7px;
  border-radius: inherit;
  border: 1px solid rgba(255, 56, 92, 0.25);
  animation: pulse 1.8s infinite;
}

.chat-fab:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.36);
}

.chat-fab__icon {
  position: absolute;
  top: 13px;
  font-size: 1rem;
}

.chat-fab__text {
  margin-top: 14px;
  font-weight: 950;
  font-size: 1rem;
  letter-spacing: 0.04em;
}

.chat-panel {
  width: min(430px, calc(100vw - 32px));
  height: min(680px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.28);
  border: 1px solid rgba(229, 231, 235, 0.9);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px;
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.26), transparent 28%),
    linear-gradient(135deg, #111827, var(--primary, #ff385c));
  color: white;
}

.chat-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.assistant-avatar {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.22);
  font-weight: 900;
}

.chat-header strong {
  display: block;
  font-size: 1.05rem;
}

.chat-header p {
  margin: 3px 0 0;
  opacity: 0.84;
  font-size: 0.85rem;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.chat-box {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  background:
    radial-gradient(circle at top left, rgba(255, 56, 92, 0.05), transparent 24%), #fafafa;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}

.message-row--user {
  justify-content: flex-end;
}

.message {
  max-width: 88%;
  border-radius: 20px;
  padding: 12px 14px;
  font-size: 0.92rem;
  line-height: 1.48;
}

.message p {
  margin: 0;
}

.message--ai {
  background: white;
  color: #111827;
  border: 1px solid #ececec;
  border-bottom-left-radius: 7px;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.message--user {
  background: #111827;
  color: white;
  border-bottom-right-radius: 7px;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.16);
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 11px;
}

.filter-chips span {
  background: #f3f4f6;
  color: #374151;
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 0.75rem;
  font-weight: 750;
}

.chat-results {
  display: grid;
  gap: 10px;
  margin-top: 13px;
}

.result-card {
  display: grid;
  grid-template-columns: 82px 1fr;
  gap: 11px;
  padding: 9px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #e5e7eb;
  color: inherit;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.result-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 56, 92, 0.32);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.09);
}

.result-card__media {
  position: relative;
  height: 82px;
  border-radius: 14px;
  overflow: hidden;
  background: #f3f4f6;
}

.result-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.match-badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 4px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #111827;
  font-size: 0.7rem;
  font-weight: 900;
}

.result-card__body {
  min-width: 0;
}

.result-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.result-card strong {
  display: block;
  color: #111827;
  font-size: 0.9rem;
  line-height: 1.25;
}

.rating {
  color: var(--primary, #ff385c);
  font-size: 0.72rem;
  font-weight: 900;
  white-space: nowrap;
}

.result-location {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 0.8rem;
  line-height: 1.3;
}

.result-meta {
  display: block;
  margin-top: 4px;
  color: #717171;
  font-size: 0.76rem;
  line-height: 1.3;
}

.result-reason {
  margin-top: 6px !important;
  color: #111827;
  font-size: 0.76rem;
  font-weight: 750;
  line-height: 1.3;
}

.suggestions {
  display: flex;
  gap: 8px;
  padding: 11px 14px 0;
  background: #fff;
  overflow-x: auto;
  scrollbar-width: none;
}

.suggestions::-webkit-scrollbar {
  display: none;
}

.suggestions button {
  flex: 0 0 auto;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
  border-radius: 999px;
  padding: 8px 11px;
  font-size: 0.78rem;
  font-weight: 850;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.suggestions button:hover {
  background: #f9fafb;
  border-color: rgba(255, 56, 92, 0.3);
  transform: translateY(-1px);
}

.chat-input {
  display: grid;
  grid-template-columns: 1fr 44px;
  gap: 9px;
  padding: 12px 14px 14px;
  background: #fff;
  border-top: 1px solid #f2f2f2;
}

.chat-input input {
  min-width: 0;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  padding: 12px 15px;
  font: inherit;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.chat-input input:focus {
  border-color: rgba(255, 56, 92, 0.55);
  box-shadow: 0 0 0 4px rgba(255, 56, 92, 0.1);
}

.chat-input button {
  border: 0;
  border-radius: 999px;
  background: var(--primary, #ff385c);
  color: white;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 12px 22px rgba(255, 56, 92, 0.22);
}

.chat-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.typing {
  display: inline-flex;
  gap: 5px;
  align-items: center;
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

@keyframes pulse {
  0% {
    opacity: 0.7;
    transform: scale(0.95);
  }

  70% {
    opacity: 0;
    transform: scale(1.18);
  }

  100% {
    opacity: 0;
    transform: scale(1.18);
  }
}

@media (max-width: 560px) {
  .ai-widget {
    right: 14px;
    bottom: 14px;
  }

  .chat-panel {
    width: calc(100vw - 28px);
    height: calc(100vh - 44px);
    border-radius: 26px;
  }

  .result-card {
    grid-template-columns: 76px 1fr;
  }

  .result-card__media {
    height: 76px;
  }
}
</style>
