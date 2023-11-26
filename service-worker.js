let _maxHistoryEntries = 10;

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        if (details.requestHeaders) {
            const authHeader = details.requestHeaders.find(h =>
                (h.name.toLowerCase() === 'authorization') && h.value.toLowerCase().startsWith('bearer'));

            // console.log(`authorization header found for initiator ${details.initiator} on tab ${details.tabId} has been detected: ${authHeader.value}`);
            chrome.storage.local.get(['reqDb'], ({ reqDb }) => {
                const newReqDb = reqDb ? reqDb : {};
                if (!newReqDb[details.tabId] || !newReqDb[details.tabId].auth) {
                    newReqDb[details.tabId] = { auth: [] };
                }
                if (authHeader) {
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
                    chrome.storage.local.set(
                        { reqDb: newReqDb },
                        () => {
                            //
                        }
                    );
                }

                const reqNum = newReqDb[details.tabId].auth.length;
                if (details.tabId > 0) {
                    chrome.action.setBadgeText({
                        tabId: details.tabId,
                        text: `${reqNum > 0 ? reqNum : ''}`
                    }).catch(e => {
                        console.log(e);
                    });
                }
            });
        }
    },
    { urls: ['*://*:*/*'] },
    ['requestHeaders']
);

chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.requestBody && details.requestBody.formData && details.method === 'POST') {

            const saml = details.requestBody.formData.SAMLRequest || details.requestBody.formData.SAMLResponse;
            chrome.storage.local.get(['reqDb'], ({ reqDb }) => {
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
                    chrome.storage.local.set(
                        { reqDb: newReqDb },
                        () => {
                            //
                        }
                    );
                }

                const reqNum = newReqDb[details.tabId].auth.length;
                if (details.tabId > 0) {
                    chrome.action.setBadgeText({
                        tabId: details.tabId,
                        text: `${reqNum > 0 ? reqNum : ''}`
                    }).catch(e => {
                        console.log(e);
                    });
                }
            });
        }
    },
    { urls: ['*://*:*/*'] },
    ['requestBody']
);



chrome.tabs.onRemoved.addListener((tabId) => {
    // Perform clean up of storage on tab closed
    console.log(`Clean up of storage for closed tab ${tabId}`);
    chrome.storage.local.get(['reqDb'], ({ reqDb }) => {
        const newReqDb = reqDb ? reqDb : {};
        delete newReqDb[tabId];
        chrome.storage.local.set(
            { reqDb: newReqDb },
            () => {
                //
            }
        );
    });
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason !== "install" && details.reason !== "update") return;
    chrome.storage.local.get(['maxHistoryEntries'], ({ maxHistoryEntries }) => {
        _maxHistoryEntries = maxHistoryEntries;
    });
});


chrome.storage.onChanged.addListener((changes) => {
    chrome.storage.local.get(['maxHistoryEntries'], ({ maxHistoryEntries }) => {
        _maxHistoryEntries = maxHistoryEntries;
    });
});


