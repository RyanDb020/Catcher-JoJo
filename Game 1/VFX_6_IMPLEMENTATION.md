# VFX & Animation Impact Overhaul 6.0

Scope: Arcade Canvas2D animation/effects in `Game 1`. Character atlases, MP3/Ogg files, controls, scoring, save data and 3D Combat Mode are retained.

## Baseline

Reviewed extracted sequences from both supplied recordings (51.8333 and 105.9 seconds), including a one-second sampling of the second recording's Time Stop. The baseline has a dominant central dial, large static character poses, thin energy outlines, facade fragments and a fairly flat cosmic fly-through. This update changes the existing rendering functions rather than adding another independent overlay system.

## Implemented

- ORA/MUDA: continuous anticipation, accelerating extension, contact and recoil; alternating hands with deterministic per-strike angles; trails sampled from earlier trajectory positions; knuckle glow; contact rays/waves; hot streaks, tumbling chips and slower dust; floor bounce-light and projected shadows. The final strike uses a longer reach, larger fist and stronger secondary reaction.
- Time Stop: smaller peripheral dial; golden moving light front; regional illumination; horizontal backdrop refraction; sharp stationary shards; ball residual motion settles individually when the front arrives. Release fragments spread outward and object reactions fire with distance-dependent delays.
- Made in Heaven: branching lightning with luminous cores, travelling body-local energy, developing spatial tears and background waves.
- Collapse: successive facade impact events, ballistic chips/dust and light reactions layered into the retained independently detaching building and floor sections. Reverse-playback still uses recorded actual ball/catcher history.
- Singularity: different orbital velocities in a particulate accretion disc; curved infall streaks; incoming matter and radial energy releases; existing horizon occlusion and lens arcs retained.
- Rebirth: existing darkness retained; brief purpose-timed Big Bang flash; three staggered shock fronts; growing galaxies now pass outward with stronger depth/parallax during the flight.
- Existing Options controls for reduced effects/motion, flashes and shake are reused. Reduced mode disables ball residual motion, suppresses full-frame flashes/shake, slows star motion and limits fragment counts and cosmic flight.
- Script cache versions updated so previously loaded clients request the new animation code.

## Important implementation boundaries

This is procedural Canvas2D choreography, not a new physics engine or full-scene shader renderer. Floor shadows and bounce-light are drawn effects. Building collapse remains cinematic geometry. Time Stop's gameplay physics pause begins at activation as before: the progressive freeze is render-only, so balls cannot score, miss or damage lives during the reveal. Rewind is a visual replay of real history; it does not reverse saved score/progression. Audio files and audio clocks have not been replaced or shortened.

## Verification

`npm test` covers existing gameplay, cinematic lifecycle, audio cleanup, character atlases, responsive rendering and unchanged 3D logic, plus new VFX 6 trajectory/contact/debris/front tests. The complete browser test runs scenes in real time, muted, without jumping the cinematic phase; checks actual frozen ball/particle/sky data, return to gameplay, reduced mode, pause and skipping; records screenshots and a video.

Browser verification runs in GitHub Actions because Chromium was unavailable locally and the local browser download returned an invalid archive. Visual acceptance and measured frame timing are recorded after the remote run completes. No claim is made that screenshot assertions alone establish subjective cinematic quality.
