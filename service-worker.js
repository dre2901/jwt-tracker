let _maxHistoryEntries = 10;

try {
    // Load only in Chrome
    if (typeof importScripts === 'function') {
        importScripts('browser-polyfill.js');
    }
} catch (e) {
    console.error(e);
}

browser.webRequest.onBeforeSendHeaders.addListener(
    async (details) => {
        if (details.requestHeaders) {
            try {
                const authHeader = details.requestHeaders.find(h =>
                    (h.name.toLowerCase() === 'authorization') && h.value.toLowerCase().startsWith('bearer'));

                // console.log(`authorization header found for initiator ${details.initiator} on tab ${details.tabId} has been detected: ${authHeader.value}`);
                const { reqDb } = await browser.storage.local.get('reqDb');
                const newReqDb = reqDb ? reqDb : {};
                if (!newReqDb[details.tabId] || !newReqDb[details.tabId].auth) {
                    newReqDb[details.tabId] = { auth: [] };
                }
                if (authHeader) {
                    if (!details.initiator) {
                        details.initiator = details.originUrl ?? details.documentUrl
                    }
                    // Delete requests in Db with the same initiator
                    newReqDb[details.tabId].auth = newReqDb[details.tabId].auth.filter(a => a.initiator !== details.initiator);
                    // Delete requests from Db is we have more than allowed in options
                    if (newReqDb[details.tabId].auth.length > (_maxHistoryEntries - 1)) {
                        newReqDb[details.tabId].auth.splice(0, newReqDb[details.tabId].auth.length - (_maxHistoryEntries - 1));
                    }

                    // Add new request to the end of array and set new reqDb
                    newReqDb[details.tabId].auth.push({
                        ...details,
                        jwt: authHeader.value.substring(7)
                    });
                    await browser.storage.local.set({ reqDb: newReqDb });
                }

                const reqNum = newReqDb[details.tabId].auth.length;
                if (details.tabId > 0) {
                    await browser.action.setBadgeText({
                        tabId: details.tabId,
                        text: `${reqNum > 0 ? reqNum : ''}`
                    });
                }
            } catch (error) {
                console.error(error);
            }
        }
    },
    { urls: ['<all_urls>'] },
    ['requestHeaders']
);

browser.webRequest.onBeforeRequest.addListener(
    async (details) => {
        if (details.requestBody && details.requestBody.formData && details.method === 'POST') {
            try {
                const saml = details.requestBody.formData.SAMLRequest || details.requestBody.formData.SAMLResponse;
                const { reqDb } = await browser.storage.local.get('reqDb');
                const newReqDb = reqDb ? reqDb : {};
                if (!newReqDb[details.tabId]) {
                    newReqDb[details.tabId] = { auth: [] };
                }
                if (saml) {
                    // Delete requests from Db is we have more than allowed in options
                    if (newReqDb[details.tabId].auth.length > (_maxHistoryEntries - 1)) {
                        newReqDb[details.tabId].auth.splice(0, newReqDb[details.tabId].auth.length - (_maxHistoryEntries - 1));
                    }

                    // Add new request to the end of array and set new reqDb
                    newReqDb[details.tabId].auth.push({
                        ...details,
                        saml,
                        isSamlRequest: !!details.requestBody.formData.SAMLRequest
                    });
                    await browser.storage.local.set({ reqDb: newReqDb });
                }

                const reqNum = newReqDb[details.tabId].auth.length;
                if (details.tabId > 0) {
                    await browser.action.setBadgeText({
                        tabId: details.tabId,
                        text: `${reqNum > 0 ? reqNum : ''}`
                    });
                }
            } catch (error) {
                console.error(error);
            }
        }
    },
    { urls: ['<all_urls>'] },
    ['requestBody']
);

browser.tabs.onRemoved.addListener(async (tabId) => {
    // Perform clean up of storage on tab closed
    console.log(`Clean up of storage for closed tab ${tabId}`);
    const { reqDb } = await browser.storage.local.get('reqDb');
    const newReqDb = reqDb ? reqDb : {};
    delete newReqDb[tabId];
    await browser.storage.local.set({ reqDb: newReqDb });
});

browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason !== "install" && details.reason !== "update") return;
    const { maxHistoryEntries } = await browser.storage.local.get('maxHistoryEntries');
    _maxHistoryEntries = maxHistoryEntries;
});


browser.storage.onChanged.addListener(async (changes) => {
    const { maxHistoryEntries } = await browser.storage.local.get('maxHistoryEntries');
    _maxHistoryEntries = maxHistoryEntries;
});


