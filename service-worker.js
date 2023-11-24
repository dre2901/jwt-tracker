let _maxHistoryEntries = 10;

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        if (details.requestHeaders) {
            const authHeader = details.requestHeaders.find(h =>
                (h.name.toLowerCase() === 'authorization') && h.value.toLowerCase().startsWith('bearer'));
            if (authHeader) {
                // console.log(`authorization header found for initiator ${details.initiator} on tab ${details.tabId} has been detected: ${authHeader.value}`);
                chrome.storage.local.get(['reqDb'], ({ reqDb }) => {
                    const newReqDb = reqDb ? reqDb : {};
                    if (!newReqDb[details.tabId]) {
                        newReqDb[details.tabId] = { authJwt: [] };
                    }
                    // Delete requests in Db with the same initiator
                    newReqDb[details.tabId].authJwt = newReqDb[details.tabId].authJwt.filter(a => a.initiator !== details.initiator);
                    // Delete requests from Db is we have more than allowed in options
                    if (newReqDb[details.tabId].authJwt.length > _maxHistoryEntries) {
                        newReqDb[details.tabId].authJwt.splice(0, newReqDb[details.tabId].authJwt.length - _maxHistoryEntries - 1);
                    }

                    // Add new request to the end of array and set new reqDb
                    newReqDb[details.tabId].authJwt.push(details);
                    chrome.storage.local.set(
                        { reqDb: newReqDb },
                        () => {
                            //
                        }
                    );

                    const reqNum = newReqDb[details.tabId].authJwt.length;
                    chrome.action.setBadgeText({
                        tabId: details.tabId,
                        text: `${reqNum > 0 ? reqNum : ''}`
                    });
                });
            }
        }
    },
    { urls: ['*://*:*/*'] },
    ['requestHeaders']
);

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


