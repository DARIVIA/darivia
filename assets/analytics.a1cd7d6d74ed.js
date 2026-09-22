(() => {
  'use strict';
  const id = 'G-WRM8MEF9KZ';
  const key = 'darivia.analytics-consent.v1';
  const ttl = 180 * 24 * 60 * 60 * 1000;
  const production = location.protocol === 'https:' && ['darivia.com', 'www.darivia.com'].includes(location.hostname);
  const banner = document.querySelector('#analytics-consent');
  const allow = document.querySelector('#analytics-allow');
  const reject = document.querySelector('#analytics-reject');
  if (!banner || !allow || !reject) return;
  let choice = null;
  let started = false;
  let observer = null;
  let contactsSeen = false;
  const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };

  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved && ['granted', 'denied'].includes(saved.value) && Number.isFinite(saved.at) && saved.at <= Date.now() && Date.now() - saved.at < ttl) return saved.value;
    } catch (_) { /* An unavailable store must never imply consent. */ }
    return null;
  }
  function persist(value) {
    try { localStorage.setItem(key, JSON.stringify({ value, at: Date.now() })); } catch (_) { /* This page can still honour the choice. */ }
  }
  function queue() { window.dataLayer.push(arguments); }
  function event(name) {
    if (choice === 'granted' && production && started) window.gtag('event', name, { send_to: id });
  }
  function observeContacts() {
    if (contactsSeen || !('IntersectionObserver' in window)) return;
    if (!observer) {
      observer = new IntersectionObserver(entries => {
        if (choice === 'granted' && entries.some(entry => entry.isIntersecting)) {
          event('contacts_view');
          contactsSeen = true;
          observer.disconnect();
        }
      }, { threshold: 0.25 });
    }
    const contact = document.querySelector('#d-contact');
    if (contact) observer.observe(contact);
  }
  function start() {
    // Never pollute the live property from local files or localhost previews.
    if (!production) return;
    window['ga-disable-' + id] = false;
    if (!started) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = queue;
      window.gtag('consent', 'default', denied);
      window.gtag('consent', 'update', { ...denied, analytics_storage: 'granted' });
      window.gtag('js', new Date());
      window.gtag('config', id, {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_expires: ttl / 1000,
        cookie_update: false
      });
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
      script.id = 'darivia-google-tag';
      document.head.append(script);
      started = true;
    } else {
      window.gtag('consent', 'update', { ...denied, analytics_storage: 'granted' });
    }
    observeContacts();
  }
  function removeCookies() {
    const names = ['_ga', '_ga_WRM8MEF9KZ'];
    const domains = ['', location.hostname, '.' + location.hostname, 'darivia.com', '.darivia.com'];
    for (const name of names) for (const domain of domains) {
      document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : '');
    }
  }
  function stop() {
    window['ga-disable-' + id] = true;
    if (started) window.gtag('consent', 'update', denied);
    if (observer) observer.disconnect();
    removeCookies();
  }
  function apply(value) {
    choice = value;
    if (value === 'granted') start(); else stop();
  }
  function choose(value) {
    persist(value);
    apply(value);
    banner.hidden = true;
  }
  allow.addEventListener('click', () => choose('granted'));
  reject.addEventListener('click', () => choose('denied'));
  document.addEventListener('click', e => {
    const link = e.target.closest && e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    const action = link.getAttribute('data-analytics-event');
    if (href === '#d-connect' && action === 'connect_click') event(action);
    else if (href === '#d-contact' && ['connect_click', 'research_request_click', 'pilot_click'].includes(action)) event(action);
    else if (href === '#d-contact') event('connect_click');
    else if (href === 'mailto:yk@darivia.com?subject=DTI%20watch%20research') event('research_request_click');
    else if (href === 'mailto:yk@darivia.com') event('email_contact_click');
    else if (href === 'https://www.linkedin.com/in/ykhechoyan/') event('linkedin_click');
  });
  window.addEventListener('storage', e => {
    if (e.key !== key && e.key !== null) return;
    const saved = readChoice();
    apply(saved);
    banner.hidden = saved !== null;
  });
  apply(readChoice());
  banner.hidden = choice !== null;
})();
