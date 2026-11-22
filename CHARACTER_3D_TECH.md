# Hell Fall · Home-Only 3D Character Visual Spec (WEB 0.9)

## Identity lock
Source of truth is `assets/hero_intro.webp` (797×1170 RGBA), retained completely unmodified. In a head-on rotation, all original colors, facial linework, clothes, limbs, red cape and the V-sign remain texture-mapped from that precise asset. In-game fall/jump sprites are unchanged.

## Geometry vs. image-plane
Do not replace this with CSS `rotateY` of a rectangle. `assets/hero_sculpt.bin.gz` is a closed volumetric mesh assembled from the alpha silhouette and smooth body-part-based 3D depth, containing ~54.4k spatial vertices and ~59.9k real triangles. Surface positions include distinct X, Y and Z values; yaw rotation is performed on spatial coordinates using WebGL2, with depth testing and normals for lighting. The original front image maps to the front surface. A separately drawn inferred back texture maps to the back. Slow cloak wavering changes vertex positions rather than switching sprite frames.

## Limitation (do not oversell)
This is an original-image-based 3D sculpture, not a rigged body with skeleton and accurate unseen anatomy. Because the approved artwork only showed the front, side and rear topology, texture, and outfit panels are approximations. No true 3D purchase/equipment meshes yet. Before paid release, improve the face/profile, limbs and backing geometry from a full multi-view reference or custom modeled character.

## UX
The viewer appears only in the home READY lobby. Drag horizontally for 360° rotation; no vertical tilt. Keys Left/Right rotate ±15°, Home resets front. On devices with no WebGL2, the static original portrait is shown rather than a fake turning paper sprite. The viewer does not alter the browser's persisted game record, coins or user preferences.