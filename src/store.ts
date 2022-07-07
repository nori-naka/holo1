import { InjectionKey, reactive, readonly } from 'vue'

interface ArrayInfo {
  date: String,
  day: String,
  h_m: String,
  text_content: String,
  photo_url: String,
}
interface store {
  state: {
    readonly infos: Array<ArrayInfo>
  };
  store_get: () => ArrayInfo[];
  store_update: () => void;
}

const state = reactive<{
  infos: Array<ArrayInfo>
}>({
  infos: []
})

const store_get = () => { return state }
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
            const [ same_info ] = state.infos.filter(info => { return info.date === file_name });
            let text_content = ""
            if (file_ext === "txt") {
              try {
                const res = await fetch(`/tmp/${name}`, { method: "get", mode: "no-cors" });
                text_content = await res.text();
              } catch (err) {
                console.log(err);
              }
            }
            if (same_info) {
              const rest_infos = state.infos.filter(info => { return info.date !== file_name })
              if (file_ext === "jpg") {
                same_info.photo_url = `/tmp/${name}`
              } else {
                same_info.text_content = text_content;
              }
              state.infos = [ ...rest_infos, same_info ];
            } else {
              state.infos = [ ...state.infos, {
                date: file_name,
                day: new Date(Number(file_name)).toLocaleDateString(),
                h_m: new Date(Number(file_name)).toLocaleTimeString(),
                text_content: file_ext === "txt" ? text_content : "",
                photo_url: file_ext === "jpg" ? `/tmp/${name}` : "",
              }]
            }
          }
        })
        console.dir(state.infos);
        state.infos.sort((a, b) => { return Number(a.date) - Number(b.date) });
      })
    .catch(error => {
      console.log(error);
    });
}

export default {
  state: readonly(state),
  store_get,
  store_update
}

export const key: InjectionKey<store> = Symbol('key')