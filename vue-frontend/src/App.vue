<template>
  <div class="card">
    <Menubar :model="menuItems" :class="$style.mymenubar">
      <template #item="{ label, item, props, root, hasSubmenu }">
        <router-link
          v-if="item.route"
          v-slot="routerProps"
          :to="item.route"
          custom
        >
          <a
            :href="routerProps.href"
            v-bind="props.action"
            @click="routerProps.navigate"
          >
            <span v-bind="props.icon" />
            <span v-bind="props.label">{{ label }}</span>
          </a>
        </router-link>
        <a v-else :href="item.url" :target="item.target" v-bind="props.action">
          <span v-bind="props.icon" />
          <span v-bind="props.label">{{ label }}</span>
          <span
            :class="[
              hasSubmenu &&
                (root ? 'pi pi-fw pi-angle-down' : 'pi pi-fw pi-angle-right'),
            ]"
            v-bind="props.submenuicon"
          />
        </a>
      </template>
    </Menubar>
  </div>
  <router-view />
</template>

<script>
import Menubar from "primevue/menubar";

export default {
  components: {
    Menubar,
  },
  name: "App",
  data() {
    return {
      menuItems: [
        { label: "Home", icon: "pi pi-fw pi-home", route: "/" },
        {
          label: "Daten hochladen",
          icon: "pi pi-fw pi-database",
          route: "/servertable",
        },
        {
          label: "Änderungen validieren",
          icon: "pi pi-fw pi-clock",
          route: "/upload",
        },
        {
          label: "Änderungs-Protokoll",
          icon: "pi pi-fw pi-book",
          route: "/log",
        },
        /*
        {
          label: "Excel",
          icon: "pi pi-fw pi-file-excel",
          route: "/exceltable",
        },
        */
        {
          label: "Daten analysieren",
          icon: "pi pi-fw pi-chart-bar",
          route: "/report",
        },
      ],
    };
  },
};
</script>

<style module>
.mymenubar {
  border: none;
  outline: none;
  background: #fff;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  line-height: 20px;
  height: 20px;
  justify-content: between;
}
/* Add any styles you wish */
</style>
