<script setup>
import { inject, onMounted, ref } from "vue";
import { key } from "../store";
const { store_update, store_get } = inject(key);

store_update();
const store = store_get();
const isReady = ref(false);
const edit_index = ref(null);
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
          socketio.emit("update", { file_name: file_name })
        }
      } else {
        console.log(`失敗:${JSON.stringify(response)}`);
      }
    })
    .catch(error => console.log(error.message));
}

const toggle_edit_mode = async (index) => {
  console.log(index);
  if (edit_index.value === index) {
    edit_index.value = null;
    console.log(store.infos[index].text_content);
    console.log(textareaRef.value[0].value);
    console.log(store.infos[index].date);
    if (store.infos[index].text_content !== textareaRef.value[0].value) {
      // alert("変更したな！");
      const text_plain = new Blob([ textareaRef.value[0].value ], { type:"text/plain" });
      await post_file(store.infos[index].date + ".txt", text_plain);
      store_update();
    }
  } else {
    edit_index.value = index;
  }
}

</script>
<template>
  <!-- <div v-if="isReady">
    {{ file_infos }}
  </div> -->
  <div class="history_box" v-if="isReady">
    <div v-for="(info, index) in store.infos" :key="info.date">
      <div class="history_day" v-if="index === 0 ? true : info.day !== store.infos[index -1].day">{{ info.day }}</div>
      <div class="history_table">
        <div class="history_index">{{ index +1 }}</div>
        <div class="history_time">{{ info.h_m }}</div>
        <img :src=info.photo_url class="history_photo"/>
        <!-- <div>{{ info.text_content }}</div> -->
        <div v-if="edit_index !== index" @click="toggle_edit_mode(index)"><a href="#">{{ info.text_content }}</a></div>
        <div v-else><textarea ref="textareaRef" @blur="toggle_edit_mode(index)">{{ info.text_content }}</textarea></div>
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