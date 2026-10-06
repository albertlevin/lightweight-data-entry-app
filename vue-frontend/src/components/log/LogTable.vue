<template>
  <Dialog
    :visible="tableStore.isLoading"
    :modal="true"
    :closable="false"
    :showHeader="false"
    :baseZIndex="10000"
    :contentStyle="{ 'border-radius': '50%', 'background-color': '#fff', 'padding': '2rem' }"
    class="round-shadow-dialog"
  >
    <ProgressSpinner />
  </Dialog>

  <div class="card m-0 p-3">
    <Dropdown
      v-model="tableStore.displayChangeLogId"
      :options="tableStore.changeLogMain"
      optionLabel="LogMainDesc"
      optionValue="log_id"
      placeholder="Auswahl Protokolleintrag"
      class="mr-2"
      style="width: 100%; margin: 1.5em 0 2em 0"
      ref="dropdownSubSystem"
    />
    <template v-if="tableStore.logDetailContentIsLoaded">
      <DataTable
        ref="dt"
        :value="tableStore.changeLogDetails"
        scrollable
        scrollHeight="900px"
        tableStyle="width: 100%;"
        :rowHover="true"
        :resizableColumns="false"
        columnResizeMode="fit"
        :virtualScrollerOptions="{ itemSize: 30 }"
        :showGridlines="true"
        dataKey="id"
      >
        <Column
          v-for="(col, index) of columns"
          :key="'column-'+index"
          :field="col.fieldName"
          :header="col.description"
          style="border: 1px solid grey; padding: 5px; max-height: 35px;"
          :class="{'firstColumn': index === 0}"
        >
          <template #editor="{ data, field }">
            <InputText v-model="data[field]" />
          </template>
        </Column>
      </DataTable>
    </template>
  </div>
</template>

<script>
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import ProgressSpinner from "primevue/progressspinner";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import {mapStores} from "pinia/dist/pinia";
import {useTableStore} from "@/store/tableStore";
import InputText from "primevue/inputtext";

export default {
  components: {
    DataTable,
    Column,
    ProgressSpinner,
    Dialog,
    Dropdown,
    InputText
  },
  name: "LogTable",
  mounted() {
    this.tableStore.getChangeLogMain();
  },
  watch: {
    'tableStore.displayChangeLogId': function (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.tableStore.getChangeLogDetails();
      }
    }
  },
  data() {
    return {
      columns: [
        { description: 'Typ', fieldName: 'changeType' },
        { description: 'Details', fieldName: 'LogValues' }
      ],
    };
  },
  computed: {
    // sets this.tableStore variable
    ...mapStores(useTableStore),
  },
}
</script>

<style scoped>
  .firstColumn {
    width: auto;
    white-space: nowrap;
  }
</style>

<style module>
 .fixedWidthTable {
   table-layout: fixed;
   width: 100%;
 }
</style>