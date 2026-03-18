export function getTabId() {
  let id = sessionStorage.getItem('au_tab')
  if (!id) {
    id = 'tab_' + Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem('au_tab', id)
  }
  return id
}

export function tokenKey(tabId) { return `au_token_${tabId}` }
export function userKey(tabId) { return `au_user_${tabId}` }
