import { createRouter, createWebHistory } from "vue-router";

import HomePage from "./components/homepage/HomePage.vue";
import ServerTable from "./components/servertable/ServerTable.vue";
import ExcelTable from "./components/exceltable/ExcelTableNew.vue";
import UploadCheck from "./components/uploadCheck/UploadCheck.vue";
import LogTable from "./components/log/LogTable.vue";
import PowerBI from "./components/powerbi/PowerBI.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/servertable", component: ServerTable },
    { path: "/exceltable", component: ExcelTable },
    { path: "/", component: HomePage },
    { path: "/upload", component: UploadCheck },
    { path: "/log", component: LogTable },
    { path: "/report", component: PowerBI },
  ],
});
