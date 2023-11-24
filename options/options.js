// Saves options to chrome.storage
const saveOptions = () => {
    const maxHistoryEntriesInput = document.getElementById('max-history-entries');
    const maxHistoryEntries = parseInt(maxHistoryEntriesInput.value, 10);

    chrome.storage.local.set(
        { maxHistoryEntries },
        () => {
            // Update status to let user know options were saved.
            const status = document.getElementById('status');
            status.textContent = 'Options saved.';
            setTimeout(() => {
                status.textContent = '';
            }, 750);
        }
    );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
    chrome.storage.local.get(
        { maxHistoryEntries: 10 },
        (items) => {
            document.getElementById('max-history-entries').value = items.maxHistoryEntries;
        }
    );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);