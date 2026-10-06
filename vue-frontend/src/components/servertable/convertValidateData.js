export function simpleValidateDataType(tableDataTypes, newRow, tableDataRequired) {
  const errors = []
  const typeConversionMap = {
    'numberFloat': (input) => {
      const parsedNum = parseFloat(input);
      if (isNaN(parsedNum)) {
        errors.push(`Conversion error: '${input}' is not a valid number.`)
        return input;
      }
      return parsedNum;
    },
    'numberInt': (input) => {
      let isValid = /^-?\d+$/.test(input);
      const parsedNum = Number(input);
      if (isNaN(parsedNum) || !isValid) {
        errors.push(`Conversion error: '${input}' is not a valid whole number.`)
        return input;
      }
      return parsedNum;
    },
    'string': (input) => {
      return input;
    },
    'date': (input) => {
      const date = new Date(input);
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      const parsedDate = date.toLocaleDateString('en-CA', options)
      let isValid = parsedDate.toString() !== 'Invalid Date';
      if (!isValid) {
        errors.push(`Conversion error: '${input}' is not a valid date.`)
        return input;
      }
      return parsedDate;
    },
    'dateTime': (input) => {
      const parsedDate = new Date(input);
      let isValid = parsedDate.toString() !== 'Invalid Date';
      if (!isValid) {
        errors.push(`Conversion error: '${input}' is not a valid date.`)
        return input;
      }
      return parsedDate;
    }
  }

  const newRowValues = Object.values(newRow);
  const newRowKeys = Object.keys(newRow);

  const convertedRow = newRowValues.map((value, index) => {
    const targetDataType = tableDataTypes[index];

    if (value === null || (value.length === 0 && tableDataRequired[index] === false)) {
      return value;
    } else {
      return typeConversionMap[targetDataType](value)
    }
  })

  // merge the convertedRow with the keys stored before
  const convertedObject = newRowKeys.reduce((obj, key, index) => {
    obj[key] = convertedRow[index];
    return obj;
  }, {})

  return { convertedObject, errors }
}

export function validateDataType(tableDataTypes, newRow) {
  const errors = []
  const typeConversionMap = {
    'FLOAT64': (input) => {
      const parsedNum = parseFloat(input);
      if (isNaN(parsedNum)) {
        errors.push(`Conversion error: '${input}' is not a valid number.`)
        return input;
      }
      return parsedNum;
    },
    'INT64': (input) => {
      let isValid = /^-?\d+$/.test(input);
      const parsedNum = Number(input);
      if (isNaN(parsedNum) || !isValid) {
        errors.push(`Conversion error: '${input}' is not a valid whole number.`)
        return input;
      }
      return parsedNum;
    },
    'STRING': (input) => {
      return input;
    },
    'DATE': (input) => {
      const parsedDate = new Date(input);
      let isValid = parsedDate.toString() !== 'Invalid Date';
      if (!isValid) {
        errors.push(`Conversion error: '${input}' is not a valid date.`)
        return input;
      }
      return parsedDate;
    },
    'DATETIME': (input) => {
      const parsedDate = new Date(input);
      let isValid = parsedDate.toString() !== 'Invalid Date';
      if (!isValid) {
        errors.push(`Conversion error: '${input}' is not a valid date.`)
        return input;
      }
      return parsedDate;
    },
    'TIMESTAMP': (input) => {
      const parsedDate = new Date(input);
      let isValid = parsedDate.toString() !== 'Invalid Date';
      if (!isValid) {
        errors.push(`Conversion error: '${input}' is not a valid date.`)
        return input;
      }
      return parsedDate;
    }
  }

  const newRowValues = Object.values(newRow);
  const newRowKeys = Object.keys(newRow);
  const convertedRow = newRowValues.map((value, index) => {
    const targetDataType = tableDataTypes[index];
    return typeConversionMap[targetDataType](value)
  })

  // merge the convertedRow with the keys stored before
  const convertedObject = newRowKeys.reduce((obj, key, index) => {
    obj[key] = convertedRow[index];
    return obj;
  }, {})

  return { convertedObject, errors }
}

/*
switch(cellDataType) {
  case 'int':
  {
    // commented out because new input is always a string ?
    // let isValid = Number.isInteger(newValue) && newValue >= 0;
    let isValid = /^-?\d+$/.test(newValue);
    let message = isValid ? null : `Incorrect value ${newValue} for field ${field} (expected whole number).`;
    return { isValid: isValid, message: message}
  }
  case 'float':
    {
    // commented out because new input is always a string ?
    // let isValid = typeof newValue === 'number' && !Number.isNaN(newValue) && newValue >= 0;
    // let isValid = /^-?\d+$/.test(newValue);
    let isValid = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(newValue) || /^-?\d+$/.test(newValue) || /^-?\d+(,\d+)?$/.test(newValue);
    let message = isValid ? null : `Incorrect value ${newValue} for field ${field} (expected number).`;
    return { isValid: isValid, message: message}
    }
  case 'string':
    {
    let isValid = typeof newValue === 'string';
    let message = isValid ? null : `Incorrect value ${newValue} for field ${field} (expected text).`;
    return { isValid: isValid, message: message}
    }
  case 'date':
  { 
    const date = new Date(newValue);
    let isValid = date.toString() !== 'Invalid Date';
    let message = isValid ? null : `Incorrect value ${newValue} for field ${field} (expected date).`;
    return { isValid: isValid, message: message}
  }
}
} 
*/
