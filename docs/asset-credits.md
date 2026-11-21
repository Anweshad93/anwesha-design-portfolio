# Game draft asset credits

## Sanctuary of Reflections soundtrack

Music: “The Dervish’s Surrender” by Emand_Edroff (Giovanni Rapiti), [source](https://pixabay.com/music/ambient-the-dervishx27s-surrender-530156/), [Pixabay Content License](https://pixabay.com/service/license-summary/). The game plays a 45-second opening excerpt from `puzzle-five-sanctuary/assets/quiet-reflection-opening.mp3`, with a playback crossfade. Downloaded from Pixabay on 20 November 2026. The source lists the track as AI-generated and describes it as Middle Eastern ambient music with ney and saz and no drums.

## Sanctuary of Reflections inhabitants

The two women use the rigged [Farmer Woman](https://grab3d.com/models/characters/farmer-woman/) and [Elderly Woman](https://grab3d.com/models/characters/elderly-woman/) models by Grab3D, released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Grab3D states that its high-detail models begin with AI-generated meshes and are subsequently reworked. The website's rigged preview meshes were decoded and simplified to approximately 29,000 and 23,000 vertices, with textures resized to 512 pixels; their native walking animation is retained and an idle pose is created from their rigs. Local files are `puzzle-five-sanctuary/assets/characters/farmer-woman.glb` and `puzzle-five-sanctuary/assets/characters/elderly-woman.glb`.

## Historical courtyard visual revision, November 2, 2026

The fortress environment (`game-demo/assets/courtyard.png`) and transparent guardian (`game-demo/assets/guardian.png`) were generated with OpenAI’s built-in image generation tool, directed by Anwesha Das’s approved visual mockup and original storyboard. They are AI-generated project artwork, not assets extracted from Monument Valley, RiME or another game. The guardian image is used as a moving sprite; it is not a fully animated 3D character.

The bridge, brass lever, circular platform, interaction markers and interface are original SVG/CSS/JavaScript created with Codex assistance. The background uses a fixed perspective; the game is a 2D interactive scene with dimensional artwork, not a free-camera 3D environment.

Monument Valley and RiME remain visual references credited in the proposal. Their artwork and audio are not bundled into this draft. There are no third-party libraries or audio assets. Fonts use browser system and Georgia fallbacks.

Generation briefs are recorded in `docs/game-art-prompts.md`. No external asset license is asserted for the generated artwork.

## Actual 3D chapter revision

The active game now uses original procedural geometry and animation created with Codex assistance. Its fortress, bridge, ring, medallion, seal and markers are generated in JavaScript. The procedural guardian was replaced in the November 5 revision. The earlier generated PNG artwork is retained as reference and is not loaded by this version.

Three.js version 0.180.0 and its Reflector helper are bundled under the MIT license. Copyright Three.js authors. Source: https://github.com/mrdoob/three.js/tree/r180 . The local license is `game-demo/vendor/THREE-LICENSE.txt`. Reflector's import path was adjusted to the local bundled library. Short interaction tones are synthesized. The November 5 revision adds the recorded music credited below.

## Casual traveler and guidance revision, November 5, 2026

Character and Walk animation: [Rigged male camper](https://vibeassets.io/a/zpepqtthci), provided under CC0. The source describes a Meshy-generated adult traveler with a plaid shirt, trousers and boots. Local file: `game-demo/assets/casual-traveler.glb`. Adaptations include root-motion removal, a relaxed idle, blended walking and hand placement on the wheel.

Music: “Fluidscape” by Kevin MacLeod (incompetech.com), [source](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100393), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). A 150-second excerpt was compressed with opening and closing fades and reduced playback volume. Local file: `game-demo/assets/fluidscape-loop.mp3`. Music is quieter during discovery dialogs and pauses with the game.

GLTFLoader and BufferGeometryUtils are from Three.js 0.180.0, under the bundled MIT license. Import paths were adjusted for local hosting.

## Illustrated courtyard soundtrack

Music: “Dreams Become Real” by Kevin MacLeod (incompetech.com), [source](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500027), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Local file: `the-unfaithful-reflection-first-draft/assets/dreams-become-real.mp3`. Playback volume is reduced and transitions fade between this track and the edited “Fluidscape” excerpt credited above. Both are credited in the game.

## Moonlit garden soundtrack

Music: “Desert City” by Kevin MacLeod (incompetech.com), [source](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100564), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Local file: `puzzle-two-garden/assets/desert-city.mp3`. The original recording plays at reduced volume and loops; the file itself is unedited.

## Water chamber soundtrack

Music: “Mystery Bazaar” by Kevin MacLeod (incompetech.com), [source](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700005), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Local file: `puzzle-three-chamber/assets/mystery-bazaar.mp3`. The original recording is unedited.

## Hall of False Dawn soundtrack

Music: “Ibn Al-Noor” by Kevin MacLeod (incompetech.com), [source](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100706), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Local file: `puzzle-four-doorway/assets/ibn-al-noor.mp3`. The original file is unedited; the game loops its first 60 seconds with fades and reduced volume.

Music: “Hidden Wonders” by Kevin MacLeod (incompetech.com), [source](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700006), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Local file: `puzzle-four-doorway/assets/hidden-wonders.mp3`. The original file is unedited; the game plays it at reduced volume and fades between tracks.
