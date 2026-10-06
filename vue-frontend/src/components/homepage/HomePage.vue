<template>
  <div class="card">
    <div
      style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 10px;
        padding-top: 200px;
        padding-bottom: 210px;
        height: 100%;
      "
    >
      <div style="font-size: 36px">
        <span style="font-weight: 500"> Wilkommen zum </span>
        <span style="color: rgb(37, 99, 235); font-weight: 500">
          Data Review Tool
        </span>
      </div>
      <div style="font-size: 16px">
        Wähle eine Datenbanktabelle aus, um fortzufahren.
      </div>
      <div style="padding-top: 20px">
        <Button
          @click="navigateToServerTable"
          :class="$style.mybutton"
          label="Starten"
          icon="pi pi-angle-double-right"
        ></Button>
      </div>
    </div>
  </div>
</template>

<script>
import Button from "primevue/button";

export default {
  components: {
    Button,
  },
  name: "HomePage",
  data() {
    return {};
  },
  methods: {
    navigateToServerTable() {
      this.$router.push("/servertable");
    },
  },
};
</script>

<style module>
.mybutton {
  margin-top: 10px;
  padding: 10px 20px;
  border-radius: 50px;
  border: none;
  background-color: rgb(37, 99, 235);
  color: white;
  font-size: 16px;
  cursor: pointer;
}
.mydialog {
  justify-content: center;
  display: flex;
  font-size: 16px;
}

/*
style="width: 100%; height: auto; display: block; margin: 0 auto;"
*/
.responsive-image img {
  max-width: 100%;
  height: auto;
}
</style>
