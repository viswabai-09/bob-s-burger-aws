# Images folder

The burger photos, the calorie sheets and `side-logo.jpg` are **not** stored in this repository, because
they are not my own artwork. In the real project they live in the S3 bucket under `images/`.

To run the site with your own pictures, put files with these names in this folder (or in S3 `images/`):

- Logo: `side-logo.jpg`
- Calorie sheets: `calories-twohand.jpg`, `calories-normal.jpg`, `calories-special.jpg`, `calories-bento.jpg`, `calories-loaf.jpg`, `calories-slider.jpg`, `calories-sides-drinks.jpg`
- Burger photos: the file names are written in `site/menu.js` (the `img:` value of each item).

A missing photo is fine: the menu card falls back to an emoji.
