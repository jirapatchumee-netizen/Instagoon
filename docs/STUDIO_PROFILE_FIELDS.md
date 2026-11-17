# Public profile and private AI identity

Studio separates public presentation from one private AI authoring field:

| Draft field | Limit | Destination |
| --- | --- | --- |
| `tagline` | 200 characters | Public card/profile introduction |
| `profileDescription` | 4,000 characters | Public About me section |
| `aiIdentity` | 16,000 characters | Central server-side personality, history, references and background |
| `openingGreeting` | 600 characters | First greeting in chat |

The creator edits one “ตัวตนและข้อมูลสำหรับ AI” field. The separate personality brief, reference biography,
immutable-facts editor and background-story editor are removed. Tone, pronouns and sample dialogue remain
short style controls. The “เนื้อหา & ขอบเขต” tab holds the adult checkbox and the three existing safety rules.

The AI editor shows a neutral placeholder starting with name, optional gender, personality, likes and
dislikes. It continues with games, anime/manga, films/series/music, daily activities, voice, experiences,
dreams, personal details and boundaries. The optional collapsed guide follows the same order and uses
an interest → reason/feeling → personal example pattern. Its fictional example spans several interests
rather than assuming cosplay is the creator's defining topic. All three languages carry the same scope.
The placeholder is a hint, never prefilled identity data; existing creator text is unchanged. It inserts no
invented facts and does not require every topic. The raw text is private authoring data, but the bot may
discuss it naturally: include only information the creator permits it to share.

On read, missing `aiIdentity` merges legacy `characterBrief` (6,000), `referenceBiography` (6,000),
`immutableFacts` (2,000) and `secret` (1,000), preserving all four texts under descriptive headings.
The 16,000-character limit accommodates those previous maximum lengths plus headings. The same pure helper
handles server drafts and older browser-local drafts. Repeated clean/save/reload does not append duplicates.
An explicit modern value, including an empty string, overrides legacy data so clearing it never resurrects
old content. Legacy input keys remain accepted for compatibility, but are not separate runtime sources.

On launch, `definition.personality` contains the central identity plus voice tone, while `biography`
contains public profile copy only. Immutable facts retain automatic age/safety facts; secrets are empty.
Stale legacy authoring text never overrides an explicit new identity. The normal chat and sandbox use this
same definition. Player discovery/profile/mission/chat responses never serialize the private authoring text.
Public profile copy remains explicit and cannot fall back to this private identity.

Profile/persona edits take effect in live chat when the creator updates the published character; existing
live definitions continue working until then. No database migration or protected AI configuration changes
are needed. The NPC contract accepts the combined personality length plus the existing 300-character tone.

The Studio definition's knowledge boundary allows conversation about the creator's stated interests,
reasons, perspective and experiences across topics. General knowledge is separate from personal facts:
the model must not invent an unstated preference, gender or life experience for the creator, or personal
facts about the player. Existing privacy and safety rules continue to apply. Name/gender in the free text
do not automatically change the public profile or add structured API fields. Creator category and career
metadata remain unchanged; an explicitly configured opening scene is preserved.

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
