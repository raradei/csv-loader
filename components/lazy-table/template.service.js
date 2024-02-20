export default {
    getTemplate() {
        return `
            <style> @import url(${new URL('./lazy-table.css', import.meta.url)}); </style>
        
            <div class="flex-column">
                <label for="file-selector">Upload CSV</label>
                <input id="file-selector" type="file" accept="${this.ACCEPTED_FILE_TYPE}">
            </div>
                
            <progress class="hidden w-full" value="0" max="100"></progress>
            
            <div class="sticky-table-container">
                <table>
                    <thead></thead>
                    <tbody></tbody>
                </table>
                
<!--                <button class="scroll-top">^</button>-->
            </div>
        `;
    },

    generateTableHeaderNodes(values, inputListenerCallback) {
        return values.map((header, i) => {
            const node = document.createElement('th');
            const label = document.createElement('label');
            const input = document.createElement('input');

            label.innerText = header.label;
            label.classList.add('d-block', 'text-nowrap');
            input.type = 'text';
            input.classList.add('w-full', 'border-box');
            input.setAttribute('data-key', header.key);
            input.addEventListener('input', () => inputListenerCallback(input))

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