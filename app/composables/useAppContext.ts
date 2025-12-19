import type { InjectionKey, Ref, ComputedRef } from 'vue'
import type { App } from '#shared/types/db'

/**
 * App Context Interface
 * 
 * Provides centralized access to app data and methods for all child components
 * within the app layout. This eliminates prop drilling and provides a clean API
 * for interacting with the current app.
 * 
 * @example Basic Usage
 * ```vue
 * <script setup>
 * const { app, appSlug, updateApp } = useAppContext()
 * 
 * async function changeName() {
 *   await updateApp({ name: 'New Name' })
 * }
 * </script>
 * ```
 * 
 * @example Navigation
 * ```vue
 * <script setup>
 * const { getAppPath, navigateToSettings } = useAppContext()
 * </script>
 * 
 * <template>
 *   <NuxtLink :to="getAppPath('tables')">Tables</NuxtLink>
 *   <button @click="navigateToSettings">Settings</button>
 * </template>
 * ```
 */
export interface AppContext {
  // App data
  app: ComputedRef<App | null>
  appSlug: ComputedRef<string>
  appId: ComputedRef<string | undefined>
  appName: ComputedRef<string>
  
  // Loading state
  pending: Ref<boolean>
  
  // Methods
  refreshApp: () => Promise<void>
  updateApp: (data: Partial<Pick<App, 'name' | 'icon' | 'description' | 'menu'>>) => Promise<App | null>
  deleteApp: () => Promise<boolean>
  
  // Menu management
  updateMenu: (newMenu: any[]) => Promise<void>
  
  // Navigation helpers
  navigateToApp: () => Promise<void>
  navigateToSettings: () => Promise<void>
  getAppPath: (subPath?: string) => string
}

export const AppContextKey: InjectionKey<AppContext> = Symbol('app-context')

/**
 * Composable to inject app context in child components
 * Usage: const appContext = useAppContext()
 */
export function useAppContext(): AppContext {
  const context = inject(AppContextKey)
  
  if (!context) {
    throw new Error('useAppContext must be used within an app layout')
  }
  
  return context
}

/**
 * Optional version that returns null if not in app context
 * Usage: const appContext = useAppContextOptional()
 */
export function useAppContextOptional(): AppContext | null {
  return inject(AppContextKey, null)
}

