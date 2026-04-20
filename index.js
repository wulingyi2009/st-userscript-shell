const hostWin = getHostWindow();
const existingShell = hostWin.STUserScriptShell || window.STUserScriptShell;

let shellApi = existingShell;

if (!shellApi) {
    shellApi = createShell(hostWin);
    hostWin.STUserScriptShell = shellApi;
    window.STUserScriptShell = shellApi;
}

export default shellApi;
export { shellApi as STUserScriptShell };

function getHostWindow() {
    try {
        if (window.parent && window.parent !== window) {
            return window.parent;
        }
    } catch {}
    return window;
}

function createShell(hostWin) {
    const doc = hostWin.document;

    const VERSION = '0.1.0';

    const IDS = {
        style: 'stus-shell-style',
        menuItem: 'stus-shell-menu-item',
        backdrop: 'stus-shell-backdrop',
        panel: 'stus-shell-panel',
        title: 'stus-shell-title',
        icon: 'stus-shell-icon',
        body: 'stus-shell-body',
        close: 'stus-shell-close',
    };

    const state = {
        title: '通用插件壳',
        iconHtml: '🧩',
        observer: null,
        onOpen: new Set(),
        onClose: new Set(),
        renderCleanup: null,
    };

    const ready = init();

    const api = {
        version: VERSION,
        ready,

        getHostWindow,
        getHostDocument,
        getContext,

        openPanel,
        closePanel,
        togglePanel,
        isPanelOpen,

        getMountBody,
        setTitle,
        setIcon,

        mount,
        unmount,

        onOpen(fn) {
            if (typeof fn !== 'function') return () => {};
            state.onOpen.add(fn);
            return () => state.onOpen.delete(fn);
        },

        onClose(fn) {
            if (typeof fn !== 'function') return () => {};
            state.onClose.add(fn);
            return () => state.onClose.delete(fn);
        },

        async destroy() {
            await unmount({ showPlaceholder: false });

            state.onOpen.clear();
            state.onClose.clear();

            try {
                state.observer?.disconnect?.();
            } catch {}

            const menuItem = getHostDocument().getElementById(IDS.menuItem);
            const panel = getHostDocument().getElementById(IDS.panel);
            const backdrop = getHostDocument().getElementById(IDS.backdrop);
            const style = getHostDocument().getElementById(IDS.style);

            menuItem?.remove();
            panel?.remove();
            backdrop?.remove();
            style?.remove();

            try {
                delete hostWin.STUserScriptShell;
            } catch {}

            try {
                delete window.STUserScriptShell;
            } catch {}
        },
    };

    return api;

    async function init() {
        await waitForBody();
        ensureStyle();
        ensurePanel();
        ensureMenuItem();
        installObserver();
    }

    function getHostDocument() {
        return hostWin.document;
    }

    function getContext() {
        try {
            return window.SillyTavern?.getContext?.()
                || hostWin.SillyTavern?.getContext?.()
                || null;
        } catch {
            return null;
        }
    }

    async function waitForBody() {
        if (doc.body) return;
        await new Promise((resolve) => {
            const timer = setInterval(() => {
                if (doc.body) {
                    clearInterval(timer);
                    resolve();
                }
            }, 50);
        });
    }

    function ensureStyle() {
        if (doc.getElementById(IDS.style)) return;

        const style = doc.createElement('style');
        style.id = IDS.style;
        style.textContent = `
#${IDS.backdrop}[hidden],
#${IDS.panel}[hidden] {
    display: none !important;
}

#${IDS.backdrop} {
    position: fixed;
    inset: 0;
    z-index: 3998;
    background: rgba(2, 6, 23, 0.42);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
}

#${IDS.panel} {
    position: fixed;
    top: 72px;
    right: 16px;
    width: min(560px, calc(100vw - 24px));
    height: min(78vh, 820px);
    z-index: 3999;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,.10);
    background: var(--SmartThemeBlurTintColor, rgba(15, 23, 42, 0.96));
    color: var(--SmartThemeBodyColor, #e5e7eb);
    box-shadow:
        0 20px 60px rgba(0,0,0,.42),
        0 2px 10px rgba(0,0,0,.20);
}

#${IDS.panel} * {
    box-sizing: border-box;
}

#${IDS.panel} .stus-shell-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 54px;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.03);
}

#${IDS.panel} .stus-shell-title-wrap {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

#${IDS.icon} {
    width: 30px;
    min-width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(255,255,255,.08);
    font-size: 16px;
    line-height: 1;
}

#${IDS.title} {
    min-width: 0;
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

#${IDS.close} {
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 10px;
    background: rgba(255,255,255,.05);
    color: inherit;
    min-width: 38px;
    height: 38px;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
}

#${IDS.close}:hover {
    background: rgba(255,255,255,.10);
}

#${IDS.body} {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

#${IDS.body} .stus-empty {
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 14px;
    background: rgba(255,255,255,.04);
    padding: 16px;
    display: grid;
    gap: 8px;
    line-height: 1.7;
    font-size: 13px;
}

#${IDS.body} .stus-empty strong {
    font-size: 15px;
}

#${IDS.body} .stus-note {
    color: #9fb0c7;
    font-size: 12px;
}

#${IDS.menuItem} {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

#${IDS.menuItem} .extensionsMenuExtensionButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

@media (max-width: 900px) {
    #${IDS.panel} {
        top: 8px;
        right: 8px;
        left: 8px;
        width: auto;
        height: calc(100dvh - 16px);
        max-height: calc(100dvh - 16px);
        border-radius: 14px;
    }

    #${IDS.body} {
        padding: 12px;
    }
}
        `;
        doc.head.appendChild(style);
    }

    function ensurePanel() {
let backdrop = doc.getElementById(IDS.backdrop);
if (!backdrop) {
backdrop = doc.createElement('div');
backdrop.id = IDS.backdrop;
backdrop.hidden = true;
doc.body.appendChild(backdrop);
}

let panel = doc.getElementById(IDS.panel);
if (!panel) {
panel = doc.createElement('section');
panel.id = IDS.panel;
panel.hidden = true;
panel.setAttribute('aria-hidden', 'true');
panel.innerHTML = `
<div class="stus-shell-header">
    <div class="stus-shell-title-wrap">
        <div id="${IDS.icon}">${state.iconHtml}</div>
        <div id="${IDS.title}">${escapeHtml(state.title)}</div>
    </div>
    <button id="${IDS.close}" type="button" title="关闭">×</button>
</div>
<div id="${IDS.body}"></div>
`;
doc.body.appendChild(panel);
}

const titleEl = panel.querySelector(`#${IDS.title}`);
const iconEl = panel.querySelector(`#${IDS.icon}`);
const closeBtn = panel.querySelector(`#${IDS.close}`);
const bodyEl = panel.querySelector(`#${IDS.body}`);
if (titleEl) titleEl.textContent = state.title;
if (iconEl) iconEl.innerHTML = state.iconHtml;
if (backdrop.dataset.stusBound !== '1') {
backdrop.dataset.stusBound = '1';
backdrop.addEventListener('click', () => {
closePanel();
});
}
if (closeBtn && closeBtn.dataset.stusBound !== '1') {
closeBtn.dataset.stusBound = '1';
closeBtn.addEventListener('click', () => {
closePanel();
});
}
if (bodyEl && !bodyEl.childNodes.length) {
renderPlaceholder(bodyEl);
}
}
function ensureMenuItem() {
const menuRoot = doc.getElementById('extensionsMenu');
if (!menuRoot) return null;
let item = doc.getElementById(IDS.menuItem);
if (!item) {
item = doc.createElement('div');
item.id = IDS.menuItem;
item.className = 'list-group-item flex-container flexGap5';
menuRoot.appendChild(item);
}
item.title = state.title;
item.innerHTML = `

${state.iconHtml}

${escapeHtml(state.title)}
`;
if (item.dataset.stusBound !== '1') {
item.dataset.stusBound = '1';
item.addEventListener('click', (event) => {
event.preventDefault();
event.stopPropagation();
setTimeout(() => {
openPanel();
}, 0);
});
}
return item;
}
function installObserver() {
if (state.observer || !doc.body) return;
state.observer = new MutationObserver(() => {
ensurePanel();
ensureMenuItem();
});
state.observer.observe(doc.body, {
childList: true,
subtree: true,
});
}
function renderPlaceholder(body = null) {
const targetBody = body || doc.getElementById(IDS.body);
if (!targetBody) return;
targetBody.innerHTML = `

**壳已就绪**

这里是一个可复用的 SillyTavern userscript 空壳。

下一步请在你的业务脚本里调用 \`window.STUserScriptShell.mount(renderFn)\`，把真正的插件 UI 挂进来。

`;
}
function getMountBody() {
let body = doc.getElementById(IDS.body);
if (body) return body;
ensurePanel();
return doc.getElementById(IDS.body);
}
function isPanelOpen() {
        const panel = doc.getElementById(IDS.panel);
        const backdrop = doc.getElementById(IDS.backdrop);
        if (!panel || !backdrop) return false;
        return !panel.hidden && !backdrop.hidden;
    }

    async function openPanel() {
        await ready;
        ensurePanel();

        const panel = doc.getElementById(IDS.panel);
        const backdrop = doc.getElementById(IDS.backdrop);
        if (!panel || !backdrop) return false;

        panel.hidden = false;
        backdrop.hidden = false;
        panel.setAttribute('aria-hidden', 'false');

        closeExtensionsUi();
        setTimeout(closeExtensionsUi, 120);

        emit(state.onOpen);
        return true;
    }

    function closePanel() {
        const panel = doc.getElementById(IDS.panel);
        const backdrop = doc.getElementById(IDS.backdrop);
        if (!panel || !backdrop) return false;

        panel.hidden = true;
        backdrop.hidden = true;
        panel.setAttribute('aria-hidden', 'true');

        emit(state.onClose);
        return true;
    }

    async function togglePanel() {
        await ready;
        return isPanelOpen() ? closePanel() : openPanel();
    }

    function setTitle(text) {
        state.title = String(text || '').trim() || '通用插件壳';
        ensurePanel();
        ensureMenuItem();
    }

    function setIcon(html) {
        state.iconHtml = String(html || '').trim() || '🧩';
        ensurePanel();
        ensureMenuItem();
    }

    async function mount(renderFn) {
        await ready;

        if (typeof renderFn !== 'function') {
            renderPlaceholder();
            return null;
        }

        await unmount({ showPlaceholder: false });

        const body = getMountBody();
        if (!body) return null;

        body.innerHTML = '';

        try {
            const cleanup = await renderFn(body, api);
            state.renderCleanup = typeof cleanup === 'function' ? cleanup : null;

            if (!body.childNodes.length) {
                renderPlaceholder();
            }

            return state.renderCleanup;
        } catch (error) {
            console.error('[STUserScriptShell] mount failed:', error);
            body.innerHTML = `
                <div class="stus-empty">
                    <strong>业务挂载失败</strong>
                    <div class="stus-note">${escapeHtml(error?.message || String(error))}</div>
                </div>
            `;
            throw error;
        }
    }

    async function unmount(options = {}) {
        const { showPlaceholder = true } = options;

        try {
            if (typeof state.renderCleanup === 'function') {
                await state.renderCleanup();
            }
        } catch (error) {
            console.warn('[STUserScriptShell] unmount cleanup failed:', error);
        } finally {
            state.renderCleanup = null;
        }

        const body = getMountBody();
        if (body) {
            body.innerHTML = '';
            if (showPlaceholder) {
                renderPlaceholder();
            }
        }
    }

    function closeExtensionsUi() {
        tryClickVisible(
            doc.querySelector(
                '#extensionsMenu'
            )?.closest?.(
                '.drawer-content, .popup, .menu_button_popup, .draggable, [role="menu"]'
            )?.querySelector?.(
                '.close-button, .drawer-close, .menu_button_close, [data-action="close"], [aria-label="Close"], [title="Close"]'
            )
        );

        tryClickVisible(
            doc.querySelector(
                '.drawer-overlay, .popup-overlay, .modal-backdrop, .backdrop, .ui-widget-overlay'
            )
        );

        clickFirstVisibleBySelectors([
            '#extensionsMenuButton',
            '[aria-controls="extensionsMenu"]',
            '[data-target="extensionsMenu"]',
            '[data-menu="extensionsMenu"]',
            '.extensionsMenuButton',
            'button[title*="Extension"]',
            'button[aria-label*="Extension"]',
            '.menu_button[title*="Extension"]',
            '.menu_button[aria-label*="Extension"]',
        ]);

        dispatchEscape(doc);
        dispatchEscape(hostWin);
    }

    function clickFirstVisibleBySelectors(selectors) {
        for (const selector of selectors) {
            const node = doc.querySelector(selector);
            if (tryClickVisible(node)) return true;
        }
        return false;
    }

    function tryClickVisible(node) {
        if (!node || !isActuallyVisible(node)) return false;
        try {
            node.click();
            return true;
        } catch {
            return false;
        }
    }

    function isActuallyVisible(node) {
        if (!node) return false;
        try {
            const style = hostWin.getComputedStyle(node);
            return !node.hidden
                && style.display !== 'none'
                && style.visibility !== 'hidden'
                && style.pointerEvents !== 'none';
        } catch {
            return false;
        }
    }

    function dispatchEscape(target) {
        if (!target) return;
        const evtInit = {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true,
        };

        try {
            target.dispatchEvent(new KeyboardEvent('keydown', evtInit));
        } catch {}

        try {
            target.dispatchEvent(new KeyboardEvent('keyup', evtInit));
        } catch {}
    }

    function emit(set) {
        for (const fn of set) {
            try {
                fn(api);
            } catch (error) {
                console.warn('[STUserScriptShell] callback failed:', error);
            }
        }
    }

    function escapeHtml(text) {
        const div = doc.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    }
}