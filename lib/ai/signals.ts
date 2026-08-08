// Shared between the insights and review prompts — both routes ask the
// model to judge posts from raw numbers, so both need the same reading of
// what those numbers mean. Keep this in one place so the two routes never
// drift into contradictory interpretations of the same signal.
export const SIGNAL_READING_GUIDE = `How to read the signals:
- Low average watch time relative to a post's duration suggests a weak hook or slack pacing.
- A high save rate (saves relative to reach) suggests reference value — people intend to come back to it.
- A high share rate (shares relative to reach) suggests identity value — people are sharing it to say something about themselves.
- Views far above reach suggests rewatching (the same people watching multiple times), not just fresh audience reach.`;
