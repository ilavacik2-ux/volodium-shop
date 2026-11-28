// Mock browser environment for JavaScriptCore
var window = {
  scrollTo: function() {},
  localStorage: {
    getItem: function() { return null; },
    setItem: function() {},
    removeItem: function() {}
  },
  location: {
    origin: 'https://volodiumparfum.ru',
    pathname: '/catalog.html',
    search: '',
    hash: ''
  },
  history: {
    pushState: function() {},
    replaceState: function() {}
  },
  addEventListener: function() {}
};
var localStorage = window.localStorage;
var document = {
  title: 'VOLODIUM PARFUM',
  body: { style: {} },
  documentElement: { style: {} },
  getElementById: function() { return null; },
  querySelectorAll: function() { return []; },
  querySelector: function() { return null; },
  addEventListener: function() {}
};
var navigator = {};

// Load perfumes data
load('assets/data/perfumes.js');

// Load app.js
load('assets/js/app.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error('Assertion failed: ' + message);
  }
}

print('Testing findStorefrontItem and buildProductUrl...');

assert(typeof findStorefrontItem === 'function', 'findStorefrontItem should be a function');
assert(typeof buildProductUrl === 'function', 'buildProductUrl should be a function');

// 1. Exact ID match for perfume
var sisu = findStorefrontItem('vp-501166132292');
assert(sisu, 'Should find perfume by exact ID');
assert(sisu.name === 'Sisu', 'Name should be Sisu');

// 2. Numeric UID match for perfume
var sisuByUid = findStorefrontItem('501166132292');
assert(sisuByUid, 'Should find perfume by numeric UID');
assert(sisuByUid.id === 'vp-501166132292', 'ID should be vp-501166132292');

// 3. Exact ID match for aromabox (with Cyrillic)
var box = findStorefrontItem('box-нецитрусовый-аромабокс-для-него');
assert(box, 'Should find aromabox by exact ID');
assert(box.category === 'box', 'Category should be box');

// 4. Numeric UID match for aromabox
var boxByUid = findStorefrontItem('776250689083');
assert(boxByUid, 'Should find aromabox by numeric UID');
assert(boxByUid.category === 'box', 'Category should be box');

// 5. Test URL building
var sisuUrl = buildProductUrl(sisu);
assert(sisuUrl.indexOf('scent=vp-501166132292') !== -1, 'Expected scent query param in: ' + sisuUrl);

var boxUrl = buildProductUrl(box);
assert(boxUrl.indexOf('box=') !== -1, 'Expected box query param in: ' + boxUrl);

print('Testing Task 2: openProductModal and closeProductModal history sync...');
var pushedUrls = [];
var replacedUrls = [];
window.history.pushState = function(state, title, url) {
  pushedUrls.push({ state: state, title: title, url: url });
  window.location.search = url.split('?')[1] ? ('?' + url.split('?')[1]) : '';
};
window.history.replaceState = function(state, title, url) {
  replacedUrls.push({ state: state, title: title, url: url });
  window.location.search = url.split('?')[1] ? ('?' + url.split('?')[1]) : '';
};

var mockBackdrop = { classList: { add: function() {}, remove: function() {}, contains: function() { return false; } } };
var mockContent = { innerHTML: '', querySelectorAll: function() { return []; } };
document.getElementById = function(id) {
  if (id === 'productModalBackdrop') return mockBackdrop;
  if (id === 'productModalContent') return mockContent;
  return {
    addEventListener: function() {},
    classList: { add: function() {}, remove: function() {}, contains: function() { return false; } },
    style: {}
  };
};

// Open perfume modal
openProductModal('vp-501166132292');
assert(pushedUrls.length > 0, 'pushState should be called when opening modal');
var lastPush = pushedUrls[pushedUrls.length - 1];
assert(lastPush.url.indexOf('scent=vp-501166132292') !== -1, 'pushState URL should contain scent=vp-501166132292, got: ' + lastPush.url);
assert(document.title.indexOf('Sisu') !== -1, 'document.title should contain Sisu, got: ' + document.title);

// Close modal
closeProductModal();
assert(replacedUrls.length > 0, 'replaceState should be called when closing modal');
var lastReplace = replacedUrls[replacedUrls.length - 1];
assert(lastReplace.url.indexOf('scent=') === -1, 'replaceState URL should NOT contain scent=, got: ' + lastReplace.url);

print('All Task 1 & Task 2 tests passed successfully!');
