/**
 * Register local SVG files as symbols without a build-time sprite plugin.
 * The generated IDs intentionally retain the former `icon-[name]` contract
 * used by the global <svg-icon name="…"> component.
 */
const iconFiles = import.meta.glob('./**/*.svg', {
    eager: true,
    query: '?raw',
    import: 'default',
}) as Record<string, string>

function iconName(fileName: string): string {
    return fileName
        .replace(/^\.\//, '')
        .replace(/\.svg$/, '')
        .replace(/\//g, '-')
}

function registerIcon(fileName: string, source: string): void {
    const documentFragment = new DOMParser().parseFromString(source, 'image/svg+xml')
    const svg = documentFragment.documentElement

    if (svg.nodeName.toLowerCase() !== 'svg') {
        console.warn(`Unable to register SVG icon: ${fileName}`)
        return
    }

    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol')
    symbol.id = `icon-${iconName(fileName)}`

    const viewBox = svg.getAttribute('viewBox')
    if (viewBox) {
        symbol.setAttribute('viewBox', viewBox)
    }

    svg.childNodes.forEach(node => symbol.append(node.cloneNode(true)))
    document.querySelector('svg[data-local-icon-sprite]')?.append(symbol)
}

if (typeof document !== 'undefined') {
    const sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    sprite.setAttribute('aria-hidden', 'true')
    sprite.setAttribute('data-local-icon-sprite', '')
    sprite.style.display = 'none'
    document.body.prepend(sprite)

    Object.entries(iconFiles).forEach(([fileName, source]) => registerIcon(fileName, source))
}
