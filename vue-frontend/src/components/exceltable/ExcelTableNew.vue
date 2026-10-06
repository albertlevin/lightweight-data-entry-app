<template>
  <Toast />
  <div class="card">
    <Dialog
      v-model:visible="importDialogVisible"
      modal
      header="Select Data"
      :style="{ width: '75rem', height: '50rem' }"
      :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    >
      <TabView ref="tview" v-model:activeIndex="importDialogActiveTabIndex">
        <TabPanel v-for="sheet in sheetNames" :key="sheet" :header="sheet">
          <DataTable
            ref="sheet"
            :value="workbookData[sheet]"
            scrollable="true"
            showGridlines="true"
          >
            <Column
              v-for="col of Object.keys(workbookData[sheet][1])"
              :key="col"
              :header="col"
              :field="col"
            >
            </Column>
          </DataTable>
        </TabPanel>
      </TabView>
      <template #footer>
        <Button label="Import Table" @click="loadExcelTable" />
      </template>
    </Dialog>

    <FileUpload
      name="demo[]"
      url="/api/upload"
      accept=".xlsx,.xls"
      auto="true"
      customUpload
      :maxFileSize="1000000"
      @uploader="customBase64Uploader"
      chooseLabel="Select"
    >
      <template #empty>
        <p>Drag and drop files to here to upload.</p>
      </template>
    </FileUpload>
    <!-- <Button label="Download CSV"  -->
    <!--   severity="secondary" -->
    <!--   icon='pi pi-fw pi-download' -->
    <!--   @click="exportCSV($event)"> -->
    <!-- </Button> -->
    <!-- </template> -->
    <!-- </Toolbar> -->

    <DataTable
      ref="dt"
      :value="displayRecords"
      v-if="dataTableVisible"
      editMode="cell"
      @cell-edit-complete="onCellEditComplete"
      :pt="{
        column: {
          bodycell: ({ state }) => ({
            class: [{ 'pt-0 pb-0': state['d_editing'] }],
          }),
        },
      }"
      tableStyle=""
      rowHover="true"
      resizableColumns="true"
      columnResizeMode="expand"
      showGridlines="true"
      :rowStyle="rowStyle"
      dataKey="id"
    >
      <template #header>
        <div class="centered-text" v-if="displayTable !== null">
          {{ this.displayTable.displayName }}
        </div>
      </template>

      <Column
        v-for="col of displayColumns"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        style="border: 1px solid dark grey"
      >
        <template #editor="{ data, field }">
          <InputText v-model="data[field]" />
        </template>
      </Column>

      <template #footer>
        <div style="display: flex; justify-content: center">
          <Button
            label="Submit"
            icon="pi pi-check"
            :loading="loading"
            @click="load"
            severity="success"
            class="mr-2"
          />
          <Button
            label="Discard changes"
            icon="pi pi-times"
            @click="cancel"
            severity="secondary"
            class="mr-2"
          />
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script>
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Toast from "primevue/toast";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import * as XLSX from "xlsx";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
// import Toolbar from 'primevue/toolbar'
import FileUpload from "primevue/fileupload";

export default {
  components: {
    DataTable,
    Column,
    InputText,
    Toast,
    Button,
    Dialog,
    TabView,
    TabPanel,
    // Toolbar,
    FileUpload,
  },
  name: "ExcelTable",
  data() {
    return {
      displayRecords: null,
      displayColumns: null,
      dataTableVisible: false,
      importDialogVisible: false,
      importDialogActiveTabIndex: 0,
      displayTable: null,
      excelTables: [],
      sheetNames: [],
      workbookData: {},
    };
  },
  watch: {
    sheetNames() {
      console.log("Watching sheetNames.");
      console.log(this.sheetNames);
      this.importDialogVisible = true;
    },
    displayTable() {
      console.log("Watching displayTable.");
      console.log(this.displayTable);
    },
  },
  methods: {
    customBase64Uploader(event) {
      // 'load the first file
      const file = event.files[0];
      const reader = new FileReader();

      reader.onloadend = (e) => {
        const excelData = e.target.result;
        const workbook = XLSX.read(excelData, {
          type: "binary",
          cellStyles: true,
        });
        this.sheetNames = workbook.SheetNames;
        console.log(this.sheetNames);
        this.processWorkbook(workbook);
      };

      console.log(`Reading file: ${file}`);
      reader.readAsBinaryString(file);
      console.log(`Finished reading file: ${file}`);
    },

    processWorkbook(workbook) {
      const sheetNames = workbook.SheetNames;
      console.log(sheetNames);
      for (const sheet of sheetNames) {
        this.workbookData[sheet] = this.readSheet(workbook, sheet);
      }
      console.log(this.workbookData);
    },

    readSheet(workbook, sheetName) {
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet);
    },

    rowStyle(rowData) {
      if (rowData !== null) {
        if ("style" in rowData) {
          if (rowData["style"].includes("bold")) {
            return { fontWeight: "bold" };
          } else if (rowData["style"].includes("italic")) {
            return { fontStyle: "italic" };
          }
        }
      }
    },

    exportCSV() {
      this.$refs.dt.exportCSV();
    },

    /*
    This function is responsible for saving changes to edited cells. 
    The function compares the existing value to newValue and exits on strict equality 
    value === newValue.
    */
    onCellEditComplete(event) {
      /* 
      data contains the whole row as a JSON object
      newValue is the new value for a single cell 
      field is the column name where newValue was entered (the header)

      we set data[field] = newValue after checking the newValue.
      */
      let { data, value, newValue, field } = event;

      // if the user left the cell without changing the value, return
      // uses the strict equality: both the value and the type must be equal.
      if (value === newValue) return;

      // initialize an empty array to store error messages from validation
      const errors = [];
      let validationResult = this.validateDataType(newValue, field);
      if (!validationResult.isValid) errors.push(validationResult.message);

      // if there are any errors, display error messages to the user
      if (errors.length > 0) {
        errors.forEach((error) => {
          this.displayMessage({
            severity: "warn",
            summary: "Validation error",
            detail: error,
          });
        });
        return;
      } else {
        // if every validation passed, display a message and overwrite the row
        this.displayMessage({ severity: "success", summary: "Changes saved" });
        data[field] = newValue;
      }
    },

    // a function to display messages. Currently uses a Toast.
    displayMessage(messageParams) {
      let { severity, summary, detail } = messageParams;
      this.$toast.add({
        severity: severity,
        summary: summary,
        detail: detail,
        life: 5000,
      });
    },

    // this function verifies a single edited cell and returns true / false
    // we can still keep it for the k4 use case.
    validateDataType(newValue, field) {
      const column = this.displayColumns.find((col) => col.field === field);
      if (column) {
        const cellDataType = column.dataType;
        switch (cellDataType) {
          case "int": {
            // commented out because new input is always a string ?
            // let isValid = Number.isInteger(newValue) && newValue >= 0;
            let isValid = /^-?\d+$/.test(newValue);
            let message = isValid
              ? null
              : `Incorrect value ${newValue} for field ${field} (expected whole number).`;
            return { isValid: isValid, message: message };
          }
          case "float": {
            // commented out because new input is always a string ?
            // let isValid = typeof newValue === 'number' && !Number.isNaN(newValue) && newValue >= 0;
            // let isValid = /^-?\d+$/.test(newValue);
            let isValid =
              /^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(newValue) ||
              /^-?\d+$/.test(newValue) ||
              /^-?\d+(,\d+)?$/.test(newValue);
            let message = isValid
              ? null
              : `Incorrect value ${newValue} for field ${field} (expected number).`;
            return { isValid: isValid, message: message };
          }
          case "string": {
            let isValid = typeof newValue === "string";
            let message = isValid
              ? null
              : `Incorrect value ${newValue} for field ${field} (expected text).`;
            return { isValid: isValid, message: message };
          }
          case "date": {
            const date = new Date(newValue);
            let isValid = date.toString() !== "Invalid Date";
            let message = isValid
              ? null
              : `Incorrect value ${newValue} for field ${field} (expected date).`;
            return { isValid: isValid, message: message };
          }
        }
      } else {
        console.log(
          `Field ${field} not found in columns. Skipping the data check.`
        );
        return { isValid: true, message: null };
      }
    },

    /* 'a function to push a new table from an Excel sheet to the list of tables
    'the list of tables is stored as excelTables
    */
    loadExcelTable() {
      let tabIndex = this.importDialogActiveTabIndex;
      let sheetName = this.sheetNames[tabIndex];
      let sheetData = this.workbookData[sheetName];
      let sheetColumns = Object.keys(sheetData[1]); // 'take columns from the 2nd row of the file
      console.log(sheetColumns);
      // 'console.log(sheetName); // 'Bilanz'
      // 'console.log(sheetData); // 'a JSON object
      this.displayTable = { name: sheetName, displayName: sheetName };
      this.excelTables.push({ name: sheetName, displayName: sheetName });
      console.log(this.excelTables);

      // 'this.displayTable = { name: sheetName, displayName: sheetName };
      // 'this.displayRecords = sheetData;

      this.setDisplayRecords(sheetData);
      /* 'since our DataTable expects an array of objects with keys 'field', 'header', and 'dataType', 
      'construct it from columns here.
      */
      let extendedColumns = sheetColumns.map((value) => {
        let dataType = sheetColumns.indexOf(value) === 0 ? "str" : "float";
        return { field: value, header: value, dataType: dataType };
      });
      console.log(extendedColumns);
      this.setColumns(extendedColumns);

      // 'hide the Dialog again
      this.importDialogVisible = false;

      // 'make the table visible
      this.dataTableVisible = true;
    },

    setDisplayRecords(jsonData) {
      this.displayRecords = jsonData;
    },

    setColumns(columns) {
      this.displayColumns = columns;
    },
  },
};
</script>

<style module>
/* Add any styles you wish */
.centered-text {
  text-align: center;
}

.mybutton {
  /*margin-top: 10px;*/
  padding: 10px 20px;
  border-radius: 50px;
  border: none;
  background-color: rgb(37, 99, 235);
  color: white;
  font-size: 16px;
  cursor: pointer;
}
</style>
