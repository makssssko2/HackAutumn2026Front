// Apply the theme before styles and the app load to avoid a light flash on dark screens.
;(function () {
  var saved = null
  try {
    saved = localStorage.getItem('invoice-keeper-theme')
  } catch (_) {}
  var dark =
    saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute('content', dark ? '#1b1917' : '#fff0e2')
})()
