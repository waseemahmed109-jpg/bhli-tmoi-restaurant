const fs = require('fs');
const file = 'public/index.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace startSession
content = content.replace(
`  function startSession(role, user){
    var session = { role: role, user: user };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    applySession(session);
    // Motivational greeting for Staff & Manager only, and only on an actual
    // fresh login — restoreSession() (page refresh) calls applySession()
    // directly and never goes through here, so this shows once per login.
    if((role === 'staff' || role === 'manager') && window.showWelcomeMessage){
      window.showWelcomeMessage(user);
    }
  }`,
`  async function startSession(role, user){
    var session = { role: role, user: user };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    // Sync state from server on fresh login
    try {
      const syncRes = await fetch('/api/sync');
      if (syncRes.ok) {
        const data = await syncRes.json();
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
             originalSetItem.call(localStorage, key, data[key]);
          }
        }
      }
    } catch(e) {
      console.error("Failed to sync initial state", e);
    }

    applySession(session);
    if((role === 'staff' || role === 'manager') && window.showWelcomeMessage){
      window.showWelcomeMessage(user);
    }
  }`
);

// 2. Replace restoreSession
content = content.replace(
`  (function restoreSession(){
    try{
      var raw = sessionStorage.getItem(SESSION_KEY);
      if(!raw) return;
      var session = JSON.parse(raw);
      applySession(session);
    }catch(e){
      sessionStorage.removeItem(SESSION_KEY);
    }
  })();`,
`  (async function restoreSession(){
    try{
      var raw = sessionStorage.getItem(SESSION_KEY);
      if(!raw) return;
      var session = JSON.parse(raw);
      
      const meRes = await fetch('/api/me');
      if (!meRes.ok) {
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      
      try {
        const syncRes = await fetch('/api/sync');
        if (syncRes.ok) {
          const data = await syncRes.json();
          for (const key in data) {
            if (data.hasOwnProperty(key)) {
               originalSetItem.call(localStorage, key, data[key]);
            }
          }
        }
      } catch(e) {
        console.error("Failed to sync initial state", e);
      }

      applySession(session);
    }catch(e){
      sessionStorage.removeItem(SESSION_KEY);
    }
  })();`
);

fs.writeFileSync(file, content);
console.log('Replacements complete');
