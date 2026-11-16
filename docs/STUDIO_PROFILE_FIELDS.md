# Public profile and private AI brief

Studio has four separate authoring fields:

| Draft field | Limit | Destination |
| --- | --- | --- |
| `tagline` | 200 characters | Public card/profile introduction (`definition.tagline`, `creators.bio`) |
| `profileDescription` | 4,000 characters | Public About me section (`definition.biography`, profile API `creator.bio`) |
| `characterBrief` | 6,000 characters | Server-side persona (`definition.personality`, alongside `voiceTone`) |
| `openingGreeting` | 600 characters | First greeting displayed in chat, separate from profile copy |

The private brief informs generated replies. Its text is not serialized into Player discovery, profile,
mission or chat API responses. It is editable/readable through the owner's existing authenticated Studio
draft endpoints. Use the existing secret/level mechanism for facts that must be disclosed gradually;
the character brief is personality guidance, not a promise that the AI can never mention its contents.

Old drafts remain compatible: an absent tagline defaults to the first 200 characters of legacy `concept`,
an absent profile description defaults to that concept, and an absent brief stays empty. Explicit empty
modern fields remain empty on save/reload and missing public fields block launch. Public fields never
fall back to a private brief. Existing live characters are updated only when their creator republishes.

No database/schema migration or protected AI configuration change is needed: drafts and definitions use
existing JSON columns and existing NPC contract fields. The normal DM pipeline receives the private persona;
AI-assisted Lv.1-5 authoring also receives the distinct profile/brief fields.
