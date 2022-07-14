import { reactive, readonly } from 'vue'

const store_get = () => { return state }
const store_set = (id, value) => {
  state.infos[id] = value;
}
const store_update = () => {
  // const re = /(?<date>\d+年\d+月\d+日)(?<hour_min>\d+時\d+分\d+秒)\.(?<ext_name>\w+)/
  const re = /(?<file_name>\d+)\.(?<file_ext>\w+)/
  fetch("/file_list", {
    method: "get",
    mode: "no-cors",
  })
    .then(res => { return res.json() })
    .then(file_list => {
      console.log(file_list);
      file_list.forEach(async ({name}) => {

        const match = re.exec(name);
        if (match && match.groups) {
          const { file_name, file_ext } = match.groups;
          console.log(`file_name = ${file_name} / file_ext = ${file_ext}`);
          let text_content = ""
          if (file_ext === "txt") {
            try {
              const res = await fetch(`/tmp/${name}`, { method: "get", mode: "no-cors" });
              text_content = await res.text();
            } catch (err) {
              console.log(err);
            }
          }
          if (state.infos[file_name]) {
            if (file_ext === "jpg") {
              state.infos[file_name].photo_url = `/tmp/${name}`;
            } else {
              state.infos[file_name].text_content = text_content;
            }
          } else {
            state.infos[file_name] = {
              id: file_name,
              day: new Date(Number(file_name)).toLocaleDateString(),
              h_m: new Date(Number(file_name)).toLocaleTimeString(),
              text_content: file_ext === "txt" ? text_content : "",
              photo_url: file_ext === "jpg" ? `/tmp/${name}` : "",                
            }
          }
        }
      })
      console.dir(state.infos);
    })
  .catch(error => {
    console.log(error);
  });
}

const state = reactive({
  infos: {},
  store_get,
  store_set, 
  store_update
});

export default {
  state: readonly(state),
  store_get,
  store_set,
  store_update
}

export const key = Symbol('key')