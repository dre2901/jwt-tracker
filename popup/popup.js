document.getElementById('go-to-options').addEventListener('click', function () {
    chrome.runtime.openOptionsPage();
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

let currentSearch = null;
const initPopupSelection = (req) => {
    const authHeader = req.requestHeaders.find(h =>
        (h.name.toLowerCase() === 'authorization') && h.value.toLowerCase().startsWith('bearer'));

    if (!authHeader) {
        console.error('Request does not contain authorization header', req);
        return;
    }

    const jwtEncoded = authHeader.value.substring(7);
    const jwtDecoded = decodeJwt(jwtEncoded);

    const expirationTimeInSeconds = jwtDecoded.payload.exp;
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const remainingTimeInSeconds = expirationTimeInSeconds - currentTimeInSeconds;
    if (remainingTimeInSeconds > 0) {
        document.getElementById('expseconds').textContent = `${remainingTimeInSeconds}s`;
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

}

const initPopup = (authJwt) => {
    if (authJwt.length === 0) {
        document.getElementById('notokens').style.display = 'block';
        document.getElementById('tokensmain').style.display = 'none';
        return;
    }

    document.getElementById('notokens').style.display = 'none';
    document.getElementById('tokensmain').style.display = 'block';

    const selectElement = document.getElementById('availableTokens');

    authJwt.reverse().forEach((r, index) => {
        const option = document.createElement('option');
        option.value = index;
        const date = new Date(r.timeStamp);
        option.text = `${r.method} | ${r.initiator} | ${date.toISOString()}`;
        selectElement.appendChild(option);
    });

    selectElement.addEventListener('change', () => {
        initPopupSelection(authJwt[selectElement.value]);
    });
    initPopupSelection(authJwt[0]);
}

document.addEventListener('DOMContentLoaded', () => {
    // Load the max history entries and reqDb from Chrome storage
    chrome.storage.local.get(['maxHistoryEntries', 'reqDb'], (result) => {
        setOptions(result);

        // Get current tab and init popup with it's data
        chrome.tabs.query({ active: true }, (tabs) => {
            const currentTabId = tabs[0].id;

            if (result.reqDb && result.reqDb[currentTabId] && result.reqDb[currentTabId].authJwt) {
                initPopup(result.reqDb[currentTabId].authJwt);
            } else {
                initPopup([]);
            }

        });
    });
});


