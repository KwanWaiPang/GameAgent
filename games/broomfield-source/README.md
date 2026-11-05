# Broomfield — The Highland Cup
index.html is the whole app (HTML + CSS + JS, no network, no external assets). Sections in order:
matrices & box mesher · palette · static world (build) · GL setup · simulation (step) · audio · lighting/camera · dynamic geometry · render · pixel lettering · HUD · input.
verify.js (Playwright) loads the page, captures console errors, previews, and runs headless matches via window.__run(windKnots).
NOTE: no Three.js — a small purpose-built WebGL box renderer is used instead.
