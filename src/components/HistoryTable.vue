<script setup>
import { inject, ref } from "vue";
const set_array_infos = inject("set_array_infos");
const get_array_infos = inject("get_array_infos");

const array_infos = ref([]);
array_infos.value = get_array_infos();
</script>
<template>
  <div class="history_box">
    <div v-if="array_infos.length > 0" class="history_day">{{ array_infos[0].year_day }}</div>
    <div v-for="(info, index) in array_infos" class="history_table">
      <div class="history_index">{{ index +1 }}</div>
      <div class="history_time">{{ info.hour_min }}</div>
      <!-- <img :src="'/data/' + info.photo" class="history_photo"/> -->
      <img :src="'/tmp/' + info.photo" class="history_photo"/>
      <div>{{ info.text }}</div>
    </div>
  </div>
</template>
<style>
.history_box {
  margin: 10px;
  font-size: 2rem;
  text-align: left;
  border: solid 3px;
}
.history_table {
  display: flex;
  border: solid 1px;
}
.history_day {
  width: 100%;
}
.history_index {
  width: 40px;
}
.history_time {
  width: 160px;
  border-left: solid 1px;
  border-right: solid 1px;
}
.history_photo {
  width: 240px;
  border-left: solid 1px;
  border-right: solid 1px;
}
</style>