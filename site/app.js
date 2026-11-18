// Bob's Burger frontend logic - Version 1.7 (one share card per style, pick the meat in the more-info window)
(function () {
  "use strict";

  var TYPES = ["All", "Beef", "Chicken", "Fish", "Drink"];
  var FEATURED_CATS = ["twohand", "special"];
  var state = { cat: "all", type: "All", sort: "menu" };
  var cart = loadCart();

  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return "₹" + Math.round(n).toLocaleString("en-IN"); };

  // Offer: buy 3 or more Two Hand / Special burgers (any mix) and get 10% off those burgers.
  var OFFER = { minQty: 3, percent: 10, cats: ["twohand", "special"] };
  var catLabel = function (key) {
    var c = CATEGORIES.filter(function (x) { return x.key === key; })[0];
    return c ? c.label : key;
  };

  /* ---------- cart storage (browser only, wrapped in try/catch) ---------- */
  function loadCart() {
    try { return JSON.parse(localStorage.getItem("ck_cart")) || {}; } catch (e) { return {}; }
  }
  function saveCart() {
    try { localStorage.setItem("ck_cart", JSON.stringify(cart)); } catch (e) { /* ignore */ }
  }

  /* ---------- hero text ---------- */
  $("slogan").textContent = SITE.slogan;
  if (SITE.logo) {
    var heroArt = $("heroArt");
    var logoImg = document.createElement("img");
    logoImg.src = SITE.logo; logoImg.alt = SITE.name + " logo";
    logoImg.onerror = function () { heroArt.textContent = "🍔"; };
    heroArt.textContent = ""; heroArt.appendChild(logoImg);
  }
  $("quoteText").textContent = "“" + SITE.quote + "”";
  $("quoteBy").textContent = "— " + SITE.quoteBy;

  /* ---------- cards (preview only: picture, name, price) ---------- */
  // Share burgers are grouped: one card per style (Bento, Loaf, Slider). No price on that card,
  // because the price depends on the meat the customer picks in the more-info window.
  function groupOf(m) { return m.group ? GROUPS[m.group] : null; }
  function cardName(m) { var g = groupOf(m); return g ? g.name : m.name; }
  function cardEmoji(m) { var g = groupOf(m); return g ? g.emoji : m.emoji; }
  function cardImg(m) { var g = groupOf(m); return g ? g.img : m.img; }
  function cardPos(m) { var g = groupOf(m); return g ? g.pos : m.pos; }
  // Shows the photo; if the file is missing in S3 it falls back to the emoji so no broken-image icon appears.
  function putPhoto(box, src, alt, emoji, pos) {
    var im = document.createElement("img");
    if (pos) im.style.objectPosition = pos;
    im.src = src; im.alt = alt; im.loading = "lazy";
    im.onerror = function () { if (im.parentNode) im.parentNode.replaceChild(document.createTextNode(emoji), im); };
    box.appendChild(im);
  }

  function makeCard(m) {
    var g = groupOf(m);
    var card = document.createElement("div");
    card.className = "card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", cardName(m) + (g ? ". Beef, chicken or fish. Tap to choose." : ", " + money(m.price) + ". Tap for more information."));
    card.onclick = function () { openInfo(m.id); };
    card.onkeydown = function (ev) {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openInfo(m.id); }
    };

    var imgBox = document.createElement("div");
    imgBox.className = "card-img";
    if (cardImg(m)) { putPhoto(imgBox, cardImg(m), cardName(m), cardEmoji(m), cardPos(m)); }
    else { imgBox.textContent = cardEmoji(m); }
    var badge = document.createElement("span");
    badge.className = "badge"; badge.textContent = g ? "Beef · Chicken · Fish" : m.type;
    imgBox.appendChild(badge);

    var body = document.createElement("div");
    body.className = "card-body";
    var cat = document.createElement("small");
    cat.className = "card-cat"; cat.textContent = catLabel(m.cat);
    var h = document.createElement("h3"); h.textContent = cardName(m);
    var hint = document.createElement("p"); hint.className = "more-hint";
    hint.textContent = g ? "Tap to choose your meat" : "Tap for details and calories";
    var foot = document.createElement("div"); foot.className = "card-foot";
    var price = document.createElement("span");
    if (g) { price.textContent = "Choose meat"; price.className = "choose"; } else { price.textContent = money(m.price); }
    var add = document.createElement("button");
    add.className = "add-btn";
    if (g) {
      add.textContent = "➜";
      add.setAttribute("aria-label", "Choose beef, chicken or fish for " + g.name);
      add.onclick = function (ev) { ev.stopPropagation(); openInfo(m.id); };
    } else {
      add.textContent = "🛒";
      add.setAttribute("aria-label", "Add " + m.name + " to order");
      add.onclick = function (ev) { ev.stopPropagation(); addToCart(m.id); openCart(); };
    }
    add.onkeydown = function (ev) { if (ev.key === "Enter" || ev.key === " ") ev.stopPropagation(); };
    foot.appendChild(price); foot.appendChild(add);

    body.appendChild(cat); body.appendChild(h); body.appendChild(hint); body.appendChild(foot);
    card.appendChild(imgBox); card.appendChild(body);
    return card;
  }

  /* ---------- "more info" window ---------- */
  var lastFocus = null;
  function addFact(box, label, value) {
    var d = document.createElement("div"); d.className = "fact";
    var k = document.createElement("small"); k.textContent = label;
    var v = document.createElement("strong"); v.textContent = value;
    d.appendChild(k); d.appendChild(v); box.appendChild(d);
    return v;
  }
  function openInfo(id) {
    var first = findItem(id);
    if (!first) return;
    var g = groupOf(first);
    var variants = g ? MENU.filter(function (x) { return x.group === first.group; }) : null;
    var sel = g ? null : first;                 // for a share style nothing is chosen yet
    lastFocus = document.activeElement;
    var body = $("infoBody");
    body.innerHTML = "";

    var top = document.createElement("div"); top.className = "info-top";
    var art = document.createElement("div"); art.className = "info-art";
    if (cardImg(first)) { putPhoto(art, cardImg(first), cardName(first), cardEmoji(first), cardPos(first)); }
    else art.textContent = cardEmoji(first);
    var head = document.createElement("div");
    var c = document.createElement("small"); c.className = "card-cat";
    c.textContent = catLabel(first.cat) + (g ? "" : " · " + first.type);
    var h = document.createElement("h2"); h.id = "infoTitle"; h.textContent = cardName(first);
    var p = document.createElement("p"); p.className = "info-desc"; p.textContent = g ? g.desc : first.desc;
    head.appendChild(c); head.appendChild(h); head.appendChild(p);
    top.appendChild(art); top.appendChild(head);
    body.appendChild(top);

    // Meat picker (share styles only). The price appears only after a choice is made.
    var pick = null;
    if (g) {
      pick = document.createElement("div"); pick.className = "pick";
      var pt = document.createElement("strong"); pt.textContent = "Choose your meat"; pick.appendChild(pt);
      var row = document.createElement("div"); row.className = "pick-row"; row.setAttribute("role", "radiogroup");
      row.setAttribute("aria-label", "Choose beef, chicken or fish");
      variants.forEach(function (v) {
        var b = document.createElement("button"); b.type = "button"; b.className = "pick-btn";
        b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
        b.textContent = v.type;
        b.onclick = function () {
          sel = v;
          [].forEach.call(row.children, function (x) { x.classList.remove("on"); x.setAttribute("aria-checked", "false"); });
          b.classList.add("on"); b.setAttribute("aria-checked", "true");
          refresh();
        };
        row.appendChild(b);
      });
      pick.appendChild(row);
      body.appendChild(pick);
    }

    var facts = document.createElement("div"); facts.className = "facts";
    addFact(facts, "Serves", first.serves);
    var kcalEl = addFact(facts, "Calories", g ? "Choose a meat" : first.kcal);
    var priceEl = addFact(facts, "Price", g ? "Choose a meat" : money(first.price));
    body.appendChild(facts);

    if (first.includes && first.includes.length) {
      var inc = document.createElement("div"); inc.className = "includes";
      var it = document.createElement("strong"); it.textContent = "Every box comes with";
      var ul = document.createElement("ul");
      first.includes.forEach(function (x) { var li = document.createElement("li"); li.textContent = x; ul.appendChild(li); });
      inc.appendChild(it); inc.appendChild(ul); body.appendChild(inc);
    }

    if (first.sheets && first.sheets.length) {
      var sh = document.createElement("div"); sh.className = "sheets";
      var st = document.createElement("strong"); st.textContent = "Calorie sheet";
      sh.appendChild(st);
      first.sheets.forEach(function (src) {
        var a = document.createElement("a"); a.href = src; a.target = "_blank"; a.rel = "noopener";
        a.title = "Open the full-size picture";
        var img = document.createElement("img");
        img.src = src; img.loading = "lazy";
        img.alt = "Calorie sheet for " + cardName(first) + ". Values are approximate and are for the whole serving shown.";
        a.appendChild(img); sh.appendChild(a);
      });
      var note = document.createElement("p"); note.className = "note";
      note.textContent = g ? "The sheet shows beef, chicken and fish. Values are approximate." : "Calories and nutrition are approximate and can vary with portion size.";
      sh.appendChild(note);
      body.appendChild(sh);
    }

    var add = document.createElement("button"); add.className = "btn info-add";
    add.onclick = function () {
      if (!sel) return;
      addToCart(sel.id); closeInfo(true); openCart();
    };
    body.appendChild(add);

    function refresh() {
      if (sel) {
        kcalEl.textContent = sel.kcal; priceEl.textContent = money(sel.price);
        add.disabled = false; add.textContent = "Add to order · " + money(sel.price);
      } else {
        add.disabled = true; add.textContent = "Choose beef, chicken or fish";
      }
    }
    refresh();

    $("infoOverlay").classList.add("open");
    $("infoModal").scrollTop = 0;
    $("closeInfo").focus();
  }
  function closeInfo(skipFocus) {
    $("infoOverlay").classList.remove("open");
    if (!skipFocus && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function renderFeatured() {
    var grid = $("featuredGrid");
    grid.innerHTML = "";
    MENU.filter(function (m) { return FEATURED_CATS.indexOf(m.cat) !== -1; })
        .forEach(function (m) { grid.appendChild(makeCard(m)); });
  }

  /* ---------- menu: category tabs, type filter, sorting ---------- */
  function renderTabs() {
    var tabs = $("catTabs");
    tabs.innerHTML = "";
    var all = [{ key: "all", label: "All Items" }].concat(CATEGORIES);
    all.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "tab" + (state.cat === c.key ? " active" : "");
      b.textContent = c.label;
      b.onclick = function () { state.cat = c.key; render(); };
      tabs.appendChild(b);
    });
    var cur = CATEGORIES.filter(function (c) { return c.key === state.cat; })[0];
    $("catNote").textContent = cur ? cur.note : "Everything on the menu. Tap any item for details and calories.";

    var types = $("typeTabs");
    types.innerHTML = "";
    // The meat filter makes no sense for drinks, so it is hidden on the Drinks tab.
    $("typeBar").style.display = state.cat === "drink" ? "none" : "";
    if (state.cat === "drink") state.type = "All";
    TYPES.filter(function (t) { return t !== "Drink" || state.cat === "all"; }).forEach(function (t) {
      var b = document.createElement("button");
      b.className = "tab" + (state.type === t ? " active" : "");
      b.textContent = t === "All" ? "All types" : t;
      b.onclick = function () { state.type = t; render(); };
      types.appendChild(b);
    });
  }

  function visibleItems() {
    var list = MENU.filter(function (m) {
      return (state.cat === "all" || m.cat === state.cat) && (state.type === "All" || m.type === state.type);
    });
    // One card per share style: keep only the first variant that matches the filters.
    var seen = {};
    list = list.filter(function (m) {
      if (!m.group) return true;
      if (seen[m.group]) return false;
      seen[m.group] = true; return true;
    });
    // Price sorting uses the cheapest variant of a share style.
    function sortPrice(m) {
      if (!m.group) return m.price;
      return Math.min.apply(null, MENU.filter(function (x) { return x.group === m.group; }).map(function (x) { return x.price; }));
    }
    if (state.sort === "priceAsc") list.sort(function (a, b) { return sortPrice(a) - sortPrice(b); });
    else if (state.sort === "priceDesc") list.sort(function (a, b) { return sortPrice(b) - sortPrice(a); });
    else if (state.sort === "nameAsc") list.sort(function (a, b) { return cardName(a).localeCompare(cardName(b)); });
    return list;
  }

  function renderGrid() {
    var grid = $("menuGrid");
    grid.innerHTML = "";
    var items = visibleItems();
    if (!items.length) {
      var e = document.createElement("div");
      e.className = "empty"; e.style.gridColumn = "1 / -1";
      e.textContent = "Nothing matches this filter. Try another category or type.";
      grid.appendChild(e);
      return;
    }
    items.forEach(function (m) { grid.appendChild(makeCard(m)); });
  }

  function render() { renderTabs(); renderGrid(); }

  /* ---------- cart ---------- */
  function findItem(id) { return MENU.filter(function (m) { return m.id === id; })[0]; }
  function addToCart(id) { cart[id] = Math.min((cart[id] || 0) + 1, 20); saveCart(); renderCart(); }
  function changeQty(id, d) {
    cart[id] = (cart[id] || 0) + d;
    if (cart[id] <= 0) delete cart[id];
    if (cart[id] > 20) cart[id] = 20;
    saveCart(); renderCart();
  }
  function cartLines() {
    return Object.keys(cart).map(function (id) {
      var m = findItem(id);
      return m ? { id: id, name: m.name, price: m.price, qty: cart[id], cat: m.cat } : null;
    }).filter(Boolean);
  }
  // Works out subtotal, discount and total (whole rupees) for the current cart.
  function calcTotals(lines) {
    var subtotal = 0, eligibleQty = 0, eligibleAmt = 0;
    lines.forEach(function (l) {
      subtotal += l.price * l.qty;
      if (OFFER.cats.indexOf(l.cat) !== -1) { eligibleQty += l.qty; eligibleAmt += l.price * l.qty; }
    });
    var applies = eligibleQty >= OFFER.minQty;
    var discount = applies ? Math.round(eligibleAmt * OFFER.percent / 100) : 0;
    return { subtotal: subtotal, discount: discount, total: subtotal - discount,
             eligibleQty: eligibleQty, applies: applies };
  }
  function renderCart() {
    var body = $("cartBody");
    body.innerHTML = "";
    var lines = cartLines(), count = 0;
    if (!lines.length) {
      var e = document.createElement("div");
      e.className = "empty"; e.textContent = "Your order is empty. Add something tasty!";
      body.appendChild(e);
    }
    lines.forEach(function (l) {
      count += l.qty;
      var row = document.createElement("div"); row.className = "line";
      var info = document.createElement("div");
      var nm = document.createElement("strong"); nm.textContent = l.name;
      var sm = document.createElement("small"); sm.textContent = money(l.price) + " each";
      info.appendChild(nm); info.appendChild(sm);
      var q = document.createElement("div"); q.className = "qty";
      var minus = document.createElement("button"); minus.textContent = "−"; minus.onclick = function () { changeQty(l.id, -1); };
      var num = document.createElement("span"); num.textContent = l.qty;
      var plus = document.createElement("button"); plus.textContent = "+"; plus.onclick = function () { changeQty(l.id, 1); };
      q.appendChild(minus); q.appendChild(num); q.appendChild(plus);
      var sub = document.createElement("div"); sub.textContent = money(l.price * l.qty);
      row.appendChild(info); row.appendChild(q); row.appendChild(sub);
      body.appendChild(row);
    });
    var t = calcTotals(lines);
    $("cartSubtotal").textContent = money(t.subtotal);
    $("discRow").style.display = t.discount > 0 ? "flex" : "none";
    $("cartDiscount").textContent = "−" + money(t.discount);
    $("cartTotal").textContent = money(t.total);
    $("cartCount").textContent = count;
    var hint = "";
    if (lines.length && !t.applies) {
      var need = OFFER.minQty - t.eligibleQty;
      hint = "Add " + need + " more Two Hand or Special burger" + (need > 1 ? "s" : "") + " to get " + OFFER.percent + "% off!";
    } else if (t.applies) {
      hint = "🎉 Offer applied: " + OFFER.percent + "% off your Two Hand and Special burgers.";
    }
    $("offerHint").textContent = hint;
  }
  function openCart() { $("drawer").classList.add("open"); $("overlay").classList.add("open"); }
  function closeCart() { $("drawer").classList.remove("open"); $("overlay").classList.remove("open"); }

  /* ---------- placing the order ---------- */
  function showError(msg) { $("formError").textContent = msg; }

  $("orderForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    showError("");
    var lines = cartLines();
    var name = $("custName").value.trim();
    var phone = $("custPhone").value.trim();
    var address = $("custAddress").value.trim().replace(/\s+/g, " ");
    var email = $("custEmail").value.trim();

    if (!lines.length) return showError("Please add at least one item.");
    if (name.length < 2) return showError("Please enter your name.");
    if (!/^\+?[0-9]{7,15}$/.test(phone)) return showError("Enter a valid phone number (7–15 digits).");
    if (address.length < 10) return showError("Please enter your full delivery address (at least 10 characters).");
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showError("Enter a valid email address.");

    var t = calcTotals(lines);
    // The backend must recalculate prices and the 10% offer itself; never trust amounts sent by a browser.
    var payload = {
      customerName: name,
      phone: phone,
      address: address,
      email: email,
      items: lines.map(function (l) { return { id: l.id, name: l.name, quantity: l.qty }; }),
      currency: "INR",
      clientSubtotal: t.subtotal,
      clientDiscount: t.discount,
      clientTotal: t.total
    };

    var btn = $("placeBtn");
    btn.disabled = true; btn.textContent = "Placing order…";

    placeOrder(payload).then(function (orderId) {
      cart = {}; saveCart();
      window.location.href = "confirmation.html?orderId=" + encodeURIComponent(orderId);
    }).catch(function (err) {
      showError("Could not place the order: " + (err.name === "AbortError" ? "the server took too long, please try again" : err.message));
      btn.disabled = false; btn.textContent = "Place Order";
    });
  });

  function placeOrder(payload) {
    var base = (window.API_BASE_URL || "").replace(/\/$/, "");
    if (!base) {                                   // DEMO MODE: no backend yet
      var id = "DEMO-" + Date.now().toString(36).toUpperCase();
      try { localStorage.setItem("ck_demo_" + id, String(Date.now())); } catch (e) { /* ignore */ }
      return Promise.resolve(id);
    }
    var ctl = (window.AbortController ? new AbortController() : null);
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 25000);
    return fetch(base + "/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error("server returned " + r.status);
      return r.json();
    }).then(function (data) {
      if (!data.orderId) throw new Error("no orderId in response");
      return data.orderId;
    });
  }

  /* ---------- wire up ---------- */
  $("openCart").onclick = openCart;
  $("closeCart").onclick = closeCart;
  $("overlay").onclick = closeCart;
  $("closeInfo").onclick = function () { closeInfo(); };
  $("infoOverlay").onclick = function (ev) { if (ev.target === this) closeInfo(); };
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") { closeInfo(); closeCart(); }
  });
  $("sortSel").onchange = function () { state.sort = this.value; renderGrid(); };
  renderFeatured();
  render();
  renderCart();

  // Coming back with the Back button can show an old copy of this page (with the old cart).
  // Reload the cart from storage so an order that was already placed does not still show.
  function refreshCart() { cart = loadCart(); renderCart(); }
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) {
      refreshCart();
      var b = $("placeBtn") || document.querySelector("form.order button[type=submit]");
      if (b) { b.disabled = false; b.textContent = "Place Order"; }
    }
  });
  window.addEventListener("storage", function (ev) { if (ev.key === "ck_cart") refreshCart(); });
})();
