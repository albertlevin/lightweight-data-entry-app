<template>
  <Toast />

  <Dialog
    :visible="tableStore.isLoading"
    :modal="true"
    :closable="false"
    :showHeader="false"
    :baseZIndex="10000"
    :contentStyle="{
      'border-radius': '50%',
      'background-color': '#fff',
      padding: '2rem',
    }"
    class="round-shadow-dialog"
  >
    <ProgressSpinner />
  </Dialog>

  <Toolbar :class="$style.mytoolbar">
    <template #start>
      <Dropdown
        v-model="tableStore.displaySubSystem"
        :options="tableStore.subSystems"
        placeholder="Auswahl deaktiviert"
        class="mr-2"
        disabled
      />
      <Dropdown
        v-model="tableStore.displayServerTable"
        :options="tableStore.serverTablesList"
        placeholder="Auswahl deaktiviert"
        class="mr-2"
        disabled
      />
    </template>
    <template #end> </template>
  </Toolbar>
  <div class="card m-0 p-3">
    <DataTable
      ref="dtu"
      :value="tableStore.updatedRows"
      scrollable
      scrollHeight="175px"
      tableStyle=""
      :rowHover="true"
      :resizableColumns="true"
      columnResizeMode="expand"
      :showGridlines="true"
      :rowStyle="rowStyleChanged"
      :class="$style.mydatatable"
      dataKey="id"
      :virtualScrollerOptions="{ itemSize: 4 }"
      removableSort
    >
      <template #header>
        <div class="flex align-items-center justify-content-center">
          <span class="text-l text-600 font-bold">Angepasste Zeilen</span>
        </div>
      </template>

      <Column
        v-for="(col, index) of tableStore.columnsMetaData"
        :key="'column-change-' + index"
        :field="col.fieldName"
        :header="col.description"
        sortable
        style="
          border: 1px solid dark grey;
          height: 35px;
          padding: 5px;
          max-height: 35px;
        "
        :class="{ hidden: col.systemColumn }"
        :bodyStyle="{
          'font-weight': col.primaryKey ? '700' : '400',
          color: col.primaryKey ? '#00a' : 'black',
        }"
      >
        <template #editor="{ data, field }">
          <InputText v-model="data[field]" />
        </template>
      </Column>
    </DataTable>

    <DataTable
      ref="dti"
      :value="tableStore.insertedRows"
      scrollable
      removableSort
      scrollHeight="175px"
      tableStyle=""
      :rowHover="true"
      :resizableColumns="true"
      columnResizeMode="expand"
      :showGridlines="true"
      :rowStyle="rowStyleNew"
      :class="$style.mydatatable"
      dataKey="id"
      :virtualScrollerOptions="{ itemSize: 4 }"
    >
      <template #header>
        <div class="flex align-items-center justify-content-center">
          <span class="text-l text-600 font-bold">Neue Zeilen</span>
        </div>
      </template>

      <Column
        v-for="(col, index) of tableStore.columnsMetaData"
        :key="'column-new-' + index"
        :field="col.fieldName"
        :header="col.description"
        sortable
        style="
          border: 1px solid dark grey;
          height: 35px;
          padding: 5px;
          max-height: 35px;
        "
        :class="{ hidden: col.systemColumn }"
        :bodyStyle="{
          'font-weight': col.primaryKey ? '700' : '400',
          color: col.primaryKey ? '#00a' : 'black',
        }"
      >
        <template #editor="{ data, field }">
          <InputText v-model="data[field]" />
        </template>
      </Column>
    </DataTable>

    <DataTable
      ref="dtd"
      :value="tableStore.deletedRows"
      scrollable
      removableSort
      scrollHeight="175px"
      tableStyle=""
      :rowHover="true"
      :resizableColumns="true"
      columnResizeMode="expand"
      :showGridlines="true"
      :rowStyle="rowStyleDeleted"
      dataKey="id"
      :virtualScrollerOptions="{ itemSize: 4 }"
    >
      <template #header>
        <div class="flex align-items-center justify-content-center">
          <span class="text-l text-600 font-bold">Gelöschte Zeilen</span>
        </div>
      </template>
      <Column
        v-for="(col, index) of tableStore.columnsMetaData"
        :key="'column-delete-' + index"
        :field="col.fieldName"
        :header="col.description"
        sortable
        style="
          border: 1px solid dark grey;
          height: 35px;
          padding: 5px;
          max-height: 35px;
        "
        :class="{ hidden: col.systemColumn }"
        :bodyStyle="{
          'font-weight': col.primaryKey ? '700' : '400',
          color: col.primaryKey ? '#00a' : 'black',
        }"
      >
        <template #editor="{ data, field }">
          <InputText v-model="data[field]" />
        </template>
      </Column>
    </DataTable>
  </div>
  <div
    style="
      display: flex;
      justify-content: center;
      align-content: center;
      margin-top: 20px;
      padding-bottom: 20px;
    "
  >
    <Button
      label="Abschicken"
      icon="pi pi-check"
      @click="submitData"
      severity="success"
      class="mr-2"
    />
    <Button
      label="Änderungen verwerfen"
      icon="pi pi-times"
      @click="discardLocalChanges"
      severity="secondary"
    />
  </div>
</template>

<script>
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Toolbar from "primevue/toolbar";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import Toast from "primevue/toast";
import ProgressSpinner from "primevue/progressspinner";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";

import { useTableStore } from "@/store/tableStore";
import { mapStores } from "pinia";
import { submitUserData } from "@/components/servertable/serverTable";
import { navigateTo } from "@/main";

export default {
  components: {
    DataTable,
    Column,
    Button,
    Toolbar,
    Dropdown,
    Toast,
    ProgressSpinner,
    Dialog,
    InputText,
  },
  name: "UploadCheck",
  data() {
    return {};
  },
  mounted() {
    if (this.tableStore.grantedSecurityIds.length === 0) {
      this.tableStore.getGrantedSecurityIds();
    }
  },
  computed: {
    // sets this.tableStore variable
    ...mapStores(useTableStore),
  },
  methods: {
    /* row styling methods */
    rowStyleChanged() {
      return {
        background: "rgba(255, 223, 0, 0.5)",
        height: "35px",
      };
    },

    rowStyleDeleted() {
      return {
        background: "rgba(255, 69, 0, 0.5)",
        height: "35px",
      };
    },

    rowStyleNew() {
      return {
        background: "rgba(144, 238, 144, 0.5)",
        height: "35px",
      };
    },
    submitData() {
      this.tableStore.isLoading = true;
      submitUserData(
        this.tableStore.displaySubSystem,
        this.tableStore.displayServerTable,
        this.tableStore.insertedRows,
        this.tableStore.updatedRows,
        this.tableStore.deletedRows
      )
        .then((result) => {
          // console.log("submitUserData Ergebnis:", result);
          if (result.ok) {
            this.displayMessage({
              severity: "success",
              summary: "Upload erfolgreich",
              detail: result.message,
            });
            this.tableStore.resetTable(true);
            this.tableStore.serverTableContent = JSON.parse(
              JSON.stringify(this.tableStore.serverTableContent)
            );
            navigateTo("/servertable");
          } else {
            this.displayMessage(
              {
                severity: "error",
                summary: "Upload fehlgeschlagen",
                detail: result.message,
              },
              12000
            );
          }
        })
        .catch((error) => {
          console.log(error);
          this.displayMessage(
            {
              severity: "error",
              summary: "Fehler",
              detail:
                error.message || "Ein unbekannter Fehler ist aufgetreten.",
            },
            12000
          );
        })
        .finally(() => {
          this.tableStore.isLoading = false;
        });
    },
    discardLocalChanges() {
      if (
        JSON.stringify(this.tableStore.clientTableContent) !==
        JSON.stringify(this.tableStore.serverTableContent)
      ) {
        this.displayMessage({
          severity: "success",
          summary: "Tabellendaten zurückgesetzt",
          detail:
            "Die für den Upload vorgemerkten Änderungen wurden verworfen.",
        });
      }
      this.tableStore.resetTable(false);
    },
    displayMessage(messageParams, lifetime = 5000) {
      let { severity, summary, detail } = messageParams;
      if (detail === undefined || detail === null || detail === "") {
        detail = "";
      } else {
        this.$toast.add({
          severity: severity,
          summary: summary,
          detail: detail,
          life: lifetime,
        });
      }
    },
  },
};
</script>

<style module>
/*
Use <style module> to pass styling to PrimeVue components.
source: https://primevue.org/theming/#cssmodules
*/
.centered-text {
  text-align: center;
}

.mytoolbar {
  display: flex;
  background: #fff;
  outline: none;
  border: none;
  padding-top: 2em;
  /*height: 30px;*/
}

/* utility CSS to add padding */
.mydatatable {
  padding-bottom: 3em;
}

.mybutton {
  height: 40px;
  font-weight: 500;
  font-size: 14px;
  margin: 0;
}
</style>
