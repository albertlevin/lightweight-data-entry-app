import { defineStore } from "pinia";
import {
  getServerTableContent,
  getServerTableMetaData,
  getServerTablesListWithSubSystems,
  getGrantedSecurityIds,
  getChangeLogMainData,
  getChangeLogDetailsData,
} from "@/components/servertable/serverTable";

export const useTableStore = defineStore("table", {
  state: () => ({
    currentUser: "demo.user@example.com",
    events: null,
    isLoading: true, // keeping track of whether the server tables are still being downloaded
    userDataUpdated: true, // keeping track of whether the user data has been updated to reflect the latest changes
    excelTables: [],
    changelogInsertedRows: new Map(), // stores new rows added to each table
    changelogDeletedRows: new Map(), // stores rows deleted from each table
    changelogUpdatedRows: new Map(), // stores rows changed in each table
    grantedSecurityIds: [], // stores the allowed KDFs for the user
    serverTableContentIsLoaded: false,
    columnsMetaData: new Map(), // stores the metadata for each column in each table
    clientTableContent: new Map(), // stores the table data for each table
    serverTableContent: new Map(), // stores the table data for each table
    serverTablesList: null, // Stores the tables of a chosen subSystem
    subSystems: [], // stores the sub systems
    displayServerTable: null, // store the last table displayed to the user
    displayPreviousServerTable: null, // store the last table displayed to the user
    displaySubSystem: null, // store the last subSystem displayed to the user
    displayPreviousSubSystem: null, // store the last subSystem displayed to the user
    wasSubmitted: false,
    logDetailContentIsLoaded: false,
    changeLogMain: [], // stores the main log of user actions
    displayChangeLogId: null, // stores the main log of user actions
    changeLogDetails: new Map(), // stores the details log of user actions
  }),

  getters: {
    serverTablePrimaryKeys() {
      return this.columnsMetaData
        .filter((col) => col.primaryKey === true && col.fieldName !== "")
        .map((col) => col.fieldName);
    },
    insertedRows() {
      const insertedRows =
        this.changelogInsertedRows.get(this.displayServerTable) || [];
      return this.aggregateRows(insertedRows);
    },
    deletedRows() {
      const deletedRows =
        this.changelogDeletedRows.get(this.displayServerTable) || [];
      return this.aggregateRows(deletedRows);
    },
    updatedRows() {
      const updatedRows =
        this.changelogUpdatedRows.get(this.displayServerTable) || [];
      return this.aggregateRows(updatedRows);
    },
  },

  actions: {
    setSubSystems(subSystemsMap) {
      this.subSystems = subSystemsMap;
      this.isLoading = false;
    },

    setPreviousSubSystem() {
      this.displayPreviousSubSystem = JSON.stringify(this.displaySubSystem);
    },

    setPreviousServerTable() {
      this.displayPreviousServerTable = JSON.stringify(this.displayServerTable);
    },

    setServerTablesList(serverTablesList) {
      this.serverTablesList = serverTablesList;
    },

    setColumnsMetaData(columnsMetaData) {
      this.columnsMetaData = columnsMetaData;
    },

    setServerTableContent(serverTableContent) {
      this.serverTableContent = serverTableContent;
    },

    setClientTableContent(clientTableContent) {
      this.clientTableContent = JSON.parse(JSON.stringify(clientTableContent));
    },

    setGrantedSecurityIds(grantedSecurityIds) {
      this.grantedSecurityIds = grantedSecurityIds;
    },

    async getGrantedSecurityIds() {
      let grantedSecurityIds = await getGrantedSecurityIds();
      this.setGrantedSecurityIds(grantedSecurityIds);
    },

    async getListOfSubSystemTables() {
      this.isLoading = true;
      let serverTablesList = await getServerTablesListWithSubSystems(
        this.displaySubSystem
      ).then((response) => {
        this.isLoading = false;
        return response;
      });
      this.setServerTablesList(serverTablesList);
      this.setPreviousSubSystem();
    },

    async getServerTables() {
      this.isLoading = true;
      let serverTablesMetaData = await getServerTableMetaData(
        this.displaySubSystem,
        this.displayServerTable
      );
      let serverTablesContent = await getServerTableContent(
        this.displaySubSystem,
        this.displayServerTable
      ).then((response) => {
        this.isLoading = false;
        return response;
      });
      this.setColumnsMetaData(serverTablesMetaData);
      this.setServerTableContent(serverTablesContent);
      this.setClientTableContent(serverTablesContent);
      this.serverTableContentIsLoaded = true;
      this.setPreviousServerTable();
    },

    // adds a single entry (a Object) to the changelog for the table (an array).
    // initializes the array if necessary.
    async addChangelogEntry(tableName, changeObj, changeType) {
      try {
        // set the flag to 'false' to remember an untracked change
        this.userDataUpdated = false;
        this.wasSubmitted = false;

        if (changeType === "INSERT") {
          if (!this.changelogInsertedRows.has(tableName)) {
            this.changelogInsertedRows.set(tableName, [changeObj]);
          } else {
            this.changelogInsertedRows.get(tableName).push(changeObj);
          }
        } else if (changeType === "UPDATE") {
          if (!this.changelogUpdatedRows.has(tableName)) {
            this.changelogUpdatedRows.set(tableName, [changeObj]);
          } else {
            this.changelogUpdatedRows.get(tableName).push(changeObj);
          }
        } else if (changeType === "DELETE") {
          if (!this.changelogDeletedRows.has(tableName)) {
            this.changelogDeletedRows.set(tableName, [changeObj]);
          } else {
            this.changelogDeletedRows.get(tableName).push(changeObj);
          }
        }
      } catch (error) {
        console.log(error);
      }
    },

    // discard user changes to local copy and overwrite it with server data
    // we accomplish this by clearing the change log and calling aggregateChanges() function
    async resetTable(afterSubmit = true) {
      try {
        // set the flag to 'false' to remember an untracked change
        this.userDataUpdated = false;

        // returns True if tableName was present in the changelog Map
        if (
          JSON.stringify(this.clientTableContent) !==
          JSON.stringify(this.serverTableContent)
        ) {
          this.changelogInsertedRows = new Map();
          this.changelogDeletedRows = new Map();
          this.changelogUpdatedRows = new Map();
          if (!afterSubmit) {
            this.clientTableContent = JSON.parse(
              JSON.stringify(this.serverTableContent)
            );
            this.wasSubmitted = false;
          } else {
            this.wasSubmitted = true;
          }
        } else {
          // update the flag manually
          this.userDataUpdated = true;
        }
      } catch (error) {
        console.log(error);
      }
    },

    /* aggregates row entries for a given table.
     * the aggregated lastChangesMap contains a single entry per primary keys (row keys).
     * that is, if there were multiple changes to the same row, the Map
     * would contain the last entry in the changelog.
     * since each entry in the change log includes changes from before that entry, the last changelog entry
     * always contains the most up-to-date data.
     */
    aggregateRows(rows) {
      return rows.reduce((acc, obj) => {
        const primaryKeyValues = this.serverTablePrimaryKeys.map(
          (key) => obj[key]
        );
        const existingIndex = acc.findIndex((item) =>
          this.serverTablePrimaryKeys.every(
            (key, index) => item[key] === primaryKeyValues[index]
          )
        );

        if (existingIndex !== -1) {
          acc[existingIndex] = obj;
        } else {
          acc.push(obj);
        }

        return acc;
      }, []);
    },

    /* log functions */

    setChangeLogMain(changeLogMain) {
      this.changeLogMain = changeLogMain;
    },

    async getChangeLogMain() {
      this.isLoading = true;
      let changeLogMain = await getChangeLogMainData().then((response) => {
        this.isLoading = false;
        return response;
      });
      this.setChangeLogMain(changeLogMain);
    },

    setChangeLogDetails(changeLogDetails) {
      this.changeLogDetails = changeLogDetails;
    },

    async getChangeLogDetails() {
      this.isLoading = true;
      let changeLogDetails = await getChangeLogDetailsData(
        this.displayChangeLogId
      ).then((response) => {
        this.isLoading = false;
        return response;
      });
      this.setChangeLogDetails(changeLogDetails);
      this.logDetailContentIsLoaded = true;
    },
  },
});
