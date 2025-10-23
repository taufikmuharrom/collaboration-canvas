<script setup lang="ts">
import { RouterView } from 'vue-router'

import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const yStatus = ref<'connected' | 'disconnected' | 'connecting'>('connecting')
let yProvider: WebsocketProvider | null = null

onMounted(() => {
  const doc = new Y.Doc()
  const defaultWsUrl = import.meta.env.DEV
    ? 'ws://localhost:3001/ws'
    : `${window.location.origin.replace('http', 'ws')}/ws`
  const url = import.meta.env.VITE_YWS_URL || defaultWsUrl
  const room = import.meta.env.VITE_YWS_ROOM || 'demo'
  yProvider = new WebsocketProvider(url, room, doc)
  yProvider.on('status', (e: { status: 'connected' | 'disconnected' | 'connecting' }) => {
    yStatus.value = e.status
  })
})

onBeforeUnmount(() => {
  yProvider?.destroy()
})
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <div class="yjs-status" :class="yStatus">
        Yjs:
        {{
          yStatus === 'connected'
            ? 'Connected'
            : yStatus === 'connecting'
              ? 'Connecting…'
              : 'Disconnected'
        }}
      </div>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

.yjs-status {
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.yjs-status.connected {
  color: #2ecc71;
}

.yjs-status.connecting {
  color: #f1c40f;
}

.yjs-status.disconnected {
  color: #e74c3c;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
