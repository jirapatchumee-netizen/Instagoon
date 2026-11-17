# Public profile and private AI brief

Studio has five separate authoring fields:

| Draft field | Limit | Destination |
| --- | --- | --- |
| `tagline` | 200 characters | Public card/profile introduction (`definition.tagline`, `creators.bio`) |
| `profileDescription` | 4,000 characters | Public About me section (`definition.profileDescription`, profile API `creator.bio`) |
| `characterBrief` | 6,000 characters | Server-side persona (`definition.personality`, alongside `voiceTone`) |
| `referenceBiography` | 6,000 characters | Reference history/facts combined with public copy in server-side `definition.biography` |
| `openingGreeting` | 600 characters | First greeting displayed in chat, separate from profile copy |

The private brief informs generated replies. Reference facts give the model real experiences and context
to draw on; their raw authoring text is not displayed as a block on the profile, but the AI may discuss
them in chat. The creator should include only facts they permit it to share. Neither raw field is serialized into Player discovery, profile,
mission or chat API responses. It is editable/readable through the owner's existing authenticated Studio
draft endpoints. The background/story field can be shared naturally in conversation at any reward level;
it is not a vault for confidential personal data. The character brief is personality guidance, not a
promise that the AI can never mention its contents.

Old drafts remain compatible: an absent tagline defaults to the first 200 characters of legacy `concept`,
an absent profile description defaults to that concept, and absent brief/reference fields stay empty. Explicit empty
modern fields remain empty on save/reload and missing public fields block launch. Public fields never
fall back to a private brief. Profile and persona field edits go live only when the creator republishes.

No database migration or protected AI configuration change is needed: drafts and definitions use existing JSON
columns. The NPC contract adds an optional public `profileDescription` so the fuller AI biography cannot be
mistaken for public profile copy. Old Studio definitions without it retain their existing public biography.
The normal DM and sandbox pipelines receive the persona and reference biography. Per-level speaking-style
authoring and its paid AI assistant have been removed; old clients receive HTTP 410 without an energy charge.

The reference editor has concise always-visible guidance and an optional, collapsed native disclosure with
six topic prompts, a fact → reason/feeling → example writing pattern, and a clearly fictional example.
It never inserts invented facts or overwrites the creator's text. It remains optional and has a 6,000-character
limit; there is no word-count quality score or requirement to fill every topic.

## Reward levels and adult permission

Studio levels unlock rewards only. Creator credit costs remain four incremental steps (defaults 100, 200,
300, 400), now edited in Gallery & Rewards. Existing paid progress, pinned costs, receipts and reward
conditions remain intact. One successful charged DM still earns one credit; sandbox turns earn none.

The normal DM lane uses the central personality, reference biography, tone, pronouns and actual history.
It does not send the numerical reward level or score to the model, select a per-level style, gate the
background by level, or invoke the legacy romance-level template. This applies immediately to existing
live Studio credit cards as well as newly published cards. File-authored legacy characters retain their
existing relationship behavior. Old per-level dialogue is retained in the owner's draft for reference,
but is not used in the published persona. The sandbox no longer simulates emotional levels.

`adultContent` is one boolean in the draft and the credit progression contract. Explicit false always
wins. For an old draft or live Studio definition without the new field, any true value in the old five
`adultLevels` flags becomes permission for the whole character; all-false/missing flags stay off.
The creator can revoke permission by updating the character. Player age checks and explicit per-chat
opt-in still apply before energy is charged. Reward level neither unlocks nor enables adult mode.
With adult mode off, the shared inline prompt requests non-explicit conversation and excludes its legacy
adult tone-scaling block. With it on, the existing adult-mode integration receives the explicit switch.

No D1 schema migration is needed: legacy JSON is interpreted on read, and modern saves write the new
boolean. The shared NPC contract retains optional legacy flags so older content bundles remain valid.
