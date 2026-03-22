<template>
  <router-view />
</template>

<style>
:root {
  --bg: #f7f7f7;
  --card: #ffffff;
  --text: #222222;
  --muted: #6b7280;
  --border: #ebebeb;
  --primary: #ff385c;
  --primary-dark: #e31c5f;
  --success: #16a34a;
  --danger: #dc2626;
  --shadow: 0 12px 30px rgba(17, 24, 39, 0.06);
  --radius-xl: 24px;
  --radius-lg: 18px;
  --radius-md: 14px;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  margin: 0;
  min-height: 100%;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  background: var(--bg);
  color: var(--text);
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input {
  font: inherit;
}
</style>
