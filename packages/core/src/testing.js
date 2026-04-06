// Ghost Testing Utilities — 2026-04-06
// Helpers for unit-testing Ghost nodes in isolation (Node.js or browser).
import { mount, destroy } from './render-graph.js';

let _container = null;

/**
 * Mount a Ghost node into a temporary detached div.
 * Returns the container element for querying.
 * Always call cleanup() after each test.
 *
 * @param {GhostNode} node
 * @returns {HTMLElement} container
 */
export function mountTest(node) {
    if (typeof document === 'undefined') {
        throw new Error('[Ghost Testing] mountTest() requires a DOM environment (jsdom or browser).');
    }
    cleanup();
    _container = document.createElement('div');
    _container.setAttribute('data-ghost-test', 'true');
    document.body.appendChild(_container);
    mount(node, _container);
    return _container;
}

/**
 * Query the current test container with a CSS selector.
 * @param {string} selector
 * @returns {Element | null}
 */
export function find(selector) {
    if (!_container) throw new Error('[Ghost Testing] No active mountTest() — call mountTest() first.');
    return _container.querySelector(selector);
}

/**
 * Query all matching elements in the current test container.
 * @param {string} selector
 * @returns {NodeListOf<Element>}
 */
export function findAll(selector) {
    if (!_container) throw new Error('[Ghost Testing] No active mountTest() — call mountTest() first.');
    return _container.querySelectorAll(selector);
}

/**
 * Programmatically fire a DOM event on an element.
 *
 * @param {Element} el
 * @param {string} eventName  — e.g. 'click', 'input', 'submit'
 * @param {any} [detail]      — CustomEvent detail payload
 */
export function trigger(el, eventName, detail = undefined) {
    if (!el) throw new Error(`[Ghost Testing] trigger() called with null element for event "${eventName}"`);
    const event = detail !== undefined
        ? new CustomEvent(eventName, { bubbles: true, cancelable: true, detail })
        : new Event(eventName, { bubbles: true, cancelable: true });
    el.dispatchEvent(event);
}

/**
 * Get the trimmed text content of an element.
 * @param {Element} el
 * @returns {string}
 */
export function text(el) {
    return el?.textContent?.trim() ?? '';
}

/**
 * Remove the test container and reset state. Call after each test.
 */
export function cleanup() {
    if (_container) {
        if (_container.parentNode) _container.parentNode.removeChild(_container);
        _container = null;
    }
}
