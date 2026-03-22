export const HOST = "127.0.0.1";
export const PORT = 3000;

export const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

export const LEARNING_RATE_PRESETS = [
  { id: "stable", label: "Stable", value: 0.05, description: "Slow and steady updates" },
  { id: "balanced", label: "Balanced", value: 0.12, description: "Good default demo speed" },
  { id: "aggressive", label: "Aggressive", value: 0.35, description: "Faster but may overshoot" },
];
