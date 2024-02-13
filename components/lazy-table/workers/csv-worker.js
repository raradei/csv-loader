onmessage = ({ data }) => {
    if (data.type === 'loadFile') loadFile(data.file, data.pageSize);
    if (data.type === 'loadPageValues') loadPage(data.pageIndex);
    if (data.type === 'search') search(data.key, data.value);
}

const loadFile = (file, pageSize) => {
    const reader = new FileReader();
    self.pageSize = pageSize

    reader.onprogress = ({ loaded, total }) => postMessage({
        type: 'progress',
        value: Math.round(loaded / total * 100)
    });

    reader.onload = ({ target: { result } }) => {
        const [rawHeaders, ...rawValues] = result.trimEnd().split('\r\n');
        const headers = rawHeaders.split(',').map(toPascalCase);

        self.lastPageIndex = Math.round(rawValues.length / pageSize - 1);
        self.fileValues = rawValues.slice(0, pageSize).map(csvRowToObject(headers));

        postMessage({ type: 'fileLoaded', value: { headers, values: self.fileValues } });

        if (self.lastPageIndex) {
            self.fileValues = self.fileValues.concat(rawValues.slice(pageSize).map(csvRowToObject(headers)));
        }

        self.currentValuesRef = self.fileValues;
    };

    reader.readAsText(file);
}

const loadPage = (pageIndex) => {
    if (pageIndex <= self.lastPageIndex) {
        const startIndex = pageIndex * self.pageSize;
        const endIndex = startIndex + self.pageSize;

        postMessage({
            type: 'pageValuesLoaded',
            value: {
                pageValues: self.currentValuesRef.slice(startIndex, endIndex),
                lastPage: pageIndex === self.lastPageIndex
            },
        });
    }
}

const search = (key, value) => {
    self.currentValuesRef = self.fileValues.filter(obj => obj[key].includes(value));
    self.lastPageIndex = Math.round(self.currentValuesRef.length / self.pageSize - 1);

    postMessage({
        type: 'searchResults',
        value: self.currentValuesRef.slice(0, self.pageSize)
    });
}

const toPascalCase = (str) => {
    let pascalCaseProp = '';
    let isWordStart = false;
    for (const char of str) {
        if (char === ' ') {
            isWordStart = true;
            continue;
        }

        if (isWordStart) {
            pascalCaseProp += char.toUpperCase();
            isWordStart = false
        } else pascalCaseProp += char.toLowerCase();
    }

    return {
        key: pascalCaseProp,
        label: str
    };
}

const csvRowToObject = (headers) => (csvRow) => {
    return csvRow.split(',').reduce((acc, val, rIdx) => {
        // TODO: Handle string that contains "
        let key = headers[rIdx] ? headers[rIdx].key : headers[headers.length - 1].key;
        acc[key] = val;
        return acc;
    }, {})
}
