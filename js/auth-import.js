(() => {
    "use strict";

    const authScreen = document.getElementById("authScreen");
    const mainScreen = document.getElementById("mainScreen");
    const loginTab = document.getElementById("loginTab");
    const signupTab = document.getElementById("signupTab");
    const importTab = document.getElementById("importTab");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const importForm = document.getElementById("importForm");
    const modalOverlay = document.getElementById("modalOverlay");
    const modalCloseButton = document.getElementById("modalCloseButton");
    const vaultFileInput = document.getElementById("vaultFileInput");

    if (!loginTab || !signupTab || !importTab || !loginForm || !signupForm || !importForm) {
        return;
    }

    function showTab(selectedTab, selectedForm) {
        [loginTab, signupTab, importTab].forEach((tab) => {
            const selected = tab === selectedTab;
            tab.classList.toggle("active", selected);
            tab.setAttribute("aria-selected", String(selected));
        });

        [loginForm, signupForm, importForm].forEach((form) => {
            form.classList.toggle("hidden", form !== selectedForm);
        });
    }

    loginTab.addEventListener("click", () => showTab(loginTab, loginForm), true);
    signupTab.addEventListener("click", () => showTab(signupTab, signupForm), true);
    importTab.addEventListener("click", () => showTab(importTab, importForm));

    vaultFileInput?.addEventListener("change", () => {
        if (vaultFileInput.files?.length) {
            sessionStorage.setItem("tpwmImportPending", "1");
        } else {
            sessionStorage.removeItem("tpwmImportPending");
        }
    });

    let finishingImport = false;

    function elementIsVisible(element) {
        if (!element) return false;
        return !element.classList.contains("hidden") &&
            window.getComputedStyle(element).display !== "none" &&
            window.getComputedStyle(element).visibility !== "hidden";
    }

    function importDialogIsOpen() {
        const modalTitle = document.getElementById("modalTitle");
        return elementIsVisible(modalOverlay) &&
            /import\s+tpwm\s+vault/i.test(modalTitle?.textContent || "");
    }

    function vaultIsOpenBehindDialog() {
        return elementIsVisible(mainScreen) ||
            Boolean(authScreen && authScreen.classList.contains("hidden"));
    }

    function importerHasFinished() {
        if (!importDialogIsOpen() || !vaultIsOpenBehindDialog()) {
            return false;
        }

        // The original importer changes its action button to this busy label.
        // In the affected build, the vault finishes loading but that label is
        // never restored and the dialog is never dismissed.
        const footerText = document.getElementById("modalFooter")?.textContent || "";
        return /decrypting\s+and\s+replacing/i.test(footerText);
    }

    function finishSuccessfulImport() {
        if (finishingImport || !importerHasFinished()) {
            return;
        }

        finishingImport = true;
        sessionStorage.removeItem("tpwmImportPending");

        // Allow the finished vault render to settle, then perform the same
        // close action as clicking the X manually.
        window.setTimeout(() => {
            if (importDialogIsOpen()) {
                modalCloseButton?.click();

                // Fallback for any build whose close listener rejects a
                // synthetic click. This only runs after successful loading.
                window.setTimeout(() => {
                    if (importDialogIsOpen()) {
                        modalOverlay.classList.add("hidden");
                        document.body.classList.remove("modal-open");
                    }
                }, 100);
            }

            window.setTimeout(() => {
                window.TPWMDialog.success({
                    eyebrow: "ENCRYPTED VAULT TRANSFER",
                    title: "Import Successful",
                    message:
                        "Your TPWM vault has been imported and you are now logged in.\n\n" +
                        "The original export file remains on your computer. " +
                        "Delete it if it is no longer needed, or keep it as a backup.",
                    okText: "Continue"
                });
                finishingImport = false;
            }, 150);
        }, 350);
    }

    // Watch the dialog and both screens. The affected importer fully renders
    // the main vault behind the modal without completing its own final cleanup.
    const observer = new MutationObserver(finishSuccessfulImport);
    [authScreen, mainScreen, modalOverlay, document.getElementById("modalFooter")]
        .filter(Boolean)
        .forEach((element) => observer.observe(element, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ["class", "disabled"]
        }));

    window.setInterval(finishSuccessfulImport, 150);

})();
