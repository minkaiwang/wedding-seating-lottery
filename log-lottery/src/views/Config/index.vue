<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { configRoutes } from '../../router'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const menuList = ref<any[]>(configRoutes.children)

function cleanMenuList(menu: any) {
    const newList = menu
    for (let i = 0; i < newList.length; i++) {
        if (newList[i].children) {
            cleanMenuList(newList[i].children)
        }
        if (!newList[i].meta) {
            newList.splice(i, 1)
            i--
        }
    }

    return newList
}

menuList.value = cleanMenuList(menuList.value)

function skip(path: string) {
    router.push(path)
}
</script>

<template>
  <div class="flex w-full min-h-0 flex-col gap-4 pb-6 md:flex-row md:gap-0 md:pb-8">
    <div class="m-0 w-full shrink-0 md:mr-3 md:w-56 md:min-w-56">
      <router-link
        to="/log-lottery"
        class="btn btn-primary btn-sm mb-3 h-auto min-h-10 w-full whitespace-normal py-2.5 text-center font-semibold shadow-sm"
      >
        {{ t('sidebar.backToLotteryHome') }}
      </router-link>
      <ul class="m-0 w-full menu rounded-xl border border-base-300 bg-base-100 p-2 shadow-sm md:p-3 md:pt-6">
        <li v-for="item in menuList" :key="item.name">
          <details v-if="item.children && !item.meta.hidden" open>
            <summary>{{ item.meta.title }}</summary>
            <ul>
              <li v-for="subItem in item.children" :key="subItem.name">
                <details v-if="subItem.children" open>
                  <summary>{{ subItem.meta!.title }}</summary>
                  <ul>
                    <li v-for="subSubItem in subItem.children" :key="subSubItem.name">
                      <a
                        href="#"
                        class="block rounded-lg px-2 py-1.5 transition-colors hover:bg-base-300/60"
                        :class="subSubItem.name === route.name ? 'bg-primary/15 font-semibold text-primary' : ''"
                        @click.prevent="skip(subItem.path)"
                      >{{
                        subSubItem.meta!.title }}</a>
                    </li>
                  </ul>
                </details>
                <a
                  v-else
                  href="#"
                  class="block rounded-lg px-2 py-1.5 transition-colors hover:bg-base-300/60"
                  :class="subItem.name === route.name ? 'bg-primary/15 font-semibold text-primary' : ''"
                  @click.prevent="skip(subItem.path)"
                >{{
                  subItem.meta!.title }}</a>
              </li>
            </ul>
          </details>
          <a
            v-else-if="!item.meta.hidden"
            href="#"
            class="block rounded-lg px-2 py-1.5 transition-colors hover:bg-base-300/60"
            :class="item.name === route.name ? 'bg-primary/15 font-semibold text-primary' : ''"
            @click.prevent="skip(item.path)"
          >{{ item.meta!.title }}</a>
          <div v-else />
        </li>
      </ul>
    </div>
    <router-view class="mt-0 min-w-0 flex-1 md:mt-5" />
  </div>
</template>

<style scoped></style>
