import {
  mobileEventForRequest,
  mobileMetricResult,
  recordMobileProductEvent,
} from "../utils/mobile-observability";

export default defineEventHandler((event) => {
  const eventName = mobileEventForRequest(event.path, event.method);
  if (!eventName) return;
  const startedAt = performance.now();
  event.node.res.once("finish", () => {
    recordMobileProductEvent(
      eventName,
      mobileMetricResult(event.node.res.statusCode),
      (performance.now() - startedAt) / 1_000,
    );
  });
});
