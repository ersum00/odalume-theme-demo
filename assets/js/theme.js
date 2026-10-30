(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const menuToggle = $('.menu-toggle');
  const nav = $('#primary-navigation');
  const closeMenu = () => {
    nav?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  };
  menuToggle?.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(expanded));
    nav?.classList.toggle('is-open', expanded);
  });
  nav?.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav?.classList.contains('is-open')) {
      closeMenu();
      menuToggle?.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  window.matchMedia('(min-width: 801px)').addEventListener('change', closeMenu);

  function showDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    $$('dialog[open]').forEach((item) => item.close());
    dialog.showModal();
    document.body.classList.add('has-dialog');
  }
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (opener) showDialog(opener.dataset.open);
    const closer = event.target.closest('[data-close]');
    if (closer) closer.closest('dialog')?.close();
  });
  $$('dialog').forEach((dialog) => {
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) document.body.classList.remove('has-dialog');
    });
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  if (!document.body.classList.contains('is-preview')) return;

  const products = JSON.parse($('#demo-product-data').textContent);
  const byId = new Map(products.map((product) => [product.id, product]));
  const money = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);
  const normalize = (value) => value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  const storage = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private mode keeps state in memory. */ } }
  };
  const storedFavorites = storage.get('odalume-demo-favorites', []);
  let favorites = new Set(Array.isArray(storedFavorites) ? storedFavorites.filter((id) => byId.has(id)) : []);
  const storedCart = storage.get('odalume-demo-cart', {});
  const cart = Object.create(null);
  if (storedCart && typeof storedCart === 'object' && !Array.isArray(storedCart)) {
    Object.entries(storedCart).forEach(([id, quantity]) => {
      if (byId.has(id) && Number.isInteger(quantity) && quantity > 0) cart[id] = Math.min(quantity, 99);
    });
  }
  let selectedProduct = null;
  let toastTimer;
  const toast = (message) => {
    const element = $('.toast');
    clearTimeout(toastTimer);
    element.textContent = message;
    element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 2600);
  };
  const updateFavorites = () => {
    $$('[data-favorite]').forEach((button) => {
      const saved = favorites.has(button.dataset.favorite);
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', `${byId.get(button.dataset.favorite).name}: ${saved ? 'favorilerden çıkar' : 'favorilere ekle'}`);
    });
    storage.set('odalume-demo-favorites', [...favorites]);
  };
  function productRow(product, { quantity = 0, removable = false } = {}) {
    const row = document.createElement('div');
    row.className = 'search-result';
    const image = document.createElement('img');
    image.src = `assets/images/${product.image}`;
    image.alt = product.alt;
    const details = document.createElement('div');
    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'result-title';
    title.textContent = product.name;
    title.dataset.quick = product.id;
    const description = document.createElement('p');
    description.textContent = `${quantity ? `${quantity} adet · ` : ''}${money(product.price)} · ${product.category}`;
    details.append(title, description);
    row.append(image, details);
    if (removable) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'small-action remove-cart';
      remove.textContent = 'Çıkar';
      remove.setAttribute('aria-label', `${product.name} ürününü sepetten çıkar`);
      remove.dataset.removeCart = product.id;
      row.append(remove);
    }
    return row;
  }
  function fillList(element, items, emptyMessage) {
    element.replaceChildren();
    if (!items.length) {
      const message = document.createElement('p');
      message.className = 'empty-state';
      message.textContent = emptyMessage;
      element.append(message);
    } else {
      items.forEach((product) => element.append(productRow(product)));
    }
  }
  function updateCart() {
    const entries = Object.entries(cart);
    const count = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
    $$('.cart-count').forEach((element) => { element.textContent = count; });
    const list = $('#cart-list');
    list.replaceChildren();
    if (!entries.length) fillList(list, [], 'Sepetinde henüz bir tasarım yok. Seçkiyi keşfetmeye başlayabilirsin.');
    entries.forEach(([id, quantity]) => list.append(productRow(byId.get(id), { quantity, removable: true })));
    $('#cart-total').textContent = count ? `Örnek toplam: ${money(entries.reduce((sum, [id, quantity]) => sum + byId.get(id).price * quantity, 0))}` : '';
    storage.set('odalume-demo-cart', cart);
  }
  function filterProducts(filter) {
    $$('[data-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    $$('.product-card[data-category]').forEach((card) => { card.hidden = filter !== 'all' && card.dataset.category !== filter; });
    $('#filter-status').textContent = `${$$('.product-card[data-category]:not([hidden])').length} ürün gösteriliyor.`;
  }
  function updateSearch() {
    const query = normalize($('#site-search').value.trim());
    const matches = products.filter((product) => normalize(`${product.name} ${product.category} ${product.material}`).includes(query));
    fillList($('#search-results'), matches, 'Bu aramayla eşleşen bir tasarım yok. Farklı bir kelime deneyebilirsin.');
  }
  document.addEventListener('click', (event) => {
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) {
      const id = favorite.dataset.favorite;
      if (favorites.has(id)) { favorites.delete(id); toast('Favorilerden çıkarıldı.'); }
      else { favorites.add(id); toast('Favorilere eklendi.'); }
      updateFavorites();
    }
    const quick = event.target.closest('[data-quick]');
    if (quick) {
      selectedProduct = byId.get(quick.dataset.quick);
      if (!selectedProduct) return;
      $('#quick-title').textContent = selectedProduct.name;
      $('#quick-image').src = `assets/images/${selectedProduct.image}`;
      $('#quick-image').alt = selectedProduct.alt;
      $('#quick-material').textContent = selectedProduct.material;
      $('#quick-price').textContent = money(selectedProduct.price);
      showDialog('quick-dialog');
    }
    const filter = event.target.closest('[data-filter]');
    if (filter) filterProducts(filter.dataset.filter);
    const collection = event.target.closest('[data-collection]');
    if (collection) filterProducts(collection.dataset.collection);
    if (event.target.closest('[data-reset-filter]')) filterProducts('all');
    if (event.target.closest('[data-open="favorites-dialog"]')) fillList($('#favorites-list'), products.filter((product) => favorites.has(product.id)), 'Sevdiğin ürünlerdeki kalbe dokun; favorilerin burada biriksin.');
    if (event.target.closest('[data-open="search-dialog"]')) updateSearch();
    const remove = event.target.closest('[data-remove-cart]');
    if (remove) {
      delete cart[remove.dataset.removeCart];
      updateCart();
      toast('Ürün örnek sepetten çıkarıldı.');
      $('#cart-dialog [data-close]').focus();
    }
  });
  $('#demo-add-cart').addEventListener('click', () => {
    if (!selectedProduct) return;
    cart[selectedProduct.id] = Math.min((cart[selectedProduct.id] || 0) + 1, 99);
    updateCart();
    toast('Örnek sepete eklendi.');
    $('#quick-dialog').close();
    showDialog('cart-dialog');
  });
  $('#site-search').addEventListener('input', updateSearch);
  $('#demo-search-form').addEventListener('submit', (event) => { event.preventDefault(); updateSearch(); });
  updateFavorites();
  updateCart();
  updateSearch();
})();
