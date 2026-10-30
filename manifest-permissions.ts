/**
 * Manifest permission specification and configuration helpers for WXT / MV3.
 * Defines required permissions and host_permissions for cross-tab AI automation.
 */

export const REQUIRED_PERMISSIONS = ['scripting', 'tabs', 'activeTab'] as const;

export const AI_HOST_PERMISSIONS = [
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
] as const;

export interface WxtManifestConfig {
    permissions: string[];
    host_permissions: string[];
}

/**
 * Returns WXT manifest configuration object including required AI automation permissions.
 */
export function getAIAutomationManifestConfig(existingConfig?: Partial<WxtManifestConfig>): WxtManifestConfig {
    const permissions = new Set([...(existingConfig?.permissions || []), ...REQUIRED_PERMISSIONS]);
    const host_permissions = new Set([...(existingConfig?.host_permissions || []), ...AI_HOST_PERMISSIONS]);

    return {
        permissions: Array.from(permissions),
        host_permissions: Array.from(host_permissions),
    };
}
