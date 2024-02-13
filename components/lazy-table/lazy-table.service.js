export const lazyTableService = {
    generateTableHeaderNodes(values, inputListenerCallback) {
        return values.map((header, i) => {
            const node = document.createElement('th');
            const label = document.createElement('label');
            const input = document.createElement('input');

            label.innerText = header.label;
            input.type = 'text';
            input.setAttribute('data-key', header.key);
            input.addEventListener('input', () => {
                inputListenerCallback(input);
            })

            node.append(label, input);

            return node;
        });
    },

    generateTableRowNodes(values) {
        return values.map((rowValue) => {
            const row = document.createElement('tr');

            for (const cellValue in rowValue) {
                const node = document.createElement('td');
                node.innerText = rowValue[cellValue];
                row.append(node);
            }

            return row;
        });
    }
}