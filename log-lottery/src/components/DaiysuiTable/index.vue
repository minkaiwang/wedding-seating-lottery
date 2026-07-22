<script setup lang='ts'>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { safeAvatarUrl } from '@/utils/safeContent'

const props = defineProps({
    data: {
        type: Array as any,
        default: [] as any[],
    },
    tableColumns: {
        type: Array,
        default: [] as any[],
    },
})
const { t } = useI18n()
const dataColumns = computed<any[]>(() => {
    // 不带有actions的列
    const columns = props.tableColumns.filter((item: any) => !item.actions)

    return columns
})

const actionsColumns = computed<any[]>(() => {
    // 带有actions的列
    const columns = props.tableColumns.filter((item: any) => item.actions)

    return columns
})

function displayValue(column: any, row: any) {
    return column.formatValue ? column.formatValue(row) : row[column.props]
}
</script>

<template>
  <div class="w-full min-w-0 overflow-x-auto">
    <table class="table table-zebra min-w-[42rem] md:min-w-0">
      <!-- head -->
      <thead>
        <tr>
          <th v-for="(item, index) in dataColumns" :key="index">
            {{ item.label }}
          </th>
          <th v-for="(item, index) in actionsColumns" :key="index">
            {{ t('table.operation') }}
          </th>
          <th />
        </tr>
      </thead>
      <tbody v-if="data.length > 0">
        <!-- row  -->
        <tr v-for="item in data" :key="item.id" class="hover">
          <!-- <th>{{ item.id }}</th> -->
          <td v-for="(column, index) in dataColumns" :key="index">
            <template v-if="column.avatar">
              <img
                v-if="safeAvatarUrl(item[column.props])"
                :src="safeAvatarUrl(item[column.props])"
                alt="avatar"
                style="width: 50px; height: 50px;"
              >
              <span v-else>-</span>
            </template>
            <span v-else>{{ displayValue(column, item) }}</span>
          </td>
          <!-- action -->
          <td v-for="(column, index) in actionsColumns" :key="index" class="flex gap-2">
            <button
              v-for="action in column.actions" :key="action.name" class="btn btn-xs" :class="action.type"
              @click="action.onClick(item)"
            >
              {{ action.label }}
            </button>
          </td>
        </tr>
      </tbody>
      <tbody v-else>
        <tr>
          <td colspan="5" class="text-center">
            {{ t('table.noneData') }}
          </td>
        </tr>
      </tbody>
      <!-- foot -->
    </table>
  </div>
</template>

<style lang='scss' scoped></style>
