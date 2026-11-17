// The narration voices treader uses (Kokoro). Shared by the player, the admin panel and the server.
export const VOICES = {
  bm_george: { name: "George", accent: "British" },
  af_heart: { name: "Heart", accent: "American" },
} as const;

export type VoiceId = keyof typeof VOICES;
export const VOICE_IDS = Object.keys(VOICES) as VoiceId[];
export const isVoice = (v: unknown): v is VoiceId => typeof v === "string" && v in VOICES;
export const voiceName = (v: string) => (isVoice(v) ? VOICES[v].name : v);
