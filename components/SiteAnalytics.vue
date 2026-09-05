<template><span hidden aria-hidden="true"></span></template>
<script setup lang="ts">
const route = useRoute();
const analytics = useShopAnalytics();
let lastTrackedPath: string | null = null;
function trackPage() {
  // The watcher observes the path, never queries or hashes. Do not replay visits made before consent.
  if (route.path === lastTrackedPath) return;
  if (analytics.trackSite("page_view", route.path)) lastTrackedPath = route.path;
}
onMounted(trackPage);
watch(() => route.path, () => { lastTrackedPath = null; trackPage(); });
watch(analytics.consent, trackPage);
</script>
