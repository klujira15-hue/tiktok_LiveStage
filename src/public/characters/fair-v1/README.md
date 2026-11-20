# Fair character animation kit

Open /characters/fair-v1/preview.html from the running LiveStage server.

The four original PNG sheets are preserved byte for byte in source/. Animator.js removes their green background during canvas rendering and computes tight bounds per frame. All poses use one scale per character and a bottom-center anchor.

Use FairCharacters.Character.load(manifest.characters[i]), then character.draw(context, {x, y, height, time, action}). The x/y point is the character's feet. Time is in milliseconds. Available actions are listed per character in manifest.json. Missing actions fall back to idle in the runtime, while the preview only offers supported actions.

Dance animation cycles through the supplied poses with rhythmic sway. These are eight distinct poses, not an anatomically continuous walk cycle or a multi-direction rig. Movement on the temple map is an independent route preview. A separate set of walking and sitting poses is still needed for polished walking and Ferris-wheel boarding.

The preview exports an eight-second WebM from a canvas stream without audio. Its video background is dark; individual canvases are transparent. No current LIVE configuration, gifts, scores or sessions are modified.

## Walking v2

Generated with built-in imagegen from the user walking reference, saved as source/walk-cycle-v2.png. Prompt: preserve the four character identities and costumes; four rows by four columns, one character per row; alternating left contact, passing, right contact, opposite passing; upright torso, restrained arm swing, consistent side view and scale, clean transparent background.

Walking uses separate authored frames, a fixed per-row foot baseline and scale, and no canvas rotation. The map advances the walk clock only by traveled distance, mirrors the sprite when moving left, and stops walking at the destination. This is a four-frame side-view loop; rear-facing and diagonal artwork is not included. Original emotion sheets and current LIVE remain untouched.

## Activity poses v3

Built-in imagegen produced twelve poses per character in separate 4x3 transparent atlases: neutral queue stance, kneeling wai, bench seat, rising, two ramwong gestures, two sparkler holds, lantern hold/release, krathong hold/release. Exact generation prompt: activity-prompts.txt. Existing walking and emotion assets remain.

activity-runtime.js exports definitions, zoneActions, sample and draw. Activity clocks reset at arrival; release actions have separate empty-hand poses so the floating prop is independent. Preview queue wait is two seconds before the wheel boarding location; wheel image is still static, no rotating ride or real viewer queue. No LIVE configuration is modified.

## v4 supersedes walk and prayer/dance limits above

See V4-CHARACTERS.md and v4-prompts.txt. All four characters now have real front/rear walk frames plus side views. Each has a separate eight-pose signature atlas and unique timing for prayer and dance. The preview uses a 2x2 showcase so broad arm poses remain visible. Other activities remain available.
