# Portrait assets

The app uses two portraits:

- `developer-portrait.png` is the developer's supplied photo on the **عن المطوّر** page.
- `memorial-portrait.png` is the late friend's supplied photo on the **صدقة جارية** page.

Replace either PNG at `src/renderer/assets/` using the same filename to update its portrait. Both images are clipped into circular frames with CSS; no face retouching is applied. Adjust `object-position` for `.developer-photo` or `.memorial-photo` in `memorial.css` only if a different crop is needed. A neutral illustrated placeholder appears if an image is missing. The desktop build copies this folder into `dist/renderer/assets`, which is bundled into the installer and portable executable.
