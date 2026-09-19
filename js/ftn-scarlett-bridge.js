// FTN Account -> Scarlett session bridge. Scarlett (a browser extension, a separate origin) cannot
// read this page's Supabase session directly, and must not implement its own duplicate sign-in
// flow -- FTN Account (js/ftn-auth.js) remains the single identity system. This script hands the
// current session to Scarlett's own extension storage via Chrome's standard externally_connectable
// messaging, only when Scarlett is actually installed (every send is wrapped so a missing
// extension is silently a no-op, never a page error), and only an access token + its expiry + the
// user id -- never a password, never a privileged key.
(function (global) {
  'use strict';
  if (!global.chrome || !global.chrome.runtime || typeof global.chrome.runtime.sendMessage !== 'function') return;

  // Scarlett's manifest pins this extension ID via its own "key" field specifically so this page
  // can address it deterministically even for an unpacked/dev install.
  var SCARLETT_EXTENSION_ID = 'clfkbacenkaicfpgchbmmolfbnanngfe';

  function send(message) {
    try {
      global.chrome.runtime.sendMessage(SCARLETT_EXTENSION_ID, message, function () {
        // Reading lastError (even to ignore it) is required -- otherwise Chrome logs an unhandled
        // "Could not establish connection" error to the console on every page load where Scarlett
        // isn't installed, which is the overwhelmingly common case.
        void global.chrome.runtime.lastError;
      });
    } catch (e) { /* extension messaging unavailable in this context -- never break the page */ }
  }

  async function sync() {
    var auth = global.FTN && global.FTN.Auth;
    if (!auth) return;
    try {
      var session = await auth.getSession();
      if (session && session.access_token && session.user) {
        send({
          type: 'FTN_SESSION',
          accessToken: session.access_token,
          userId: session.user.id,
          expiresAt: session.expires_at ? session.expires_at * 1000 : null,
        });
      } else {
        send({ type: 'FTN_SESSION_CLEAR' });
      }
    } catch (e) { /* no session available -- nothing to sync */ }
  }

  if (global.FTN && global.FTN.Auth) {
    sync();
    global.FTN.Auth.onChange(function () { sync(); });
  }
})(window);
