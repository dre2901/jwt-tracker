const DEFAULT_PERMISSION = 'http://example.com/*';

const initOptions = async () => {
    const { maxHistoryEntries } = await browser.storage.local.get('maxHistoryEntries');
    document.getElementById('max-history-entries').value = maxHistoryEntries ?? 10;

    const { origins } = await browser.permissions.getAll();
    console.log('Current permissions:', origins);

    const permListContainer = document.getElementById('permission-list-container');
    const createPermissionElement = (perm) => {
        const permDiv = document.createElement('div');
        const permInput = document.createElement('input');
        const permDevBtn = document.createElement('div');
        permDiv.className = 'permission-container';
        permInput.className = 'permission-input';
        permDevBtn.className = 'permission-del';
        permDiv.appendChild(permInput);
        permDiv.appendChild(permDevBtn);

        permDevBtn.addEventListener('click', () => permListContainer.removeChild(permDiv));

        permInput.value = perm;

        return permDiv;
    }

    origins.forEach((perm, index) => {
        if (perm !== DEFAULT_PERMISSION) {
            permListContainer.appendChild(createPermissionElement(perm));
        }
    });

    const btnAddNewSite = document.getElementById('add-new-permission');
    btnAddNewSite.addEventListener('click', () => permListContainer.appendChild(createPermissionElement('')));
};

const saveOptions = async () => {
    const status = document.getElementById('status');
    try {
        // read edited permissions
        const editedOrigins = [];
        const allPermissionInputs = document.getElementsByClassName('permission-input');
        for (let index = 0; index < allPermissionInputs.length; index++) {
            const el = allPermissionInputs[index];
            el.value
            if (el.value.trim().length > 0) {
                editedOrigins.push(el.value);
            }
        }

        // IMPORTANT: request permissions to be called in onclick handler before any other promise-based requests to avoid 
        // "Error: permissions.request may only be called from a user input handler" in Firefox !!!
        await browser.permissions.request({ origins: editedOrigins });
        // ... and now we can proceed with others...

        const { origins } = await browser.permissions.getAll();
        // remove deleted permissions
        const deletedOrigins = origins.filter(org => !editedOrigins.includes(org) && org !== DEFAULT_PERMISSION);
        if (deletedOrigins && deletedOrigins.length > 0) {
            console.log('Removing permissions for sites: ', deletedOrigins);
            await browser.permissions.remove({ origins: deletedOrigins });
        }

        // update history entries options
        const maxHistoryEntriesInput = document.getElementById('max-history-entries');
        const maxHistoryEntries = parseInt(maxHistoryEntriesInput.value, 10);

        await browser.storage.local.set({ maxHistoryEntries });

        status.className = '';
        status.textContent = 'Options saved successfully!';
        setTimeout(() => {
            status.textContent = '';
        }, 1000);
    } catch (error) {
        console.error(error);
        status.className = 'error-message';
        status.textContent = error;
    }
};

document.addEventListener('DOMContentLoaded', initOptions);
document.getElementById('save').addEventListener('click', saveOptions);