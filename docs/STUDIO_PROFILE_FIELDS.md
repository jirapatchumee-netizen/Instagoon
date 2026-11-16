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
draft endpoints. Use the existing secret/level mechanism for facts that must be disclosed gradually;
the character brief is personality guidance, not a promise that the AI can never mention its contents.

Old drafts remain compatible: an absent tagline defaults to the first 200 characters of legacy `concept`,
an absent profile description defaults to that concept, and absent brief/reference fields stay empty. Explicit empty
modern fields remain empty on save/reload and missing public fields block launch. Public fields never
fall back to a private brief. Existing live characters are updated only when their creator republishes.

No database migration or protected AI configuration change is needed: drafts and definitions use existing JSON
columns. The NPC contract adds an optional public `profileDescription` so the fuller AI biography cannot be
mistaken for public profile copy. Old Studio definitions without it retain their existing public biography.
The normal DM and sandbox pipelines receive the persona and reference biography through existing prompt slots;
AI-assisted Lv.1-5 authoring also receives the separate inputs.

The reference editor has concise always-visible guidance and an optional, collapsed native disclosure with
six topic prompts, a fact → reason/feeling → example writing pattern, and a clearly fictional example.
It never inserts invented facts or overwrites the creator's text. It remains optional and has a 6,000-character
limit; there is no word-count quality score or requirement to fill every topic.
