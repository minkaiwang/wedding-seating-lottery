<script setup lang='ts'>
import { useDebounceFn, useElementSize } from '@vueuse/core'
import localforage from 'localforage'
import Sparticles from 'sparticles'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
    homeBackground: {
        type: Object,
        default: () => ({
            id: '',
            name: '',
            url: '',
        }),
    },
})

/** 方形 SVG 爱心（白色剪影），Sparticles `image` 模式按粒子色着色；库要求 1:1 */
const HEART_PARTICLE_DATA_URL = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128"><path fill="#ffffff" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
)}`

const imageDbStore = localforage.createInstance({
    name: 'imgStore',
})
const imgUrl = ref('')
const particleCanvasRef = ref()
/** `Storage` 背景用 blob URL，需在卸载或丢弃时 revoke，避免泄漏与卸载后赋值 */
let backgroundBlobUrl: string | null = null

function revokeBackgroundBlobUrl(): void {
    if (backgroundBlobUrl) {
        URL.revokeObjectURL(backgroundBlobUrl)
        backgroundBlobUrl = null
    }
}

const { width, height } = useElementSize(particleCanvasRef)
const options = ref({
    shape: 'image',
    imageUrl: HEART_PARTICLE_DATA_URL,
    parallax: 1.2,
    rotate: true,
    twinkle: true,
    speed: 12,
    count: 320,
})

const sparticleInstance = ref<InstanceType<typeof Sparticles> | null>(null)
let disposed = false
let backgroundLoadGeneration = 0

function addSparticles(node: HTMLElement | null, w: number, h: number) {
    if (!node || w <= 0 || h <= 0)
        return
    sparticleInstance.value?.destroy()
    sparticleInstance.value = new Sparticles(node, options.value, w, h)
}

const debouncedResize = useDebounceFn(() => {
    if (disposed)
        return
    if (props.homeBackground.url)
        return
    if (width.value && height.value)
        addSparticles(particleCanvasRef.value, width.value, height.value)
}, 150)

watch([width, height], () => debouncedResize(), { flush: 'post' })

watch(
    () => props.homeBackground.url,
    (url) => {
        if (url) {
            sparticleInstance.value?.destroy()
            sparticleInstance.value = null
        }
        else {
            debouncedResize()
        }
    },
)

async function getImageStoreItem(item: any): Promise<string> {
    try {
        if (item.url === 'Storage') {
            const key = item.id
            if (!key)
                return ''
            const imageData = await imageDbStore.getItem(key) as { data?: unknown } | null
            const blob
                = imageData && typeof imageData === 'object' && imageData.data instanceof Blob
                    ? imageData.data
                    : null
            if (!blob)
                return ''
            return URL.createObjectURL(blob)
        }
        return typeof item.url === 'string' ? item.url : ''
    }
    catch {
        return ''
    }
}

function loadBackgroundImage(): void {
    const gen = ++backgroundLoadGeneration
    const item = props.homeBackground
    revokeBackgroundBlobUrl()
    imgUrl.value = ''
    getImageStoreItem(item)
        .then((image) => {
            if (disposed || gen !== backgroundLoadGeneration) {
                if (image.startsWith('blob:'))
                    URL.revokeObjectURL(image)
                return
            }
            if (item.url === 'Storage' && image.startsWith('blob:'))
                backgroundBlobUrl = image
            imgUrl.value = image
        })
        .catch(() => {
            if (disposed || gen !== backgroundLoadGeneration)
                return
            imgUrl.value = ''
        })
}

watch(
    () => [props.homeBackground.id, props.homeBackground.url] as const,
    () => loadBackgroundImage(),
    { immediate: true },
)

function onWindowResize() {
    debouncedResize()
}

function listenWindowSize() {
    window.addEventListener('resize', onWindowResize)
}

onMounted(() => {
    listenWindowSize()
})
onUnmounted(() => {
    disposed = true
    revokeBackgroundBlobUrl()
    window.removeEventListener('resize', onWindowResize)
    sparticleInstance.value?.destroy()
    sparticleInstance.value = null
})
</script>

<template>
  <div v-if="homeBackground.url" class="home-background w-screen h-screen overflow-hidden">
    <img :src="imgUrl" class="w-full h-full object-cover" alt="">
  </div>
  <div v-else ref="particleCanvasRef" class="w-screen h-screen overflow-hidden" />
</template>

<style lang='scss' scoped>

</style>
