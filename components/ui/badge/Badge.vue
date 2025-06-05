<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  variant: {
    type: String,
    default: "default",
    validator: (value: string) =>
      ["default", "secondary", "destructive", "outline"].includes(value),
  },
});

const badgeClasses = computed(() => {
  const base =
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  const variants = {
    default: "bg-primary text-primary-foreground border-transparent shadow",
    secondary: "bg-secondary text-secondary-foreground border-transparent",
    destructive:
      "bg-destructive text-destructive-foreground border-transparent",
    outline: "text-foreground border-border",
  };

  return `${base} ${
    variants[props.variant as keyof typeof variants] || variants.default
  }`;
});
</script>
