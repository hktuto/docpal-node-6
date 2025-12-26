
export const useBrowserMode = () => useState<'standalone' | 'dock'>('browserMode', () => "standalone")
export const useCustomRouter = () => {
  
  const browserMode = useBrowserMode()
  const router = useRouter()


  // internal navigate to function
  function _navigateTo(path: string) {
    // check hotkey, to see open in new window 
    
  }

  function push(path: string) {
    if(browserMode.value === "standalone") {
      _navigateTo(path)
    }
    // handle other mode route logic
  }

  function replace(path: string) {
    if(browserMode.value === "standalone") {
      _navigateTo(path)
    }
    // handle other mode route logic
  }

  return {
    push,
    replace
  }
}