/**
 * Feature flags. Flip these via NEXT_PUBLIC_* env vars (inlined at build time).
 *
 * Keep one place to gate not-yet-ready features so they can be hidden in prod
 * but turned on locally for development.
 */
export const featureFlags = {
  /**
   * MajlisMate Live — real-time voice conversation (orb + live sheet).
   * On hold until ready, so HIDDEN by default. Enable by setting
   * `NEXT_PUBLIC_ENABLE_LIVE_VOICE=true` in the environment.
   */
  liveVoice: process.env.NEXT_PUBLIC_ENABLE_LIVE_VOICE === 'true'
};
