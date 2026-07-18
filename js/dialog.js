(() => {
    "use strict";

    let activeResolve = null;
    let bypassNativeConfirmOnce = false;
    const nativeConfirm = window.confirm.bind(window);

    const overlay = document.createElement("div");
    overlay.id = "tpwmDialogOverlay";
    overlay.className = "tpwm-dialog-overlay hidden";
    overlay.innerHTML = `
        <section class="tpwm-dialog-card" data-kind="info" role="dialog" aria-modal="true" aria-labelledby="tpwmDialogTitle">
            <header class="tpwm-dialog-head">
                <div class="tpwm-dialog-icon" id="tpwmDialogIcon">T</div>
                <div>
                    <p class="tpwm-dialog-eyebrow" id="tpwmDialogEyebrow">TPWM</p>
                    <h2 class="tpwm-dialog-title" id="tpwmDialogTitle">Message</h2>
                </div>
            </header>
            <div class="tpwm-dialog-body" id="tpwmDialogMessage"></div>
            <footer class="tpwm-dialog-actions">
                <button class="tpwm-dialog-button" id="tpwmDialogCancel" type="button">Cancel</button>
                <button class="tpwm-dialog-button primary" id="tpwmDialogOk" type="button">OK</button>
            </footer>
        </section>`;
    document.addEventListener("DOMContentLoaded", () => document.body.appendChild(overlay), { once: true });

    function nodes() {
        return {
            card: overlay.querySelector(".tpwm-dialog-card"),
            icon: overlay.querySelector("#tpwmDialogIcon"),
            eyebrow: overlay.querySelector("#tpwmDialogEyebrow"),
            title: overlay.querySelector("#tpwmDialogTitle"),
            message: overlay.querySelector("#tpwmDialogMessage"),
            cancel: overlay.querySelector("#tpwmDialogCancel"),
            ok: overlay.querySelector("#tpwmDialogOk")
        };
    }

    function close(result) {
        overlay.classList.add("hidden");
        document.body.classList.remove("modal-open");
        const resolve = activeResolve;
        activeResolve = null;
        resolve?.(result);
    }

    function open(options = {}) {
        if (activeResolve) close(false);
        const n = nodes();
        const kind = options.kind || "info";
        const isConfirm = Boolean(options.confirm);
        n.card.dataset.kind = kind;
        n.eyebrow.textContent = options.eyebrow || "TPWM SECURITY";
        n.title.textContent = options.title || "TPWM";
        n.message.textContent = options.message || "";
        n.icon.textContent = options.icon || (kind === "success" ? "✓" : kind === "warning" ? "!" : kind === "error" ? "×" : "T");
        n.ok.textContent = options.okText || "OK";
        n.cancel.textContent = options.cancelText || "Cancel";
        n.cancel.hidden = !isConfirm;
        overlay.classList.remove("hidden");
        document.body.classList.add("modal-open");
        window.setTimeout(() => n.ok.focus(), 0);
        return new Promise((resolve) => { activeResolve = resolve; });
    }

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close(false);
    });
    overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") close(false);
    });
    overlay.addEventListener("click", (event) => {
        if (event.target.id === "tpwmDialogOk") close(true);
        if (event.target.id === "tpwmDialogCancel") close(false);
    });

    window.TPWMDialog = {
        show: open,
        confirm(options) { return open({ ...options, confirm: true }); },
        success(options) { return open({ ...options, kind: "success", confirm: false }); },
        error(options) { return open({ ...options, kind: "error", confirm: false }); },
        info(options) { return open({ ...options, kind: "info", confirm: false }); }
    };

    // The existing importer expects a synchronous window.confirm().
    // Intercept only the Import Vault action, show the themed asynchronous
    // confirmation, then replay the click while allowing the old check once.
    window.confirm = (message) => {
        if (bypassNativeConfirmOnce) {
            bypassNativeConfirmOnce = false;
            return true;
        }
        return nativeConfirm(message);
    };

    document.addEventListener("click", async (event) => {
        const button = event.target.closest("button");
        if (!button || !/import\s+vault/i.test(button.textContent || "")) return;

        const modalTitle = document.getElementById("modalTitle")?.textContent || "";
        if (!/import\s+tpwm\s+vault/i.test(modalTitle)) return;

        const replaceMode = document.querySelector('input[name="importMode"]:checked')?.value || "replace";
        if (replaceMode !== "replace" || button.dataset.tpwmConfirmed === "1") {
            button.dataset.tpwmConfirmed = "0";
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        const approved = await window.TPWMDialog.confirm({
            kind: "warning",
            eyebrow: "ENCRYPTED VAULT TRANSFER",
            title: "Replace Local Vault?",
            message: "Replace the complete local vault with the imported vault?\n\nExport a backup first if you may need the current vault later.",
            okText: "Replace Vault",
            cancelText: "Cancel"
        });
        if (!approved) return;

        bypassNativeConfirmOnce = true;
        button.dataset.tpwmConfirmed = "1";
        button.click();
    }, true);
})();
