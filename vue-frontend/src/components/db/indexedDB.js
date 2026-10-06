let db;

const openDB = async () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

  const request = indexedDB.open('My database', 1);
  request.onupgradeneeded = (event) => {
    db = event.target.result;
    db.createObjectStore('tables', { keyPath: 'id', autoIncrement: true });
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    resolve(db);
  }

  request.onerror = (event) => {
    reject('IndexedDB error: ' + event.target.errorCode);
  };
  });  
};

const addTable = async (table) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['tables'], 'readwrite');
    const store = transaction.objectStore('tables');
    const request = store.add(table);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject('Error adding table');
    }
  })
};

const getAllTables = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['tables'], 'readonly');
    const store = transaction.objectStore('tables');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject('Error fetching tables');
    };
  });
};

export { addTable, getAllTables };
