export function getTemplate() {
    return `
        <style> @import url(${new URL('./lazy-table.css', import.meta.url)}); </style>
        
        <div class="flex-column">
            <label for="file-selector">Upload CSV</label>
            <input id="file-selector" type="file" accept="${this.ACCEPTED_FILE_TYPE}">
        </div>
            
        <progress class="hidden w-full" value="0" max="100"></progress>
        
        <table>
            <thead></thead>
            <tbody></tbody>
        </table>
    `;
}