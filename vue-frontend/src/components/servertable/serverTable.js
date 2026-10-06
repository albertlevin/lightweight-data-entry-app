// import { Buffer } from 'buffer';
import { SERVER_URL } from "@/components/global_vars";
import { getCurrentUser } from "@/components/authentication/authentication";
import { MODE_ENV, SHOW_COMMENTS } from "@/components/global_vars";

const currentUser = getCurrentUser();

export async function getServerTableMetaData(subSystem, tableName) {
  try {
    const response = await fetch(
      `${SERVER_URL}/api/table-metadata-full/${subSystem}/${tableName}/`,
      {
        headers: {
          Authorization: currentUser,
        },
      }
    );
    if (MODE_ENV === "development" && SHOW_COMMENTS)
      console.log("Response:", response);
    if (!response.ok) {
      throw new Error("Network response was not ok.");
    } else {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
  }
}

export async function getGrantedSecurityIds() {
  try {
    const response = await fetch(`${SERVER_URL}/api/list-granted-kdf`, {
      headers: {
        Authorization: currentUser,
      },
    });
    if (MODE_ENV === "development" && SHOW_COMMENTS)
      console.log("Response:", response);
    if (!response.ok) {
      throw new Error("Network response was not ok.");
    } else {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
  }
}

// get the list of tables in the selected database.
export async function getServerTablesListWithSubSystems(subSystem) {
  try {
    const response = await fetch(
      `${SERVER_URL}/api/list-subsystem-tables/${subSystem}`,
      {
        headers: {
          Authorization: currentUser,
        },
      }
    );
    if (MODE_ENV === "development" && SHOW_COMMENTS)
      console.log("Response:", response);
    if (!response.ok) {
      throw new Error("Network response was not ok.");
    } else {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
  }
}

export async function getSubSystemList() {
  try {
    const response = await fetch(`${SERVER_URL}/api/list-subsystems`, {
      headers: {
        Authorization: currentUser,
      },
    });
    if (MODE_ENV === "development" && SHOW_COMMENTS)
      console.log("Response:", response);
    if (!response.ok) {
      throw new Error("Network response was not ok.");
    } else {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
  }
}

export async function getChangeLogMainData() {
  try {
    const response = await fetch(`${SERVER_URL}/api/list-log-main`, {
      headers: {
        Authorization: currentUser,
      },
    });
    if (MODE_ENV === "development" && SHOW_COMMENTS)
      console.log("Response:", response);
    if (!response.ok) {
      throw new Error("Network response was not ok.");
    } else {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
  }
}

export async function getChangeLogDetailsData(logId) {
  try {
    const response = await fetch(
      `${SERVER_URL}/api/list-log-details/${logId}`,
      {
        headers: {
          Authorization: currentUser,
        },
      }
    );
    if (MODE_ENV === "development" && SHOW_COMMENTS)
      console.log("Response:", response);
    if (!response.ok) {
      throw new Error("Network response was not ok.");
    } else {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
  }
}

// fetch table data
// returns a JSON array, with 1 object per row
export async function getServerTableContent(subSystem, tableName) {
  try {
    const response = await fetch(
      `${SERVER_URL}/api/table-content/${subSystem}/${tableName}/`,
      {
        headers: {
          Authorization: currentUser,
        },
      }
    );
    if (MODE_ENV === "development" && SHOW_COMMENTS)
      console.log("Response:", response);
    if (response.ok) {
      const tableData = await response.json();

      // const jsonSize = Buffer.from(JSON.stringify(tableData)).length;
      // console.log(`Server table data ${tableName}: fetched ${jsonSize} bytes.`)

      return tableData;
    } else {
      console.error("Failed to fetch table data:", response.statusText);
    }
  } catch (error) {
    console.error("Error fetching table data:", error);
  }
}

export async function submitUserData(
  subsystem,
  tableName,
  insertedRows,
  updatedRows,
  deletedRows
) {
  try {
    const response = await fetch(
      `${SERVER_URL}/api/${subsystem}/${tableName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: currentUser,
        },
        body: JSON.stringify({
          subsystem: subsystem,
          insertedRows: insertedRows,
          updatedRows: updatedRows,
          deletedRows: deletedRows,
        }),
      }
    );

    const responseData = await response.json();
    if (MODE_ENV === "development" && SHOW_COMMENTS)
      console.log("Response:", responseData);

    if (response.ok) {
      return {
        ok: true,
        message: responseData.message || "Daten erfolgreich hochgeladen.",
      };
    } else {
      return {
        ok: false,
        message: responseData.message || "Fehler beim Hochladen der Daten.",
      };
    }
  } catch (error) {
    console.error("Error posting table data:", error);
    return error;
  }
}
