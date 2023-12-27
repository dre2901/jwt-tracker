document.getElementById('go-to-options').addEventListener('click', async () => {
    await browser.runtime.openOptionsPage();
});

let currentSitePermission = '';

const maskSubdomains = (hostname) => {
    // Split the hostname into its parts by dots
    const parts = hostname.split('.');

    // If there are more than two parts (main host + subdomains), mask the subdomains with one *
    if (parts.length > 2) {
        return `*.${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    }

    // Join the parts back together with dots to form the masked hostname
    return parts.join('.');
}

const setBadgeText = async (tabId, text) => {
    try {
        // Check if it's Manifest v3
        if (browser.action) {
            await browser.action.setBadgeText({ tabId, text });
        } else {
            await browser.browserAction.setBadgeText({ tabId, text });
        }
    } catch (e) {
        console.error(e);
    }
}

const initTopButtons = async () => {
    const { origins } = await browser.permissions.getAll();
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tabs[0].url);

    currentSitePermission = `${url.protocol}//${maskSubdomains(url.host)}/*`;

    const hasPermission = await browser.permissions.contains({
        origins: [currentSitePermission]
    });
    const msgNoPermissions = document.getElementById('nopermissions');
    msgNoPermissions.style.display = hasPermission ? 'none' : 'block';

    const btnPermissionsAll = document.getElementById('request-permissions-all');
    const btnPermissionsCurrent = document.getElementById('request-permissions-current');
    btnPermissionsCurrent.setAttribute('aria-label', `Grant access to '${currentSitePermission}'`);
    if (origins.includes('<all_urls>')) {
        btnPermissionsAll.style.display = 'none';
        btnPermissionsCurrent.style.display = 'none';
    } else if (origins.includes(currentSitePermission)) {
        btnPermissionsAll.style.display = 'block';
        btnPermissionsCurrent.style.display = 'none';
    } else {
        btnPermissionsAll.style.display = 'block';
        btnPermissionsCurrent.style.display = 'block';
    }
};

document.getElementById('request-permissions-current').addEventListener('click', async () => {
    // IMPORTANT: request permissions to be called in onclick handler before any other promise-based requests to avoid 
    // "Error: permissions.request may only be called from a user input handler" in Firefox !!!
    if (await browser.permissions.request({ origins: [currentSitePermission] })) {
        const currentPermissions = await browser.permissions.getAll();

        console.log(JSON.stringify(currentPermissions.origins));
    }
});

document.getElementById('request-permissions-all').addEventListener('click', async () => {
    // IMPORTANT: request permissions to be called in onclick handler before any other promise-based requests to avoid 
    // "Error: permissions.request may only be called from a user input handler" in Firefox !!!
    if (await browser.permissions.request({ origins: ["<all_urls>"] })) {
        const currentPermissions = await browser.permissions.getAll();

        console.log(JSON.stringify(currentPermissions.origins));
    }
});

let options = {};
const setOptions = (o) => {
    options = { ...o };
}

const base64UrlDecode = (base64Url) => {
    // Replace characters that are not allowed in base64 URL encoding
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if the length is not a multiple of 4
    const padding = '=='.substring(0, (4 - (base64.length % 4)) % 4);
    const base64WithPadding = base64 + padding;
    // Decode the base64 string
    return atob(base64WithPadding);
}

const decodeJwt = (jwt) => {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
    }

    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const signature = parts[2];

    return {
        header,
        payload,
        signature
    };
}

const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        console.log('Text copied to clipboard');
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}

const xmlToJson = (xml) => {
    // Check if the input is an element
    if (xml.nodeType === 1) {
        var obj = {};
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
        if (xml.hasChildNodes()) {
            for (var i = 0; i < xml.childNodes.length; i++) {
                var item = xml.childNodes.item(i);
                var nodeName = item.nodeName;
                if (typeof (obj[nodeName]) === "undefined") {
                    obj[nodeName] = xmlToJson(item);
                } else {
                    if (typeof (obj[nodeName].push) === "undefined") {
                        var old = obj[nodeName];
                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(xmlToJson(item));
                }
            }
        }
        return obj;
    } else if (xml.nodeType === 3) { // text
        return xml.nodeValue;
    }
    return null;
}

let currentSearch = null;
const initPopupSelectionJwt = (req) => {
    const jwtEncoded = req.jwt;
    const jwtDecoded = decodeJwt(jwtEncoded);

    const expirationTimeInSeconds = jwtDecoded.payload.exp;
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const remainingTimeInSeconds = expirationTimeInSeconds - currentTimeInSeconds;
    if (remainingTimeInSeconds > 0) {
        const hours = Math.floor(remainingTimeInSeconds / 3600);
        const minutes = Math.floor((remainingTimeInSeconds % 3600) / 60);
        const seconds = remainingTimeInSeconds % 60;

        document.getElementById('expseconds').textContent = `${hours ? hours + 'h ' : ''}${minutes ? minutes + 'm ' : ''}${seconds ? seconds + 's' : ''}`;
        document.getElementById('tokennotexpired').style.display = 'block';
        document.getElementById('tokenexpired').style.display = 'none';
    } else {
        document.getElementById('tokennotexpired').style.display = 'none';
        document.getElementById('tokenexpired').style.display = 'block';
    }

    const jwtPayloadViewer = document.getElementById('jwtPayload');
    const jwtHeaderViewer = document.getElementById('jwtHeader');

    jwtPayloadViewer.data = jwtDecoded.payload;
    jwtPayloadViewer.hints = {
        ...(jwtDecoded.payload.iat && { iat: new Date(jwtDecoded.payload.iat * 1000).toISOString() }),
        ...(jwtDecoded.payload.exp && { exp: new Date(jwtDecoded.payload.exp * 1000).toISOString() }),
        ...(jwtDecoded.payload.nbf && { nbf: new Date(jwtDecoded.payload.nbf * 1000).toISOString() }),
        ...(jwtDecoded.payload.auth_time && { auth_time: new Date(jwtDecoded.payload.auth_time * 1000).toISOString() })
    };

    jwtHeaderViewer.data = jwtDecoded.header;

    jwtPayloadViewer.expandAll();
    jwtHeaderViewer.expandAll();

    const filterPayload = document.getElementById('filterPayload');
    filterPayload.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            if (!filterPayload.value) {
                jwtPayloadViewer.resetFilter();
            } else {
                jwtPayloadViewer.filter(new RegExp(filterPayload.value));
            }
        }
    })

    const searchPayload = document.getElementById('searchPayload');
    searchPayload.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            if (currentSearch) {
                const res = currentSearch.next();
                if (res.done) {
                    alert('Done!');
                }
            } else {
                currentSearch = jwtPayloadViewer.search(searchPayload.value);
                const res = currentSearch.next();
                if (res.done) {
                    alert('Nothing found!');
                }
            }
        } else {
            currentSearch = null;
        }
    })

    document.getElementById('btnExpandAll').addEventListener('click', (event) => {
        event.preventDefault();
        jwtPayloadViewer.expandAll();
    });

    document.getElementById('btnCollapseAll').addEventListener('click', (event) => {
        event.preventDefault();
        jwtPayloadViewer.collapseAll();
    });

    document.getElementById('btnCopyDecoded').addEventListener('click', (event) => {
        event.preventDefault();
        copyToClipboard(JSON.stringify(jwtDecoded, null, 2));
    });

    document.getElementById('btnCopyEncoded').addEventListener('click', (event) => {
        event.preventDefault();
        copyToClipboard(jwtEncoded);
    });
};

let currentSamlSearch = null;
const initPopupSelectionSaml = (req) => {
    const samlEncoded = req.saml;
    const samlDecoded = atob(samlEncoded);

    const samlXml = (new DOMParser()).parseFromString(samlDecoded, 'text/xml');
    const samlJson = xmlToJson(samlXml.documentElement);

    const samlPayloadViewer = document.getElementById('samlPayload');

    samlPayloadViewer.data = samlJson;

    samlPayloadViewer.expandAll();

    const filterPayload = document.getElementById('filterSamlPayload');
    filterPayload.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            if (!filterPayload.value) {
                samlPayloadViewer.resetFilter();
            } else {
                samlPayloadViewer.filter(new RegExp(filterPayload.value));
            }
        }
    })

    const searchPayload = document.getElementById('searchSamlPayload');
    searchPayload.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            if (currentSamlSearch) {
                const res = currentSamlSearch.next();
                if (res.done) {
                    alert('Done!');
                }
            } else {
                currentSamlSearch = samlPayloadViewer.search(searchPayload.value);
                const res = currentSamlSearch.next();
                if (res.done) {
                    alert('Nothing found!');
                }
            }
        } else {
            currentSamlSearch = null;
        }
    })

    document.getElementById('btnSamlExpandAll').addEventListener('click', (event) => {
        event.preventDefault();
        samlPayloadViewer.expandAll();
    });

    document.getElementById('btnSamlCollapseAll').addEventListener('click', (event) => {
        event.preventDefault();
        samlPayloadViewer.collapseAll();
    });

    document.getElementById('btnCopySaml').addEventListener('click', (event) => {
        event.preventDefault();
        copyToClipboard(samlDecoded);
    });
}

const initPopupSelection = (req) => {
    if (!req.jwt && !req.saml) {
        console.error('Request does not contain authorization information', req);
        return;
    }

    if (req.jwt) {
        document.getElementById('jwtcontent').style.display = 'block';
        document.getElementById('samlcontent').style.display = 'none';
        initPopupSelectionJwt(req);
    } else if (req.saml) {
        document.getElementById('jwtcontent').style.display = 'none';
        document.getElementById('samlcontent').style.display = 'block';
        initPopupSelectionSaml(req);
    }
}

const initPopup = (auth) => {
    if (auth.length === 0) {
        document.getElementById('notokens').style.display = 'block';
        document.getElementById('tokensmain').style.display = 'none';
        return;
    }

    document.getElementById('notokens').style.display = 'none';
    document.getElementById('tokensmain').style.display = 'block';

    const selectElement = document.getElementById('availableTokens');

    auth.reverse().forEach((r, index) => {
        const option = document.createElement('option');
        option.value = index;
        const date = new Date(r.timeStamp);
        const reqType = r.jwt ? 'JWT' : r.isSamlRequest ? 'SAML Request' : 'SAML Response';
        option.text = `${reqType} | ${r.method} | ${r.initiator} | ${date.toISOString()}`;
        selectElement.appendChild(option);
    });

    selectElement.addEventListener('change', () => {
        initPopupSelection(auth[selectElement.value]);
    });
    initPopupSelection(auth[0]);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Load the max history entries and reqDb from local storage
    try {
        await initTopButtons();

        const { reqDb } = await browser.storage.local.get('reqDb');
        const { maxHistoryEntries } = await browser.storage.local.get('maxHistoryEntries');

        setOptions({ reqDb, maxHistoryEntries });

        // Get current tab and init popup with it's data
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const currentTabId = tabs[0].id;

        if (reqDb && reqDb[currentTabId] && reqDb[currentTabId].auth) {
            initPopup(reqDb[currentTabId].auth);
        } else {
            initPopup([]);
        }
    } catch (error) {
        console.error(error);
    }
});

document.getElementById('clear-storage').addEventListener('click', async () => {
    try {
        const { reqDb } = await browser.storage.local.get('reqDb');
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const currentTabId = tabs[0].id;

        const newReqDb = reqDb ?? {};
        delete newReqDb[currentTabId];
        await browser.storage.local.set({ reqDb: newReqDb });

        await setBadgeText(currentTabId, '');

        initPopup([]);
    } catch (error) {
        console.error(error);
    }
});


