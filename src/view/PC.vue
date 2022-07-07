<script setup>
import { ref, provide, inject, computed, watchEffect } from "vue";
import RemoteMainte from "../components/RemoteMainte.vue"
import HistoryTable from "../components/HistoryTable.vue"

const array_infos = ref([]);
provide("get_array_infos", () => { return array_infos.value });
provide("set_array_infos", v  => { array_infos.value.push(v)});

// const historyTable = ref(null);
// const onupload = () => { historyTable.value.get_text() }
</script>

<template>

  <div class="tab-wrap">
    <input id="tab01" type="radio" name="tab" class="tab-switch" checked="checked">
    <label class="tab-label" for="tab01">遠隔保守作業</label>
    <div class="tab-content">
      <!-- 本体タブ -->
      <!-- <RemoteMainte @upload="onupload"></RemoteMainte> -->
      <RemoteMainte></RemoteMainte>
    </div>
    <input id="tab02" type="radio" name="tab" class="tab-switch">
    <label class="tab-label" for="tab02">履歴一覧</label>
    <div class="tab-content">
      <HistoryTable ref="historyTable"></HistoryTable>
    </div>
    <input id="tab03" type="radio" name="tab" class="tab-switch">
    <label class="tab-label" for="tab03">報告書印刷</label>
    <div class="tab-content">
        コンテンツ 3
    </div>
  </div>

</template>

<style>
/* TAB */
.tab-wrap {
  display: flex;
  flex-wrap: wrap;
  margin:20px 0;
}
.tab-wrap:after {
  content: '';
  width: 100%;
  height: 3px;
  background: #325A8C;
  display: block;
  order: -1;
}
.tab-label {
  color: White;
  background: LightGray;
  font-weight: bold;
  white-space: nowrap;
  text-align: center;
  padding: 10px .5em;
  order: -1;
  position: relative;
  z-index: 1;
  cursor: pointer;
  border-radius: 5px 5px 0 0;
  flex: 1;
}
.tab-label:not(:last-of-type) {
  margin-right: 5px;
}
.tab-content {
  width: 100%;
  height: 0;
  overflow: hidden;
  opacity: 0;
}
.tab-switch:checked+.tab-label {
  background: #325A8C;
}
.tab-switch:checked+.tab-label+.tab-content {
  height: auto;
  overflow: auto;
  /* padding: 15px; */
  opacity: 1;
  transition: .5s opacity;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
}
.tab-switch {
  display: none;
}

.header {
  position: relative;
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  height: 60px;
  font-size: 1.5rem;
  color: #fff;
  background-color: cornflowerblue;
  user-select: none;
}


</style>