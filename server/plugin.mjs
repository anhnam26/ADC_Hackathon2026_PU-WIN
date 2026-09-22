import {createApi} from './api.mjs';
export default function dayzeroApi(){return {name:'dayzero-api',configureServer(server){server.middlewares.use(createApi());},configurePreviewServer(server){server.middlewares.use(createApi());}};}
