# WWTA Stop Point - March 26, 2026

Branch: `codex/wwta-view-scope`

Current state:
- Standalone `What We Talked About` view is running on the latest site branch.
- Hamptons remains the visual reference for the full-screen treatment.
- Other clubs are using the shared Maplewood/SOMa blurred backdrop with a framed center photo treatment.
- Topic text types in, photo transitions are slowed down, and the handwritten `Change Frame` control is placed on the bottom of the frame.
- Frame swapping is wired, including white/black handwritten label variants.

Still open:
- Black frame default is not visually landing yet in the browser the way we want.
- Other clubs are still not using true reusable empty Polaroid frame overlays; the current system is still partially CSS-driven.
- Center-safe word placement still needs one more pass so words stay off faces and off the image lane.
- Instagram/Reel images with baked-in text still need better crop logic or filtering.
- Final photo transition still needs one more polish pass.
- `Clean view` without recap text has not been built yet.
- Ben sample with matched center-photo Gaussian background has not been finalized yet.

Tomorrow's first fixes:
1. Fix black-frame default so all clubs visibly start on black.
2. Replace CSS-built frame treatment with true scanned Polaroid overlay assets if possible.
3. Finish center-safe text spacing.
4. Finalize frame-swap interaction and handwritten label placement.
5. Add a clean image-only mode.
6. Make a Ben sample using the center photo as the blurred background.
7. Confirm placement/navigation after Ben feedback.

Useful local URLs:
- Main preview: `http://127.0.0.1:8890/what-we-talked-about.html`
- Amsterdam: `http://127.0.0.1:8890/what-we-talked-about.html?city=amsterdam`
- Berlin: `http://127.0.0.1:8890/what-we-talked-about.html?city=berlin`

Notes:
- Handwritten frame-swap assets live in `assets/ui/`.
- Reusable Polaroid backdrop assets live in `assets/polaroid-backdrops/`.
- Current branch includes unpushed local work only.
