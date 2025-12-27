
const usePageMode = () => useState<'dock' | 'desktop' | 'standalone'>('app:pageMode', () => "standalone")

export const useCustomRouter = () => {
    const pageMode = usePageMode()
    const router = useRouter()
    
    function navigateTo(path:string) {
        if(pageMode.value === 'standalone'){
            router.push(path)
        }
    }

    function replace(path:string) {
        if(pageMode.value === 'standalone'){
            router.replace(path)
        }
    }



    return {
        pageMode,
        navigateTo,
        replace
    }
}