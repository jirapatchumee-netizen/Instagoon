(function () {
  var gaId = window.GA_MEASUREMENT_ID || 'G-FEE8FER48W';
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  if (!gaId || gaId === 'G-PLACEHOLDER') return;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
  document.head.appendChild(s);
  window.gtag('js', new Date());
  window.gtag('config', gaId, { anonymize_ip: true, send_page_view: true });
})();
