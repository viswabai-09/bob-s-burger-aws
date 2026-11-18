// Bob's Burger - site text and menu data - Version 1.7
// To change the quote or slogan, edit SITE below. Prices are in Indian rupees (INR). Change them freely,
// but keep the ids and prices in step with MENU in app.py (the server uses its own prices).
// "img" is optional: add a photo with img: "images/tender-beef.jpg".
// "pos" is optional: which part of the photo to keep in the frame, "center top", "center bottom" or "50% 80%" (default is the middle).
// "sheet" is the calorie-sheet picture shown in the "more info" window (one sheet per category).
// "serves" and "kcal" are shown in the "more info" window. "includes" is a list shown for share boxes.
window.SITE = {
  logo: "images/side-logo.jpg",
  name: "Bob's Burger",
  slogan: "Stacked high. Grilled fresh. Made to be shared.",
  quote: "I love you all. Even when I hate you.",
  quoteBy: "Bob Belcher, Bob's Burgers"
};

window.CATEGORIES = [
  { key: "twohand", label: "Two Hand Burger",    note: "Big enough to need both hands. Serves 1 to 2." },
  { key: "normal",  label: "Normal Burger",      note: "The everyday classics. Serves 1." },
  { key: "special", label: "The Special Burger", note: "Our signature smoky stacks. Serves 1." },
  { key: "share",   label: "Share Burger",       note: "Three burgers, fries, dips and drinks in one box. Serves 3 to 5." },
  { key: "drink",   label: "Drinks",             note: "Cold 750 ml bottles." }
];

// Calorie-sheet pictures (shown in the more-info window)
var SHEET = {
  twohand: "images/calories-twohand.jpg",
  normal:  "images/calories-normal.jpg",
  special: "images/calories-special.jpg",
  bento:   "images/calories-bento.jpg",
  loaf:    "images/calories-loaf.jpg",
  slider:  "images/calories-slider.jpg",
  sides:   "images/calories-sides-drinks.jpg"
};

// What every share box comes with
var SHARE_INCLUDES = ["3 burgers in the meat you choose (3 sections in the Pull-Apart Loaf)", "2 medium fries", "4 dips", "2 drinks (750 ml each, Coke or Pepsi)"];

// Share burgers: ONE card per style on the menu. The customer picks Beef, Chicken or Fish inside the
// more-info window; each choice is its own item below (SH01 to SH09) with its own price.
window.GROUPS = {
  bento:  { img: "images/bento-style-share-box.jpg", name: "Bento-Style Share Box",              emoji: "🍱", desc: "Three normal burgers in a bento-style box, with 2 medium fries, 4 dips and 2 drinks. Pick your meat." },
  loaf:   { img: "images/the-pull-apart-loaf.jpg", pos: "center bottom", name: "The Pull-Apart Loaf",                emoji: "🥖", desc: "A warm 3-section loaf with melted cheese and butter glaze, with 2 medium fries, 4 dips and 2 drinks. Pick your meat." },
  slider: { img: "images/slider-fligh-ton-a-wooden-paddle.jpg", name: "Slider Flight on a Wooden Paddle",   emoji: "🍔", desc: "Three sliders on soft brioche buns, served on a wooden paddle with 2 medium fries, 4 dips and 2 drinks. Pick your meat." }
};

window.MENU = [
  // ---- TWO HAND BURGER (serves 1 to 2) ----
  { id: "TH01", img: "images/tender-beef-burger.jpg", cat: "twohand", type: "Beef",    name: "Tender Beef Burger",        desc: "Slow-cooked tender beef, cheddar, crisp lettuce and house sauce.", price: 279, emoji: "🍔", serves: "1 to 2", kcal: "550 – 650 kcal",  sheets: [SHEET.twohand] },
  { id: "TH02", img: "images/bbq-beef-burger.jpg", cat: "twohand", type: "Beef",    name: "BBQ Beef Burger",           desc: "Thick beef patty glazed in smoky BBQ sauce with onion rings.",     price: 299, emoji: "🍔", serves: "1 to 2", kcal: "650 – 850 kcal",  sheets: [SHEET.twohand] },
  { id: "TH03", img: "images/12 -o-crisp-chicken-burger.jpg", cat: "twohand", type: "Chicken", name: "12 O Crisp Chicken Burger", desc: "Extra-crunchy fried chicken fillet, pickles and creamy mayo.",     price: 249, emoji: "🍔", serves: "1 to 2", kcal: "510 – 700 kcal",  sheets: [SHEET.twohand] },
  { id: "TH04", img: "images/big-fish-burger.jpg", pos: "center bottom", cat: "twohand", type: "Fish",    name: "Big Fish Burger",           desc: "Giant golden fish fillet, tartar sauce and fresh lettuce.",        price: 279, emoji: "🍔", serves: "1 to 2", kcal: "520 – 600 kcal",  sheets: [SHEET.twohand] },

  // ---- NORMAL BURGER (serves 1) ----
  { id: "NB01", img: "images/classic-beef-burger.jpg", cat: "normal", type: "Beef",    name: "Classic Beef Burger",       desc: "Grilled beef patty, tomato, lettuce and our classic sauce.",  price: 149, emoji: "🍔", serves: "1", kcal: "310 – 420 kcal", sheets: [SHEET.normal] },
  { id: "NB02", img: "images/spice-beef-burger.jpg", cat: "normal", type: "Beef",    name: "Spice Beef Burger",         desc: "Beef patty with spicy seasoning, jalapeños and pepper jack.", price: 169, emoji: "🍔", serves: "1", kcal: "380 – 500 kcal", sheets: [SHEET.normal] },
  { id: "NB03", img: "images/red-pepper-chicken-burger.jpg", cat: "normal", type: "Chicken", name: "Red Pepper Chicken Burger", desc: "Crispy chicken with a red pepper kick and cool mayo.",        price: 149, emoji: "🍔", serves: "1", kcal: "420 – 520 kcal", sheets: [SHEET.normal] },
  { id: "NB04", img: "images/invert-chicken-burger.jpg", cat: "normal", type: "Chicken", name: "Some Chicken Burger",       desc: "Our simple, juicy chicken burger with lettuce and mayo.",     price: 129, emoji: "🍔", serves: "1", kcal: "350 – 450 kcal", sheets: [SHEET.normal] },
  { id: "NB05", img: "images/some-fish-burger.jpg", cat: "normal", type: "Fish",    name: "Some Fish Burger",          desc: "Crispy fish fillet with tartar sauce on a soft bun.",         price: 159, emoji: "🍔", serves: "1", kcal: "340 – 410 kcal", sheets: [SHEET.normal] },

  // ---- THE SPECIAL BURGER (serves 1) ----
  { id: "SP01", img: "images/12-o-smokey-beef-burger.jpg", cat: "special", type: "Beef",    name: "12 O Smokey Beef Burger", desc: "Flame-smoked beef, smoked cheese and caramelised onions.", price: 349, emoji: "🍔", serves: "1", kcal: "480 – 620 kcal", sheets: [SHEET.special] },
  { id: "SP02", img: "images/12-spice-chicken-burger.jpg", cat: "special", type: "Chicken", name: "12 Spice Chicken Burger", desc: "Twelve-spice fried chicken, hot sauce glaze and slaw.",    price: 329, emoji: "🍔", serves: "1", kcal: "440 – 560 kcal", sheets: [SHEET.special] },

  // ---- SHARE BURGER (serves 3 to 5): 3 burgers + 2 medium fries + 4 dips + 2 drinks ----
  { id: "SH01", group: "bento", cat: "share", type: "Beef",    name: "Bento-Style Share Box - Beef",    desc: "Three normal beef burgers in a bento-style box, with fries, dips and drinks.",    price: 699, emoji: "🍱", serves: "3 to 5", kcal: "2,680 – 3,250 kcal (whole box)", includes: SHARE_INCLUDES, sheets: [SHEET.bento, SHEET.sides] },
  { id: "SH02", group: "bento", cat: "share", type: "Chicken", name: "Bento-Style Share Box - Chicken", desc: "Three normal chicken burgers in a bento-style box, with fries, dips and drinks.", price: 649, emoji: "🍱", serves: "3 to 5", kcal: "2,710 – 3,280 kcal (whole box)", includes: SHARE_INCLUDES, sheets: [SHEET.bento, SHEET.sides] },
  { id: "SH03", group: "bento", cat: "share", type: "Fish",    name: "Bento-Style Share Box - Fish",    desc: "Three normal fish burgers in a bento-style box, with fries, dips and drinks.",    price: 679, emoji: "🍱", serves: "3 to 5", kcal: "2,650 – 3,130 kcal (whole box)", includes: SHARE_INCLUDES, sheets: [SHEET.bento, SHEET.sides] },

  { id: "SH04", group: "loaf", cat: "share", type: "Beef",    name: "The Pull-Apart Loaf - Beef",    desc: "A warm 3-section loaf with melted cheese and butter glaze, filled with beef. Comes with fries, dips and drinks.",    price: 749, emoji: "🥖", serves: "3 to 5", kcal: "2,800 – 3,440 kcal (whole loaf)", includes: SHARE_INCLUDES, sheets: [SHEET.loaf, SHEET.sides] },
  { id: "SH05", group: "loaf", cat: "share", type: "Chicken", name: "The Pull-Apart Loaf - Chicken", desc: "A warm 3-section loaf with melted cheese and butter glaze, filled with chicken. Comes with fries, dips and drinks.", price: 699, emoji: "🥖", serves: "3 to 5", kcal: "2,830 – 3,470 kcal (whole loaf)", includes: SHARE_INCLUDES, sheets: [SHEET.loaf, SHEET.sides] },
  { id: "SH06", group: "loaf", cat: "share", type: "Fish",    name: "The Pull-Apart Loaf - Fish",    desc: "A warm 3-section loaf with melted cheese and butter glaze, filled with fish. Comes with fries, dips and drinks.",    price: 729, emoji: "🥖", serves: "3 to 5", kcal: "2,770 – 3,320 kcal (whole loaf)", includes: SHARE_INCLUDES, sheets: [SHEET.loaf, SHEET.sides] },

  { id: "SH07", group: "slider", cat: "share", type: "Beef",    name: "Slider Flight on a Wooden Paddle - Beef",    desc: "Three beef sliders on soft brioche buns, served on a wooden paddle with fries, dips and drinks.",    price: 719, emoji: "🍔", serves: "3 to 5", kcal: "2,680 – 3,250 kcal (whole paddle)", includes: SHARE_INCLUDES, sheets: [SHEET.slider, SHEET.sides] },
  { id: "SH08", group: "slider", cat: "share", type: "Chicken", name: "Slider Flight on a Wooden Paddle - Chicken", desc: "Three chicken sliders on soft brioche buns, served on a wooden paddle with fries, dips and drinks.", price: 669, emoji: "🍔", serves: "3 to 5", kcal: "2,710 – 3,280 kcal (whole paddle)", includes: SHARE_INCLUDES, sheets: [SHEET.slider, SHEET.sides] },
  { id: "SH09", group: "slider", cat: "share", type: "Fish",    name: "Slider Flight on a Wooden Paddle - Fish",    desc: "Three fish sliders on soft brioche buns, served on a wooden paddle with fries, dips and drinks.",    price: 699, emoji: "🍔", serves: "3 to 5", kcal: "2,650 – 3,130 kcal (whole paddle)", includes: SHARE_INCLUDES, sheets: [SHEET.slider, SHEET.sides] },

  // ---- DRINKS (750 ml) - about 315 to 330 kcal per bottle, worked out from the sides-and-drinks sheet ----
  { id: "DR01", img: "images/coke-drink.jpg", cat: "drink", type: "Drink", name: "Coca-Cola 750 ml", desc: "Ice-cold regular Coke, 750 ml bottle.", price: 70, emoji: "🥤", serves: "1", kcal: "about 315 – 330 kcal", sheets: [SHEET.sides] },
  { id: "DR02", img: "images/pepsi-drink.jpg", cat: "drink", type: "Drink", name: "Pepsi 750 ml",     desc: "Ice-cold regular Pepsi, 750 ml bottle.", price: 70, emoji: "🥤", serves: "1", kcal: "about 315 – 330 kcal", sheets: [SHEET.sides] }
];
