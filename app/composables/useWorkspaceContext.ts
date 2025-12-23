import type { InjectionKey, Ref, ComputedRef } from 'vue'
import type { Workspace } from '#shared/types/db'

/**
 * Workspace Context Interface
 * 
 * Provides centralized access to workspace data and methods for all child components
 * within the workspace layout. This eliminates prop drilling and provides a clean API
 * for interacting with the current workspace.
 * 
 * @example Basic Usage
 * ```vue
 * <script setup>
 * const { workspace, workspaceSlug, updateWorkspace } = useWorkspaceContext()
 * 
 * async function changeName() {
 *   await updateWorkspace({ name: 'New Name' })
 * }
 * </script>
 * ```
 * 
 * @example Navigation
 * ```vue
 * <script setup>
 * const { getWorkspacePath, navigateToSettings } = useWorkspaceContext()
 * </script>
 * 
 * <template>
 *   <NuxtLink :to="getWorkspacePath('tables')">Tables</NuxtLink>
 *   <button @click="navigateToSettings">Settings</button>
 * </template>
 * ```
 */
export interface WorkspaceContext {
  // Workspace data
  workspace: ComputedRef<Workspace | null>
  workspaceSlug: ComputedRef<string>
  workspaceId: ComputedRef<string | undefined>
  workspaceName: ComputedRef<string>
  
  // Loading state
  pending: Ref<boolean>
  
  // Methods
  refreshWorkspace: () => Promise<void>
  updateWorkspace: (data: Partial<Pick<Workspace, 'name' | 'icon' | 'description' | 'menu'>>) => Promise<Workspace | null>
  deleteWorkspace: () => Promise<boolean>
  
  // Menu management
  updateMenu: (newMenu: any[]) => Promise<void>
  
  // Navigation helpers
  navigateToWorkspace: () => Promise<void>
  navigateToSettings: () => Promise<void>
  getWorkspacePath: (subPath?: string) => string
}

export const WorkspaceContextKey: InjectionKey<WorkspaceContext> = Symbol('workspace-context')

/**
 * Composable to inject workspace context in child components
 * Usage: const workspaceContext = useWorkspaceContext()
 */
export function useWorkspaceContext(): WorkspaceContext {
  const context = inject(WorkspaceContextKey)
  
  if (!context) {
    throw new Error('useWorkspaceContext must be used within a workspace layout')
  }
  
  return context
}

/**
 * Optional version that returns null if not in workspace context
 * Usage: const workspaceContext = useWorkspaceContextOptional()
 */
export function useWorkspaceContextOptional(): WorkspaceContext | null {
  return inject(WorkspaceContextKey, null)
}

