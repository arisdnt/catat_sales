import { useRouter } from 'next/navigation'

export function useNavigation() {
  const router = useRouter()

  const navigate = (path: string) => {
    router.push(path)
  }

  const navigateAndReplace = (path: string) => {
    router.replace(path)
  }

  const goBack = () => {
    router.back()
  }

  const refresh = () => {
    router.refresh()
  }

  return {
    navigate,
    navigateAndReplace,
    goBack,
    refresh
  }
}