<template>
  <div v-if="!tableStore.userDataUpdated">
    Loading data...
  </div>
  <Toast />

    <Toolbar :class="$style.mytoolbar">
      <template #start>
        <Dropdown v-model="tableStore.displayServerTable" :options="serverTableNames" placeholder="Select Table" class="mr-2" />
      </template>
      <template #end>
      </template>
    </Toolbar>
  <div class="card m-0 p-3">
    <DataTable ref="dt" :value="changedRows"  
            scrollable scrollHeight="50rem"
            tableStyle=""
            rowHover="true"
            resizableColumns="true"
            columnResizeMode="expand"
            showGridlines="true"
            :rowStyle="rowStyleChanged"
            :class="$style.mydatatable"
            dataKey="id">
      <template #header>
        <div class="flex align-items-center justify-content-center">
          <span class="text-l text-600 font-bold">Changed Rows</span>
        </div>
      </template>

      <Column v-for="col of displayColumns" :key="col" :field="col" :header="col" style="border: 1px solid dark grey">
          <template #editor="{ data, field }">
              <InputText v-model="data[field]" />
          </template>
      </Column>
    </DataTable>

    <DataTable ref="dt" :value="newRows"  
            scrollable scrollHeight="50rem"
            tableStyle=""
            rowHover="true"
            resizableColumns="true"
            columnResizeMode="expand"
            showGridlines="true"
            :rowStyle="rowStyleNew"
            :class="$style.mydatatable"
            dataKey="id">
      <template #header>
        <div class="flex align-items-center justify-content-center">
          <span class="text-l text-600 font-bold">New Rows</span>
        </div>
      </template>

      <Column v-for="col of displayColumns" :key="col" :field="col" :header="col" style="border: 1px solid dark grey">
          <template #editor="{ data, field }">
              <InputText v-model="data[field]" />
          </template>
      </Column>
    </DataTable>

    <DataTable ref="dt" :value="deletedRows"  
            scrollable scrollHeight="50rem"
            tableStyle=""
            rowHover="true"
            resizableColumns="true"
            columnResizeMode="expand"
            showGridlines="true"
            :rowStyle="rowStyleDeleted"
            dataKey="id">

      <template #header>
        <div class="flex align-items-center justify-content-center">
          <span class="text-l text-600 font-bold">Deleted Rows</span>
        </div>
      </template>
      <Column v-for="col of displayColumns" :key="col" :field="col" :header="col" style="border: 1px solid dark grey">
          <template #editor="{ data, field }">
              <InputText v-model="data[field]" />
          </template>
      </Column>
    </DataTable>
  </div>
  <div style="display: flex; justify-content: center; align-content: center; margin-top: 20px; padding-bottom: 20px;">
    <Button label="Submit" icon="pi pi-check" :loading="loading" @click="load" severity="success" class="mr-2"/>
    <Button label="Discard changes" icon="pi pi-times" @click="cancel" severity="secondary" />
  </div>
</template>

<script>
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'

import { useTableStore } from '../../store/tableStore.js'
import { mapStores } from 'pinia'

export default {
  components: {
    DataTable,
    Column,
    Button,
    Toolbar,
    Dropdown
  },
  name: 'ServerTable',
  data() {
    return {
      newRows: null, // store a JSON array of records to display.
      deletedRows: null, // store a JSON array of records to display.
      changedRows: null, // store a JSON array of records to display.
      displayColumns: null, // store a list of columns
      serverTableNames: null, // store the list of serverTableNames to show in the drop-down
    };
  },
  mounted() {
    //  this method for when the user navigates back to the page.
    if (this.tableStore.userDataUpdated) {
      this.setDisplayVariables();
    }
    // this method is for the first load of the page. triggered by a change in isLoading();
    // using 'this' because tableStore is a computed property
    // 'subscribe' means that choosing a new table from the drop-down triggers setDisplayVariables();
    this.tableStore.$subscribe((mutation) => {
      console.log('Noticed changes in store!');
      if (mutation.events.key === 'displayServerTable' || mutation.events.key === 'userDataUpdated') {
        if (this.tableStore.userDataUpdated) {
          this.setDisplayVariables();
        }
      } else {
        console.log(`Ignoring change in store: ${mutation.events.key} is not being watched.`);
      }
    })
  },
  computed: {
    // sets this.tableStore variable
    ...mapStores(useTableStore)
  },
  methods: {

    setDisplayVariables() {
      // populate the drop-down of tables
      this.serverTableNames = [...this.tableStore.serverTables.keys()];
      console.log(this.serverTableNames);

      // if displayServerTable has not been set yet (e. g. first load), set it to the 1st one in the list
      if (!this.tableStore.displayServerTable) {
        this.tableStore.displayServerTable = this.serverTableNames[0];
      }
      console.log(this.tableStore.displayServerTable);

      // populate local records, columns, primary key columns
      // use a deep copy to avoid overwriting the store data
      const newRows = this.tableStore.newRows.get(this.tableStore.displayServerTable) ? this.tableStore.newRows.get(this.tableStore.displayServerTable) : null;
      this.newRows = newRows;

      const changedRows = this.tableStore.changedRows.get(this.tableStore.displayServerTable) ? this.tableStore.changedRows.get(this.tableStore.displayServerTable) : null;
      this.changedRows = changedRows;

      const deletedRows = this.tableStore.deletedRows.get(this.tableStore.displayServerTable) ? this.tableStore.deletedRows.get(this.tableStore.displayServerTable) : null;
      this.deletedRows = deletedRows;

      this.displayColumns = JSON.parse(JSON.stringify(this.tableStore.serverTables.get(this.tableStore.displayServerTable).tableColumns));
    },

    /* row styling methods */
    rowStyleChanged() {
      return { background: 'rgba(255, 223, 0, 0.5)' };
    },

    rowStyleDeleted() {
      return { background: 'rgba(255, 69, 0, 0.5)' };
    },

    rowStyleNew() {
      return { background: 'rgba(144, 238, 144, 0.5)' };
    }
  }
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
  background: #FFF;
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
  margin: none;
}
</style>
