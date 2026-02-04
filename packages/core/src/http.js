/**
 * Ghost HTTP Pillar
 * Specialized fetch wrapper for Ghost.js with JSON/XML support.
 */

/**
 * Simple XML to JSON-like object converter
 * (Minimalistic for under 5KB target)
 */
export function xml2json(xmlString) {
    if (typeof window === 'undefined') return {};

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    function parseNode(node) {
        const obj = {};
        if (node.nodeType === 1) { // element
            if (node.attributes.length > 0) {
                obj["@attributes"] = {};
                for (let j = 0; j < node.attributes.length; j++) {
                    const attribute = node.attributes.item(j);
                    obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                }
            }
        } else if (node.nodeType === 3) { // text
            return node.nodeValue.trim();
        }

        if (node.hasChildNodes()) {
            for (let i = 0; i < node.childNodes.length; i++) {
                const item = node.childNodes.item(i);
                const nodeName = item.nodeName;
                if (typeof obj[nodeName] === "undefined") {
                    const parsed = parseNode(item);
                    if (parsed !== "") obj[nodeName] = parsed;
                } else {
                    if (typeof obj[nodeName].push === "undefined") {
                        const old = obj[nodeName];
                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(parseNode(item));
                }
            }
        }
        return obj;
    }

    return parseNode(doc.documentElement);
}

/**
 * Advanced Fetch Wrapper
 */
export async function ghostFetch(url, options = {}) {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
        throw new Error(`Ghost-HTTP Error: ${response.status} ${response.statusText}`);
    }

    if (contentType && contentType.includes('application/xml') || contentType && contentType.includes('text/xml')) {
        const text = await response.text();
        return xml2json(text);
    }

    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }

    return await response.text();
}
