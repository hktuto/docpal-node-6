export interface PanelState {
  id: string
  url: string
  title: string
  icon?: string
  currentPageTitle?: string
  // a list to store the history of panel
  historyStack: string[]
  // the current index of the history stack
  currentStackIndex: number
}
interface TabState {
  id: string
  // for desktop Minimize to dock 
  title: string
  currentPageTitle?: string
  icon?: string
  // for desktop mode floating window
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  isMaximized: boolean
  isMinimized: boolean
  
  savedState?: { x: number, y: number, width: number, height: number }
  // animation state
  isAnimating?: boolean
  isOpening?: boolean
  isClosing?: boolean
  isShaking?: boolean
  // multiple panel support
  tabs?: PanelState[]
  activeTabId?: string
}

// tabs list are share between desktop mode and tab mode
const useMultipleTabsState = () => useState<TabState[]>('multipleTabState')
// global active tab id
const useActiveTab = () => useState<string | null>('activeTab')
// global tab view, can be desktop (floating window) or card (multiple tabs in one window)
const useTabsViewMode = () => useState<'desktop' | 'card'>('tabsViewMode', () => 'card')


export const useMultipleTabContext = () => {
  const tabs = useMultipleTabsState()
  const activeTab = useActiveTab()

  // tab management function 
  function switchPanelInTab(tabId: string, panelId:string) {
    // check if tabId is valid
    const tab = tabs.value.find(t => t.id === tabId)
    if(!tab) return
    // check if panelId is valid
    const panel = tabs.value.find(p => p.id === panelId)
    if(!panel) return
    // switch tab
    activeTab.value = tabId
    panel.activeTabId = tabId
    
  }

  function saveTabsState() {
    // save tabs state to local storage
    // TODO : save tabs state to local db
    const saveObj = JSON.stringify(tabs.value)
    localStorage.setItem('multipleTabState', saveObj)
  }

  return {
    //state
    tabs,
    activeTab,
    //functions
    switchPanelInTab,

  }
}