# Ghost HTTP 🌐
> **Cross-Format API Client for the Modern Web.**

## Overview
Ghost-HTTP is a lightweight wrapper around the Fetch API, optimized for Ghost's reactivity system. It features automatic content detection for JSON and XML.

## API

### `ghostFetch(url, options)`
Fetches data and automatically parses it based on the `Content-Type` header.

```javascript
import { ghostFetch, asyncSignal } from '@ghost-js/core';

// Automatically handles JSON
const userSignal = asyncSignal(() => ghostFetch('/api/user/1'));

// Automatically handles XML
const legacySignal = asyncSignal(() => ghostFetch('/api/legacy-data.xml'));
```

### `xml2json(xmlString)`
Manually convert an XML string into a Ghost-reactive object.

```javascript
import { xml2json } from '@ghost-js/core';

const xml = '<ghost><name>Casper</name></ghost>';
const data = xml2json(xml);
console.log(data.ghost.name); // "Casper"
```

## Why XML?
Ghost.js is designed to be "Independent." This includes independence from modern backend constraints. Sometimes you need to talk to legacy SOAP or XML-based enterprise APIs—Ghost makes that seamless.
