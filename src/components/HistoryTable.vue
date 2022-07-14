<script setup>
import { inject, ref } from "vue";
import { key } from "../store";
const { store_update, store_set, store_get } = inject(key);

store_update();
const store = store_get();
const isReady = ref(false);
const edit_id = ref(null);
const textareaRef = ref(null);

setTimeout(() => {
  console.log("---------------------------------------------------")
  isReady.value = true;
  console.dir(store);
  console.log("---------------------------------------------------")
}, 1000)


const post_file = async (file_name, b64) => {
  let formData = new FormData();
  formData.append("data", b64, file_name);
  console.log(...formData.entries());

  return fetch("/store", {
    method: "post",
    mode: "no-cors",
    body: formData,
  })
    .then(response => {
      if (response.status == 200) {
        console.log(`成功:${JSON.stringify(response)}`);
        if (/.+\.jpg/.test(file_name)) {
          socketio.emit("update", { file_name: `/tmp/${file_name}` })
        }
      } else {
        console.log(`失敗:${JSON.stringify(response)}`);
      }
    })
    .catch(error => console.log(error.message));
}

const toggle_edit_mode = async (id) => {
  if (edit_id.value === id) {
    edit_id.value = null;

    const text_plain = new Blob([ store.infos[id].text_content ], { type:"text/plain" });
    await post_file(id + ".txt", text_plain);
  } else {
    edit_id.value = id;
  }
}


const isNotSameDay = (id) => {
  const id_list = Object.keys(store.infos);
  const id_index = id_list.indexOf(id);
  console.dir(id_list);
  console.log(id_index);
  if (id_index <= 0) {
    return true;
  } else {
    console.log(store.infos[id_list[id_index -1]])
    return store.infos[id_list[id_index -1]].day !== store.infos[id].day;
  }
}

</script>
<template>
  <div class="history_box" v-if="isReady">
    <div v-for="(info, id, index) in store.infos" :key="info.id">
      <div class="history_day" v-if="isNotSameDay(id)">{{ info.day }}</div>
      <div class="history_table">
        <div class="history_index">{{ index +1 }}</div>
        <div class="history_time">{{ info.h_m }}</div>
        <img :src=info.photo_url class="history_photo"/>
        <!-- <div>{{ info.text_content }}</div> -->
        <div v-if="edit_id !== id" @click="toggle_edit_mode(id)"><a href="#">{{ info.text_content }}</a></div>
        <div v-else><textarea ref="textareaRef" @blur="toggle_edit_mode(id)" v-model="info.text_content"></textarea></div>
      </div>
    </div>
  </div>
</template>
<style>
textarea  {
  font-size: 2rem;
  text-align: left;
  border: none;
  background-color: bisque;
  width: 100%;
}
.history_box{
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