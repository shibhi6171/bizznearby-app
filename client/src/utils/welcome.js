const KEY = 'bn_welcomed';
export const hasSeenWelcome = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };
export const markWelcome = () => { try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ } };
