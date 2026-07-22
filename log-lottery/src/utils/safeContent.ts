const SAFE_DATA_IMAGE = /^data:image\/(?:avif|bmp|gif|jpe?g|png|webp);base64,[a-z0-9+/=\s]+$/i
const LEGACY_REMOTE_PLACEHOLDER = 'https://img1.baidu.com/it/u=2165937980,813753762&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500'

/**
 * Keeps avatar rendering limited to normal web images. SVG and arbitrary data
 * URLs are intentionally excluded because they can carry executable content.
 */
export function safeAvatarUrl(value: unknown): string {
    if (typeof value !== 'string')
        return ''

    const candidate = value.trim()
    if (!candidate)
        return ''
    if (candidate === LEGACY_REMOTE_PLACEHOLDER)
        return ''
    if (SAFE_DATA_IMAGE.test(candidate))
        return candidate

    try {
        const parsed = new URL(candidate, 'https://log-lottery.invalid')
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:')
            return candidate
    }
    catch {
        // Invalid URLs are not usable image sources.
    }
    return ''
}

/** Insert imported text as DOM text nodes, never HTML. */
export function replaceWithDetailLines(element: HTMLElement, department: unknown, identity: unknown): void {
    const departmentText = typeof department === 'string' ? department : ''
    const identityText = typeof identity === 'string' ? identity : ''
    element.replaceChildren()

    if (departmentText)
        element.append(document.createTextNode(departmentText))
    if (departmentText && identityText)
        element.append(document.createElement('br'))
    if (identityText)
        element.append(document.createTextNode(identityText))
}
