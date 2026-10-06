<template>
  <div v-if="tableStore.isLoading" :class="$style.showLoading">
    Wird geladen...
  </div>
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
  <Dialog
    v-model:visible="importDialogVisible"
    modal
    header="Wählen Sie eine Tabelle aus"
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
      <Button label="Tabelle Importieren" @click="loadExcelTable" />
    </template>
  </Dialog>

  <Toolbar :class="$style.mytoolbar">
    <template #start>
      <Dropdown
        v-model="tableStore.displaySubSystem"
        :options="tableStore.subSystems"
        @focus="warnChangeSubSystem"
        placeholder="Datenquelle auswählen"
        class="mr-2"
        ref="dropdownSubSystem"
      />
      <Dropdown
        v-model="tableStore.displayServerTable"
        :options="tableStore.serverTablesList"
        @focus="warnChangeServerTable"
        placeholder="Tabelle auswählen"
        class="mr-2"
        ref="dropdownServerTable"
      />
    </template>
    <template #end>
      <FileUpload
        :class="$style.myuploadbutton"
        mode="basic"
        name="demo[]"
        url="/api/upload"
        accept=".xlsx,.xls"
        auto="true"
        customUpload
        :maxFileSize="1000000"
        @uploader="customBase64Uploader"
        chooseLabel="Aus Excel hochladen"
      />
      <Button
        label="Als Excel herunterladen"
        severity="secondary"
        icon="pi pi-fw pi-download"
        @click="exportToExcel"
        :class="$style.mybutton"
      >
      </Button>
    </template>
  </Toolbar>
  <div class="card m-0 p-3">
    <template v-if="tableStore.serverTableContentIsLoaded">
      <DataTable
        ref="dt"
        :value="tableStore.clientTableContent"
        scrollable
        scrollHeight="900px"
        editMode="cell"
        :pt="{
          column: {
            bodycell: ({ state }) => ({
              class: [{ 'pt-0 pb-0': state['d_editing'] }],
            }),
          },
        }"
        tableStyle=""
        :rowStyle="rowStyle"
        :rowHover="true"
        :resizableColumns="true"
        :virtualScrollerOptions="{ itemSize: 30 }"
        columnResizeMode="expand"
        :showGridlines="true"
        dataKey="id"
        removableSort
        v-model:filters="filters"
        filterDisplay="row"
        @cell-edit-complete="onCellEditComplete"
        @paste="handlePasteFromClipboard"
      >
        <Column
          v-for="(col, index) of tableStore.columnsMetaData"
          :key="'column-' + index"
          :field="col.fieldName"
          :header="col.description"
          sortable
          style="border: 1px solid dark grey"
          :class="{
            hidden: col.systemColumn,
            disabledTable: col.backendGenerated,
          }"
        >
          <template #filter="{ filterModel, filterCallback }">
            <InputText
              v-model="filterModel.value"
              type="text"
              @input="filterCallback()"
              placeholder="Filter"
            />
          </template>

          <template #editor="{ data, field }">
            <template v-if="col.genericType === 'date' || col.backendGenerated">
              <!-- Differentiate between input fields based on their types -->
              <InputText
                v-model="data[field]"
                :type="col.genericType"
                :required="col.required"
                :disabled="col.systemColumn || col.backendGenerated"
                :style="{ padding: '5px', width: '100%' }"
              />
            </template>
            <template v-else>
              <!-- Differentiate between input fields based on their types -->
              <InputText
                v-model="data[field]"
                :type="
                  col.genericType === 'numberInt' ||
                  col.genericType === 'numberFloat'
                    ? 'number'
                    : col.genericType
                "
                :required="col.required"
                :minlength="col.minLength"
                :maxlength="col.maxLength"
                :disabled="col.systemColumn"
                :style="{ padding: '5px', width: '100%' }"
                @paste="handlePasteFromClipboard($event, data, field)"
              />
            </template>
          </template>
        </Column>
        <Column
          style="
            border: 1px solid dark grey;
            width: 42px;
            height: 35px;
            max-height: 35px;
            padding: 5px;
          "
        >
          <template #body="{ data }">
            <Button
              :style="{ width: '2rem', padding: '0.4rem 0' }"
              class="p-button-danger"
              icon="pi pi-times"
              @click="deleteRow(data)"
            />
          </template>
        </Column>
      </DataTable>
    </template>
  </div>
</template>

<script>
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Toast from "primevue/toast";
import Toolbar from "primevue/toolbar";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import ProgressSpinner from "primevue/progressspinner";
import Dialog from "primevue/dialog";
import { useTableStore } from "@/store/tableStore";
import { mapStores } from "pinia";
import { simpleValidateDataType } from "./convertValidateData.js";
import { SECURITY_COLUMN } from "@/components/global_vars";
import * as XLSX from "xlsx";
import { FilterMatchMode } from "primevue/api";

// for Excel upload
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import FileUpload from "primevue/fileupload";

export default {
  components: {
    DataTable,
    Column,
    InputText,
    Button,
    Toast,
    Toolbar,
    Dropdown,
    ProgressSpinner,
    Dialog,
    TabView,
    TabPanel,
    FileUpload,
  },
  name: "ServerTable",
  data() {
    return {
      showConfirmationSubSystem: false,
      showConfirmationServerTable: false,
      confirm: null,
      filters: {},
      // for Excel import
      importDialogVisible: false,
      importDialogActiveTabIndex: 0,
      excelTables: [],
      sheetNames: [],
      workbookData: {},
    };
  },
  created() {
    if (this.tableStore.columnsMetaData.length > 0) this.createFilters();
  },
  mounted() {
    if (this.tableStore.grantedSecurityIds.length === 0) {
      this.tableStore.getGrantedSecurityIds();
    }
  },
  watch: {
    "tableStore.displaySubSystem": function (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.tableStore.resetTable();
        this.tableStore.getListOfSubSystemTables();
      }
    },
    "tableStore.displayServerTable": function (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.tableStore.resetTable();
        this.tableStore.getServerTables();
      }
    },

    "tableStore.columnsMetaData": function (newValue, oldValue) {
      if (newValue !== oldValue) {
        if (newValue.length > 0) this.createFilters();
      }
    },

    sheetNames() {
      console.log("Watching sheetNames.");
      console.log(this.sheetNames);
      this.importDialogVisible = true;
    },
  },
  computed: {
    // sets this.tableStore variable
    ...mapStores(useTableStore),
  },
  methods: {
    createFilters() {
      this.filters = {};
      if (this.tableStore.columnsMetaData.length > 0) {
        this.tableStore.columnsMetaData.forEach((col) => {
          this.filters[col.fieldName] = {
            value: null,
            matchMode: FilterMatchMode.CONTAINS,
          };
        });
      } else {
        this.filters = {};
      }
    },

    warnChangeSubSystem() {
      if (
        JSON.stringify(this.tableStore.clientTableContent) !==
        JSON.stringify(this.tableStore.serverTableContent)
      ) {
        this.displayMessage(
          {
            severity: "warn",
            summary: "Subsystem wirklich wechseln?",
            detail:
              "Alle gemachten Änderungen werden zurückgesetzt wenn sie das Subsystem jetzt wechseln?",
          },
          4500
        );
      }
    },

    warnChangeServerTable() {
      if (
        JSON.stringify(this.tableStore.clientTableContent) !==
          JSON.stringify(this.tableStore.serverTableContent) &&
        this.tableStore.wasSubmitted === false
      ) {
        this.displayMessage(
          {
            severity: "warn",
            summary: "Tabelle wirklich wechseln?",
            detail:
              "Alle gemachten Änderungen werden zurückgesetzt wenn sie die Tabelle jetzt wechseln?",
          },
          4500
        );
      }
    },

    rowStyle() {
      return { height: "35px" };
    },

    exportToExcel() {
      let ws = null;
      if (this.$refs.dt && this.$refs.dt.processedData)
        ws = XLSX.utils.json_to_sheet(this.$refs.dt.processedData);
      else ws = XLSX.utils.json_to_sheet(this.tableStore.clientTableContent);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, this.tableStore.displayServerTable);
      XLSX.writeFile(wb, `${this.tableStore.displayServerTable}.xlsx`);
    },

    // 'Attempt to import excel into currently selected table.
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
      for (const sheet of sheetNames) {
        this.workbookData[sheet] = this.readSheet(workbook, sheet);
      }
    },

    readSheet(workbook, sheetName) {
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet);
    },

    /* 'A function to load the contents of the excel table
    'into the currently selected table.
    'This function uses some functionality from handlePastedTable. */
    loadExcelTable() {
      let tabIndex = this.importDialogActiveTabIndex;
      let sheetName = this.sheetNames[tabIndex];
      let sheetData = this.workbookData[sheetName];
      /* 'sheetData is an array of objects like
      '{Konto: 'Umsatzkosten', Januar: -140000, Februar: -220000, März: -190000, ...}
      */
      // 'let sheetColumns = Object.keys(sheetData[1]); // 'take columns from the 2nd row of the file
      // 'console.log(sheetColumns);

      // 'Filter out duplicated rows and keep only unique new
      const uniqueNewTableData = sheetData.filter(
        (newRow) => !this.checkRowExist(newRow)
      );

      // 'append the rows to the table
      this.tableStore.setClientTableContent([
        ...this.tableStore.clientTableContent,
        ...uniqueNewTableData,
      ]);

      // 'append the rows to the change log - to display as changes
      uniqueNewTableData.forEach((newRow) => {
        this.tableStore.addChangelogEntry(
          this.tableStore.displayServerTable,
          newRow,
          "INSERT"
        );
      });

      this.displayMessage({
        severity: "success",
        summary: `Einfügen erfolgreich`,
        detail: `Es wurden ${uniqueNewTableData.length} Zeilen für den upload vermerkt`,
      });

      // 'Step 1: compare columns with table columns
      // 'Step 2: compare data types
      // 'Step 3: check SQL injections
      // 'Step 4: add new rows

      // 'this.displayTable = { name: sheetName, displayName: sheetName };
      // 'this.displayRecords = sheetData;
      console.log(sheetData);

      // 'hide the Dialog again
      this.importDialogVisible = false;
    },

    /*
    This function is responsible for saving changes to edited cells. 
    The function compares the existing value to newValue and exits on strict equality 
    value === newValue.
    */
    onCellEditComplete(event) {
      /*
      data contains the whole row as a JSON object
      newData contains the whole new row as a JSON object
      newValue is the new value for a single cell
      field is the column name where newValue was entered (the header)

      we set data[field] = newValue after checking the newValue.
      */
      let { data, newData, value, newValue, field } = event;
      const originData = JSON.parse(JSON.stringify(data));

      // if the user left the cell without changing the value, return
      // uses the strict equality: both the value and the type must be equal.
      if (value === newValue) return;

      // if the user edited the data, validate data types
      const tableDataTypes = this.tableStore.columnsMetaData.map(
        (col) => col.genericType
      );
      const tableDataRequired = this.tableStore.columnsMetaData.map(
        (col) => col.required
      );

      const { convertedObject, errors } = simpleValidateDataType(
        tableDataTypes,
        newData,
        tableDataRequired
      );

      // if there are any errors, display error messages to the user
      if (errors.length > 0) {
        errors.forEach((error) => {
          this.displayMessage(
            {
              severity: "warn",
              summary: "Validation error",
              detail: error,
            },
            3000
          );
        });
        return;
      } else {
        // if every validation passed, display a message and overwrite the row
        this.displayMessage({
          severity: "success",
          summary: "Änderungen für Upload vorgemerkt",
        });

        data[field] = convertedObject[field]; // convertedObject contains the whole row

        const isPrimaryKeyChanged =
          this.tableStore.serverTablePrimaryKeys.includes(field);

        // push the change to the changelog
        if (isPrimaryKeyChanged) {
          // make entry for deleting the old row
          this.tableStore.addChangelogEntry(
            this.tableStore.displayServerTable,
            originData,
            "DELETE"
          );
          // make entry for inserting the new row
          this.tableStore.addChangelogEntry(
            this.tableStore.displayServerTable,
            convertedObject,
            "INSERT"
          );
        } else {
          this.tableStore.addChangelogEntry(
            this.tableStore.displayServerTable,
            convertedObject,
            "UPDATE"
          );
        }
      }
    },

    // a function to display messages. Currently uses a Toast.
    displayMessage(messageParams, life = 1500) {
      let { severity, summary, detail } = messageParams;
      this.$toast.add({
        severity: severity,
        summary: summary,
        detail: detail,
        life: life,
      });
    },

    checkForHtmlInjections(pastedData) {
      // check for HTML Tags copied content to prevent with regex and keywords
      const htmlRegex = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*>(.*?)<\/\1>/;
      const containsHTML = htmlRegex.test(pastedData);

      if (containsHTML) {
        this.displayMessage(
          {
            severity: "error",
            summary: `Das Einfügen der Inhalte wurde abgelehnt`,
            detail: `Die kopierten Inhalte dürfen kein HTMl enthalten`,
          },
          3000
        );
      }
      return containsHTML;
    },
    checkForSQLInjections(pastedData) {
      // check for SQL copied content to prevent with regex and keywords
      const sqlRegex = /SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE/i;
      const containsSQL = sqlRegex.test(pastedData);

      if (containsSQL) {
        this.displayMessage(
          {
            severity: "error",
            summary: `Das Einfügen der Inhalte wurde abgelehnt`,
            detail: `Die kopierten Inhalte dürfen keine SQL Kommandos enthalten`,
          },
          3000
        );
      }
      return containsSQL;
    },

    handlePasteFromClipboard(event, data = null, field = null) {
      event.preventDefault();

      let target = event.target;

      // get clipboard content
      const clipboardData = event.clipboardData || window.clipboardData;
      const pastedData = clipboardData.getData("Text");

      // check for SQL and HTML injections
      const containsSQL = this.checkForSQLInjections(pastedData);
      const containsHTML = this.checkForHtmlInjections(pastedData);

      if (containsHTML || containsSQL) {
        return;
      } else if (data !== null && field !== null) {
        this.handlePasteSingleValue(
          event,
          target,
          pastedData.trim(),
          data,
          field
        );
      } else {
        const hasTab = pastedData.includes("\t");
        const hasNewline =
          pastedData.includes("\n") || pastedData.includes("\r\n");

        if (hasTab || hasNewline) {
          this.handlePastedTable(pastedData);
        }
      }
    },
    handlePastedTable(pastedData) {
      // split the data in rows and then cells
      let rows = pastedData
        .trim()
        .split("\n")
        .map((row, index) => ({
          data: row.split("\t").map((cell) => cell.trim()),
          originalIndex: index + 1, // +1, excel starts with index 1
        }));

      // reverse the columns to check if the last columns are backend generated
      const reversedMetaDataColumns = [
        ...this.tableStore.columnsMetaData,
      ].reverse();
      // check if the last columns are backend generated and get the index
      let countEndBackendColumns = reversedMetaDataColumns.findIndex(
        (arr) => arr.backendGenerated !== true
      );

      const columnCountMismatch = () => {
        return rows.some((row) => {
          if (countEndBackendColumns !== -1) {
            // check if columns count is the same as the columns copied from clipboard without the backend generated columns
            return (
              row.data.length !==
              this.tableStore.columnsMetaData.length - countEndBackendColumns
            );
          } else {
            // check if columns count is the same as the columns copied from clipboard
            return row.data.length !== this.tableStore.columnsMetaData.length;
          }
        });
      };

      if (columnCountMismatch()) {
        this.setErrorMessage(rows, countEndBackendColumns);
        return;
      }

      // check if the first row is a table header row, if yes remove it
      const headers = rows[0].data.map((header) => header.trim().toLowerCase());
      const columnsMatch = this.tableStore.columnsMetaData.every(
        (col, index) => col.fieldName.toLowerCase() === headers[index]
      );
      if (columnsMatch) rows = rows.slice(1);

      // // if the user edited the data, validate data types
      const tableDataTypes = this.tableStore.columnsMetaData.map(
        (col) => col.genericType
      );
      const tableDataRequired = this.tableStore.columnsMetaData.map(
        (col) => col.required
      );

      // validate
      let convertedObjects = [];
      let errors = [];

      // remove empty rows
      let trimmedRows = rows
        .filter((row) => row.data.some((cell) => cell.trim() !== ""))
        .map((row) => ({
          data: row.data,
          originalIndex: row.originalIndex,
        }));

      trimmedRows.forEach((newData) => {
        const validationResult = simpleValidateDataType(
          tableDataTypes,
          newData.data,
          tableDataRequired
        );
        if (validationResult.errors[0] !== undefined) {
          errors.push({
            message: validationResult.errors[0],
            rowIndex: newData.originalIndex,
          });
        }
        convertedObjects.push(validationResult.convertedObject);
      });

      // if there are any errors, display error messages to the user
      if (errors.length > 0) {
        errors.forEach((error) => {
          if (error.message !== undefined && error.message !== "") {
            this.displayMessage(
              {
                severity: "error",
                summary: `Validierungsfehler in Zeile ${error.rowIndex}:`,
                detail: error.message,
              },
              6000
            );
          }
        });
      } else {
        // Check if the values in the security column are present in the `grantedSecurityIds` array
        const securityColumnIndex = this.tableStore.columnsMetaData.findIndex(
          (col) => col.fieldName === SECURITY_COLUMN
        );
        if (securityColumnIndex !== -1) {
          const securityValues = convertedObjects.map(
            (obj) => obj[securityColumnIndex]
          );
          const missingSecurityValues = securityValues.filter(
            (value) => !this.tableStore.grantedSecurityIds.includes(value)
          );
          if (missingSecurityValues.length > 0) {
            this.displayMessage(
              {
                severity: "error",
                summary: `Das Einfügen der Inhalte wurde abgelehnt`,
                detail: `Für die folgenden Werte in der Spalte ${SECURITY_COLUMN} sind sie nicht berechtigt: ${missingSecurityValues.join(
                  ", "
                )}`,
              },
              7000
            );
            return;
          }
        }

        // converting of rows into object based cols for PrimeVue
        const newTableData = convertedObjects.map((obj) => {
          const newObj = {};
          Object.entries(obj).forEach(([key, value]) => {
            // set key from displayColumns using the current index
            const newKey =
              this.tableStore.columnsMetaData[parseInt(key, 10)].fieldName; // check if key is parsed correctly
            newObj[newKey] = value;
          });
          return newObj;
        });

        // Filter out duplicated rows and keep only unique new
        const uniqueNewTableData = newTableData.filter(
          (newRow) => !this.checkRowExist(newRow)
        );

        // add new rows in existing Table
        this.tableStore.setClientTableContent([
          ...this.tableStore.clientTableContent,
          ...uniqueNewTableData,
        ]);

        uniqueNewTableData.forEach((newRow) => {
          this.tableStore.addChangelogEntry(
            this.tableStore.displayServerTable,
            newRow,
            "INSERT"
          );
        });

        this.displayMessage({
          severity: "success",
          summary: `Einfügen erfolgreich`,
          detail: `Es wurden ${uniqueNewTableData.length} Zeilen für den upload vermerkt`,
        });
      }
    },
    handlePasteSingleValue(event, target, pastedData, data, field) {
      // Check if there is marked text
      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      const isSelected = selectionStart !== selectionEnd;

      let currentValue = target.value;

      if (isSelected) {
        // if text is marked, replace it with copied text
        const text =
          currentValue.slice(0, selectionStart) +
          pastedData +
          currentValue.slice(selectionEnd);
        data[field] = text;
        // set new cursor position after inserting
        target.setSelectionRange(
          selectionStart + pastedData.length,
          selectionStart + pastedData.length
        );
      } else {
        // if text is not marked, set copied text at the cursor position
        const cursorPos = target.selectionStart;
        const text =
          currentValue.slice(0, cursorPos) +
          pastedData +
          currentValue.slice(cursorPos);
        data[field] = text;
        // set new cursor position after inserting
        target.setSelectionRange(
          cursorPos + pastedData.length,
          cursorPos + pastedData.length
        );
      }
    },
    checkRowExist(newRow) {
      // define new helper method to test if a new row is unique when inserting in table
      return this.tableStore.clientTableContent.some((existingRow) => {
        return this.tableStore.columnsMetaData.every((col) => {
          return existingRow[col.fieldName] === newRow[col.fieldName];
        });
      });
    },
    setErrorMessage(rows, countEndBackendColumns) {
      // set columns names for error message
      let columnsNames = "";

      this.tableStore.columnsMetaData.forEach(
        (column) => (columnsNames += ` ${column.fieldName} `)
      );

      //set error message parts
      let errorMessageLength = "";
      const errorMessageColumnCheck = `Bitte überprüfen sie ihre kopierte Tabelle auf folgende Spalten:${columnsNames}`;

      const columnsLength =
        countEndBackendColumns === -1
          ? this.tableStore.columnsMetaData.length
          : this.tableStore.columnsMetaData.length - countEndBackendColumns;

      // check if the copied table from clipboard has more or less columns than the defined table and set the proper message part
      if (rows[0].data.length < columnsLength) {
        errorMessageLength = `von ${columnsLength} benötigten Spalten konnten nur ${rows[0].data.length} gefunden werden.`;
      } else {
        errorMessageLength = `es wurden ${rows[0].data.length} Spalten in der kopierten Tabelle gefunden, die Zieltabelle enthält aber nur ${columnsLength} Spalten. die nicht vom System gefüllt werden`;
      }

      // set the combined error message text for errorMessage
      this.displayMessage(
        {
          severity: "error",
          summary: errorMessageLength,
          detail: errorMessageColumnCheck,
        },
        4000
      );
    },
    deleteRow(row) {
      const index = this.tableStore.clientTableContent.findIndex(
        (r) => r === row
      );
      if (index !== -1) {
        this.tableStore.clientTableContent.splice(index, 1);
        this.tableStore.addChangelogEntry(
          this.tableStore.displayServerTable,
          row,
          "DELETE"
        );
        this.displayMessage({
          severity: "success",
          summary: "Zeile zum Löschen vorgemerkt",
          detail: `Die Zeile wurde zum Löschen vorgemerkt.`,
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

.buttonWrapper {
  display: flex;
  justify-content: center;
  align-content: center;
  margin-top: 20px;
  padding-bottom: 20px;
}

.mytoolbar {
  display: flex;
  background: #fff;
  outline: none;
  border: none;
  padding-top: 2em;
  /*height: 30px;*/
}

.mybutton {
  height: 40px;
  font-weight: 500;
  font-size: 14px;
  margin: 0;
}

.myuploadbutton {
  height: 40px;
  font-weight: 500;
  font-size: 14px;
  margin-right: 5px;
}

.showLoading {
  margin-top: -23px;
  padding: 3px 20px;
}
</style>
