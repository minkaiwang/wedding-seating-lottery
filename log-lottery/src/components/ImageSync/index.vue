<script setup lang='ts'>
import type { IFileData } from '../FileUpload/type'
import type { IImage } from '@/types/storeType'
import localforage from 'localforage'
import { onMounted, ref } from 'vue'

interface IProps {
    imgItem: IImage
}
const props = defineProps<IProps>()
const imageDbStore = localforage.createInstance({
    name: 'imgStore',
})

const imgUrl = ref('')
const imageFailed = ref(false)

async function getImageStoreItem(item: IImage): Promise<string> {
    let image = ''
    if (item.url === 'Storage') {
        const key = item.id
        const imageData = await imageDbStore.getItem<IFileData>(key)
        if (imageData?.data instanceof Blob)
            image = URL.createObjectURL(imageData.data)
    }
    else {
        image = item.url as string
    }

    return image
}

onMounted(async () => {
    imgUrl.value = await getImageStoreItem(props.imgItem)
    imageFailed.value = !imgUrl.value
})
</script>

<template>
  <img
    v-if="!imageFailed"
    :src="imgUrl"
    :alt="imgItem.name || '奖品图片'"
    class="object-cover h-full rounded-xl"
    @error="imageFailed = true"
  >
  <span v-else class="grid h-full min-h-8 place-items-center text-xl" role="img" :aria-label="imgItem.name || '奖品图片'">🎁</span>
</template>

<style lang='scss' scoped>

</style>
